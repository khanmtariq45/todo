WITH LatestVersion AS (
    SELECT QMSID, MAX(Version) AS LatestVersion
    FROM QMS_FILE_APPROVAL WITH (NOLOCK)
    WHERE Active_Status = 1
    GROUP BY QMSID
),
MaxLevel AS (
    SELECT QMSID, MAX(LevelID) AS MaxLevelID, Version
    FROM QMS_FILE_APPROVAL WITH (NOLOCK)
    WHERE Active_Status = 1
    GROUP BY QMSID, Version
),
ApprovedMaxLevel AS (
    SELECT fa.QMSID, fa.LevelID, fa.Version
    FROM QMS_FILE_APPROVAL fa WITH (NOLOCK)
    INNER JOIN MaxLevel ml ON fa.QMSID = ml.QMSID
        AND fa.Version = ml.Version
        AND fa.LevelID = ml.MaxLevelID
    WHERE fa.ApprovalStatus = 1
),
FilesWithApproval AS (
    SELECT DISTINCT QMSID
    FROM QMS_FILE_APPROVAL WITH (NOLOCK)
    WHERE Active_Status = 1
)
SELECT DISTINCT
    A.ID AS FOLDER_ID,
    A.ParentID AS PARENT_FOLDER_ID,
    CONVERT(VARCHAR(MAX), CONVERT(VARCHAR(MAX), A.ID) + '/') AS XPATH,
    A.LogFileID AS File_Name,
    CONVERT(VARCHAR(MAX), CONVERT(VARCHAR(MAX), A.LogFileID) + '/') AS XNPATH,
    A.FilePath + '/' AS OPATH,
    LEFT(
        ISNULL(A.filepath, ''),
        CASE 
            WHEN LEN(ISNULL(A.filepath, '')) - CHARINDEX('/', REVERSE(ISNULL(A.filepath, '')) + '/') < 0 THEN 0
            ELSE LEN(ISNULL(A.filepath, '')) - CHARINDEX('/', REVERSE(ISNULL(A.filepath, '')) + '/')
        END
    ) + '/' + CAST(A.LogFileID AS VARCHAR) AS FilePath,
    REPLACE(A.FilePath, A.FilePath + '/', '') AS FullFName,
    CONVERT(DECIMAL(9, 2), CEILING((ISNULL(A.Size, 0) / 1024.00) * 100) / 100) AS FileSize,
    A.Version,
    FV.Last_Update,
    FV.Published_On,
    FV.Remarks,
    A.NodeType
FROM 
    QMSDTLSFILE_LOG A WITH (NOLOCK)
LEFT JOIN 
    ApprovedMaxLevel AML ON AML.QMSID = A.ID AND AML.Version = A.Version
LEFT JOIN 
    FilesWithApproval FWA ON FWA.QMSID = A.ID
LEFT JOIN (
    SELECT
        fvi.FileID,
        MAX(fvi.ID) AS Max_ID,
        MAX(fvi.[Version]) AS Version,
        MAX(foi.Operation_Date) AS Published_On,
        foi.Date_Of_Creatation AS Last_Update,
        foi.Remarks
    FROM 
        QMS_FileVersionInfo fvi
    INNER JOIN 
        QMS_FileOperationInfo foi ON foi.FileID = fvi.FileID
        AND foi.Operation_Date = (
            SELECT MAX(fo.Operation_Date)
            FROM QMS_FileOperationInfo fo
            WHERE 
                fo.FileID = fvi.FileID
                AND fo.active_status = 1
                AND fvi.active_status = 1
        )
    GROUP BY 
        fvi.FileID, foi.Date_Of_Creatation, foi.Remarks
) FV ON FV.FileID = A.ID
WHERE 
    A.NodeType = 0
    AND A.Active_Status = 1
    AND (
        FWA.QMSID IS NULL
        OR (
            AML.QMSID IS NOT NULL
            AND AML.Version = A.Version
        )
    );
