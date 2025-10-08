CREATE OR ALTER PROCEDURE [dbo].[QMS_Delete_File_Folder]
    @ID int,
    @UserID int,
    @DeleteAllMatch bit = 0  
AS
BEGIN
    BEGIN TRY 
        DECLARE @logMessage VARCHAR(MAX);
        DECLARE @vStepID int;
        DECLARE @param VARCHAR(MAX) = CONCAT('@ID=', CONVERT(VARCHAR(10), @ID), ',@UserID=', CONVERT(VARCHAR(10), @UserID), ',@DeleteAllMatch=', CONVERT(VARCHAR(10), @DeleteAllMatch));


        DECLARE @FileID TABLE (ID INT NULL);  
        DECLARE @FilePathAfterDel varchar(1000) = '';
        DECLARE 
            @FolderCNT INT,
            @PreviousID INT = 0,
            @DocID INT,
            @NodeTypeMain int = NULL,
            @LogFileID varchar(1000) = '',
            @FilePath varchar(max) = '';

        -- Get main file info
        SELECT 
            @LogFileID = LogFileID, 
            @FilePath = FilePath, 
            @NodeTypeMain = NodeType 
        FROM QMSdtlsFile_Log 
        WHERE ID=@ID;

        -- ✅ Populate @FileID based on DeleteAllMatch flag
        IF @DeleteAllMatch = 1
        BEGIN
            -- Delete from ALL FOLDERS (same file across system)
            INSERT INTO @FileID
            SELECT ID
            FROM QMSdtlsFile_Log
            WHERE LogFileID = @LogFileID AND Active_Status = 1;
        END
        ELSE
        BEGIN
            -- Delete only from CURRENT FOLDER (with children if any)
            ;WITH cte(DocId, FileName, FilePath) AS
            (
                SELECT ID, LogFileID, FilePath
                FROM QMSdtlsFile_Log
                WHERE ID=@ID and Active_Status=1
                UNION ALL
                SELECT fl.ID, fl.LogFileID, fl.FilePath
                FROM QMSdtlsFile_Log AS fl
                INNER JOIN cte ON fl.ParentID = cte.DocId
                WHERE Active_Status=1
            )
            INSERT INTO @FileID
            SELECT DocId FROM cte;
        END

        -- Start processing files
        SET @FolderCNT = (SELECT COUNT(ID) FROM @FileID);  
        SET @PreviousID = 0;  
        SET @vStepID = 1;

        WHILE(@FolderCNT > 0)
        BEGIN  
            SELECT TOP 1 @DocID = Id 
            FROM @FileID 
            WHERE ID > @PreviousID 
            ORDER BY ID;  

            -- If it's a folder (NodeType=1) and root doc, append postfix
            IF(@NodeTypeMain = 1 AND @DocID = @ID)
            BEGIN  
                SET @vStepID = 2;
                DECLARE @NamePostFix varchar(100) = '_deleted_' 
                    + REPLACE(CONVERT(varchar, GETDATE(), 101), '/', '') 
                    + REPLACE(CONVERT(varchar, GETDATE(), 108), ':', '') 
                    + '_' + CONVERT(varchar(36), NEWID());

                SET @FilePathAfterDel = @FilePath + @NamePostFix;

                UPDATE QMSdtlsFile_Log 
                SET Active_Status = 0,
                    Date_Of_Deletion = GETDATE(),
                    Deleted_By = @UserID, 
                    LogFileID = LogFileID + @NamePostFix,
                    FilePath = FilePath + @NamePostFix
                WHERE ID = @DocID;
            END
            ELSE
            BEGIN  
                SET @vStepID = 3;
                UPDATE QMSdtlsFile_Log 
                SET Active_Status = 0,
                    Date_Of_Deletion = GETDATE(),
                    Deleted_By = @UserID
                WHERE ID = @DocID; 
            END  

            -- Related tables update
            SET @vStepID = 4;
            UPDATE QMS_DTL_Vessel_Assignment 
            SET Active_Status = 0, Date_Of_Deletion = GETDATE(), Deleted_By = @UserID
            WHERE Document_ID = @DocID AND active_status = 1;

            SET @vStepID = 5;
            UPDATE QMS_Sync_History 
            SET Active_Status = 0, Date_Of_Deletion = GETDATE(), Deleted_By = @UserID
            WHERE FileID = @DocID;

            SET @vStepID = 6;
            UPDATE QMS_FileVersionInfo 
            SET Active_Status = 0, Date_Of_Deletion = GETDATE(), Deleted_By = @UserID
            WHERE FileID = @DocID;

            SET @vStepID = 7;
            UPDATE QMS_Folder_Approval 
            SET Active_Status = 0, Date_Of_Deletion = GETDATE(), Deleted_By = @UserID
            WHERE Folder_ID = @DocID;

            SET @vStepID = 8;
            UPDATE QMS_FILE_APPROVAL 
            SET Active_Status = 0, Date_Of_Deletion = GETDATE(), Deleted_By = @UserID
            WHERE QMSID = @DocID;

            SET @vStepID = 9;
            UPDATE QMS_FileOperationInfo 
            SET Active_Status = 0, Date_Of_Deletion = GETDATE(), Deleted_By = @UserID
            WHERE FileID = @DocID;

            -- Data sync logs
            DECLARE @PkCondition nvarchar(500);
            SET @PkCondition = 'ID=' + CAST(@DocID as varchar);
            SET @vStepID = 10;
            EXEC SYNC_SP_DataSynch_MultiPK_DataLog 'QMSdtlsFile_Log', @PkCondition, 0;  

            -- Handle version info logging
            DECLARE @VersionID INT;
            SELECT TOP 1 @VersionID = ID  
            FROM QMS_FileVersionInfo WITH (NOLOCK) 
            WHERE FileID = @DocID 
            ORDER BY ID DESC;

            IF @VersionID IS NOT NULL
            BEGIN
                SET @PkCondition = 'ID=' + CAST(@VersionID AS VARCHAR(50));
                EXEC SYNC_SP_DataSynch_MultiPK_DataLog 'QMS_FileVersionInfo', @PkCondition, 0;
            END			

            -- Delete from full text
            DELETE FROM qms.full_text_content WHERE document_id = @DocID; 
            DECLARE @SQL_UPDATE varchar(1000) = FORMATMESSAGE('DELETE FROM qms.full_text_content WHERE document_id=%d', @DocID);

            SET @vStepID = 11;
            EXEC SYNC_SP_DataSynchronizer_DataLog NULL, NULL, NULL, 0, @SQL_UPDATE;

            -- Loop controls
            SET @PreviousID = @DocID;  
            SET @FolderCNT = @FolderCNT - 1;  
        END
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000);
        DECLARE @ErrorSeverity INT;
        DECLARE @ErrorState INT;
 
        SELECT 
            @ErrorMessage = ERROR_MESSAGE(),
            @ErrorSeverity = ERROR_SEVERITY(),    
            @ErrorState = ERROR_STATE();   

        RAISERROR (@ErrorMessage,@ErrorSeverity, @ErrorState );

        SET @logMessage = CONCAT('Failed! StepID = ', @vStepID, ', ', ERROR_MESSAGE(), ', parameters:-', @param);
        EXEC inf_log_write 'qms', 'QMS_Delete_File_Folder', 'QMS_Delete_File_Folder', 1, 'Exception occurred in SP', @logMessage, 'sql', @UserID, 0;   
    END CATCH    

    SELECT @FilePathAfterDel AS FilePathAfterDel, @FilePath AS OriginalFilePath;
END