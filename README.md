CREATE PROCEDURE [dbo].[QMS_SP_Files_SyncApproval_Search]     
(
    @SerchText          VARCHAR(50)  = NULL,
    @Approval_Status    INT          = NULL,
    @Approved_By        INT          = NULL,
    @SORTBY             VARCHAR(100) = NULL,
    @SORTDIRECTION      TINYINT      = NULL,
    @PAGENUMBER         INT          = NULL,
    @PAGESIZE           INT          = NULL,
    @DownloadRequired   INT,
    @SizeRange          LIB_PID      READONLY,
    @ISFETCHCOUNT       INT          OUTPUT
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Step 1: Determine the maximum file size limit
    DECLARE @MaxLimit INT;
    SELECT @MaxLimit = ISNULL(Size_KB, 450) * 1024
    FROM INF_LIB_Upload_File_Size_Limit
    WHERE Attach_Prefix = 'QMS_' AND Syncable = 1;

    -- Step 2: Default sorting direction
    DECLARE @SORTORDER VARCHAR(10) = CASE WHEN ISNULL(@SORTDIRECTION, 0) = 0 THEN 'ASC' ELSE 'DESC' END;
    SET @SORTBY = ISNULL(@SORTBY, 'ID');

    -- Step 3: Pagination variables
    DECLARE @StartRow INT, @EndRow INT;
    SET @StartRow = (ISNULL(@PAGENUMBER, 1) - 1) * ISNULL(@PAGESIZE, 1) + 1;
    SET @EndRow = ISNULL(@PAGENUMBER, 1) * ISNULL(@PAGESIZE, 1);

    -- Step 4: Main query logic based on approval status
    IF @Approval_Status = 0
    BEGIN
        -- Query for unapproved files
        SELECT 
            ID, LogFileID, LOGManual1, FilePath, LOGManual2, Version, NodeType, LogDate, 
            SendToOffice, DwdReq, Size, SyncID, ROWNUM
        INTO #TempUnapproved
        FROM (
            SELECT 
                ID, LogFileID, LOGManual1, FilePath, LOGManual2, Version, NodeType, LogDate, 
                SendToOffice, DwdReq, Size, SyncID,
                ROW_NUMBER() OVER (ORDER BY 
                    CASE WHEN @SORTBY = 'ID' THEN ID END,
                    CASE WHEN @SORTBY = 'LogFileID' THEN LogFileID END,
                    CASE WHEN @SORTBY = 'LogDate' THEN LogDate END
                    + ' ' + @SORTORDER
                ) AS ROWNUM
            FROM (
                SELECT DISTINCT
                    Q.ID, Q.LogFileID, Q.LOGManual1, Q.FilePath, Q.LOGManual2, Q.Version, 
                    Q.NodeType, Q.Date_Of_Creatation AS LogDate, Q.SendToOffice,
                    CASE WHEN Q.Size <= @MaxLimit THEN 0 ELSE 1 END AS DwdReq,
                    CAST(ISNULL(Q.Size, 0) AS DEC(12, 2)) / 1024 AS Size,
                    CASE WHEN HS.SyncID IS NOT NULL AND HS.FileVersion = Q.Version THEN HS.SyncID ELSE NULL END AS SyncID
                FROM QMSdtlsFile_Log Q
                LEFT JOIN QMS_Sync_History HS ON HS.FileID = Q.ID
                LEFT JOIN QMS_DTL_Vessel_Assignment QA ON QA.Document_ID = Q.ID AND QA.Vessel_ID = HS.VesselID AND QA.FileVersion = HS.FileVersion AND QA.Active_Status = 1
                LEFT JOIN qms_file_vessel_sync_ledger ldgr ON ldgr.vessel_assignment_id = QA.ID AND ldgr.[status] IN ('p', 's', 'r')
                WHERE Q.NodeType = 0 AND Q.Active_Status = 1 AND Q.FilePath IS NOT NULL
                AND ldgr.vessel_assignment_id IS NULL
                AND Q.ID NOT IN (
                    SELECT S.QMSID
                    FROM QMS_FILE_APPROVAL S
                    INNER JOIN (
                        SELECT MAX(LevelID) AS LevelID, QMSID
                        FROM QMS_FILE_APPROVAL
                        WHERE Active_Status = 1
                        GROUP BY QMSID
                        HAVING MAX(LevelID) IS NOT NULL
                    ) A ON S.QMSID = A.QMSID AND S.LevelID = A.LevelID
                    INNER JOIN (
                        SELECT ApprovalStatus, Version, QMSID, LevelID, approve_By
                        FROM QMS_FILE_APPROVAL
                        WHERE Active_Status = 1 AND QMSID = Q.ID
                    ) B ON B.QMSID = S.QMSID AND B.LevelID = A.LevelID
                    INNER JOIN lib_user U ON U.userID = B.approve_By
                    WHERE U.Active_Status = 1 AND (B.ApprovalStatus = 0 OR B.Version IS NULL) AND S.Active_Status = 1 AND S.Parent_ID IS NOT NULL
                )
                AND (Q.Version >= ISNULL((SELECT MAX(t1.FileVersion) FROM QMS_Sync_History t1 WHERE t1.FileID = Q.ID GROUP BY t1.FileID), 0))
            ) AS FINAL_TABLE
        ) AS FINAL_RESULT
        WHERE ROWNUM BETWEEN @StartRow AND @EndRow;

        -- Fetch count if required
        IF ISNULL(@ISFETCHCOUNT, 0) = 1
        BEGIN
            SELECT @ISFETCHCOUNT = COUNT(*)
            FROM #TempUnapproved;
        END

        -- Output the result
        SELECT * FROM #TempUnapproved;
        DROP TABLE #TempUnapproved;
    END
    ELSE IF @Approval_Status = 1
    BEGIN
        -- Query for approved files
        SELECT 
            ID, LogFileID, LOGManual1, FilePath, LOGManual2, Version, NodeType, LogDate, 
            SendToOffice, DwdReq, Size, SyncID, ROWNUM
        INTO #TempApproved
        FROM (
            SELECT 
                ID, LogFileID, LOGManual1, FilePath, LOGManual2, Version, NodeType, LogDate, 
                SendToOffice, DwdReq, Size, SyncID,
                ROW_NUMBER() OVER (ORDER BY 
                    CASE WHEN @SORTBY = 'ID' THEN ID END,
                    CASE WHEN @SORTBY = 'LogFileID' THEN LogFileID END,
                    CASE WHEN @SORTBY = 'LogDate' THEN LogDate END
                    + ' ' + @SORTORDER
                ) AS ROWNUM
            FROM (
                SELECT DISTINCT
                    Q.ID, Q.LogFileID, Q.LOGManual1, 
                    CASE WHEN FV.FilePath IS NULL THEN Q.FilePath ELSE FV.FilePath END AS FilePath,
                    Q.LOGManual2, 
                    CASE WHEN SL.FileVersion IS NULL THEN Q.Version ELSE SL.FileVersion END AS Version,
                    Q.NodeType, 
                    CASE WHEN FV.Date_Of_Creatation IS NULL THEN Q.Date_Of_Creatation ELSE FV.Date_Of_Creatation END AS LogDate,
                    CASE WHEN Q.SendToOffice = 'N' THEN SL.Sync_Status ELSE 'Y' END AS SendToOffice,
                    CASE WHEN Q.Size <= @MaxLimit THEN 0 ELSE 1 END AS DwdReq,
                    CAST(ISNULL(Q.Size, 0) AS DEC(12, 2)) / 1024 AS Size,
                    SL.SyncID
                FROM QMSdtlsFile_Log Q
                LEFT JOIN QMS_Sync_log SL ON SL.FileID = Q.ID
                LEFT JOIN QMS_FileVersionInfo FV ON FV.FileID = SL.FileID AND FV.Version = SL.FileVersion AND FV.Active_Status = 1
                WHERE Q.Active_Status = 1
            ) AS FINAL_TABLE
            WHERE SendToOffice = 'Y'
        ) AS FINAL_RESULT
        WHERE ROWNUM BETWEEN @StartRow AND @EndRow;

        -- Fetch count if required
        IF ISNULL(@ISFETCHCOUNT, 0) = 1
        BEGIN
            SELECT @ISFETCHCOUNT = COUNT(*)
            FROM #TempApproved;
        END

        -- Output the result
        SELECT * FROM #TempApproved;
        DROP TABLE #TempApproved;
    END
END;