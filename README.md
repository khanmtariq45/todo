here is SP to delete the folder and file and client requirement is 

As a QMS user managing documents across multiple folders,

I want the ability to update or delete a document in one place and have the changes reflected across all folders where the same file exists,
so that I can maintain consistency and reduce manual effort.

Functional Requirements:
1. Centralized Update/Delete Logic:
When a user updates or deletes a document from any folder:
The system will search the database for all instances of that document using filename matching.
All matching documents across folders will be:
Updated with the new content (for update action)
Deleted (for delete action)
2. Delete Confirmation Popup:
On initiating a delete action, show a warning message:
"This document exists in multiple folders. Do you want to delete it from this folder only or from all folders?"

Provide two action buttons:
Delete from Current Folder
Delete from All Folders
3. Update Behaviour:
When updating a document:
All instances with the same filename across folders are replaced with the updated version.
Metadata such as version, modified date, and user ID are updated accordingly.

CREATE OR ALTER PROCEDURE [dbo].[QMS_Delete_File_Folder]
@ID int,
@UserID int,
@DeleteAllMatch bit = 0  
AS
BEGIN
BEGIN TRY 
    DECLARE @logMessage VARCHAR(MAX);
    DECLARE @vStepID int;
    DECLARE @param VARCHAR(MAX) = CONCAT('@ID=', CONVERT(VARCHAR(10), @ID), ',@UserID=', CONVERT(VARCHAR(10), @UserID));
    Declare @FolderIDS TABLE  
	(  
		FolderID      INT NULL  
		,LogFileID    varchar(1000) NULL  
		,ParentID     INT NULL  
		,NodeType INT NULL  
	)  
	Declare @TempFileID TABLE  
	(  
		ID      INT NULL  
	)  
	Declare @FileID TABLE  
	(  
		ID      INT NULL  
	)  
	declare @FilePathAfterDel varchar(1000) = ''
		Declare @FolderCNT INT,@PreviousFolder INT=0,@DocIDCNT INT,@PreviousID INT=0,@DocID INT,@ChildLogFileID varchar(2000),@NodeType INT,@ParentID INT,@ChildFolderID INT,@LogFileID varchar(1000)=''
		,@FilePath varchar(max) = '', @NodeTypeMain int = null
        Select @LogFileID = LogFileID, @FilePath = FilePath, @NodeTypeMain = NodeType from QMSdtlsFile_Log where ID=@ID;
		WITH cte(DocId, FileName, FilePath) AS
		(
			SELECT ID, LogFileID, FilePath
			FROM qmsdtlsfile_log
			WHERE ID=@ID and Active_Status=1
			UNION ALL
			SELECT fl.ID, fl.LogFileID, fl.FilePath
			FROM qmsdtlsfile_log AS fl
				INNER JOIN cte
				ON fl.ParentID = cte.DocId
  			where Active_Status=1
		)
    insert into @FileID
		select DocId from cte;
		SET @FolderCNT=(select COUNT(ID) from @FileID )  
		SET @PreviousID=0  
    	SET @vStepID = 1;
        WHIle(@FolderCNT>0)
            BEGIN  
			select top 1  @DocID=Id from @FileID where ID>@PreviousID order by ID  
			if(@NodeTypeMain = 1 and @DocID = @ID)
			begin  
    			SET @vStepID = 2;
				declare @NamePostFix varchar(100) = + '_deleted_' + replace(convert(varchar, getdate(),101),'/','') + replace(convert(varchar, getdate(),108),':','') + '_' + convert(varchar(36), newid())
				set @FilePathAfterDel= @FilePath + @NamePostFix
				update QMSdtlsFile_Log set Active_Status=0,Date_Of_Deletion=GETDATE(), Deleted_By=@UserID, 
				LogFileID = LogFileID + @NamePostFix,
				FilePath = FilePath + @NamePostFix
				where  ID =@DocID
			end
			else
			begin  
    			SET @vStepID = 3;
				update QMSdtlsFile_Log set Active_Status=0,Date_Of_Deletion=GETDATE(), Deleted_By=@UserID where  ID =@DocID 
			end  
    			SET @vStepID = 4;
				-- Update Active_Status in QMS_DTL_Vessel_Assignment
				update QMS_DTL_Vessel_Assignment set Active_Status=0,Date_Of_Deletion=GETDATE(), Deleted_By=@UserID
				where Document_ID = @DocID and active_status = 1;
    			SET @vStepID = 5;
				-- Update Active_Status in QMS_Sync_History
				update QMS_Sync_History set Active_Status=0,Date_Of_Deletion=GETDATE(), Deleted_By=@UserID
				where FileID = @DocID;
    			SET @vStepID = 6;
				-- Update Active_Status in QMS_FileVersionInfo
				update QMS_FileVersionInfo set Active_Status=0,Date_Of_Deletion=GETDATE(), Deleted_By=@UserID
				where FileID = @DocID;
    			SET @vStepID = 7;
				-- Update Active_Status in QMS_Folder_Approval
				update QMS_Folder_Approval set Active_Status=0,Date_Of_Deletion=GETDATE(), Deleted_By=@UserID
				where Folder_ID = @DocID;
    			SET @vStepID = 8;
				-- Update Active_Status in QMS_FILE_APPROVAL
				update QMS_FILE_APPROVAL set Active_Status=0,Date_Of_Deletion=GETDATE(), Deleted_By=@UserID
				where QMSID = @DocID;
    			SET @vStepID = 9;
				-- Update Active_Status in QMS_FileOperationInfo
				update QMS_FileOperationInfo set Active_Status=0,Date_Of_Deletion=GETDATE(), Deleted_By=@UserID
				where FileID = @DocID;
 
			declare @TableName nvarchar(500) = null,@PkCondition nvarchar(500) = null  
			set @PkCondition = 'ID='+cast(@DocID as varchar) 
    		SET @vStepID = 10;
			EXEC SYNC_SP_DataSynch_MultiPK_DataLog 'QMSdtlsFile_Log', @PkCondition, 0  
 
 
 
			Declare @VersionID INT;
			SELECT TOP 1 @VersionID = ID  FROM QMS_FileVersionInfo with (nolock) WHERE FileID = @DocID ORDER BY ID DESC
			IF @VersionID IS NOT NULL
			BEGIN
				SET @PkCondition = 'ID=' + CAST(@VersionID AS VARCHAR(50));
				EXEC SYNC_SP_DataSynch_MultiPK_DataLog 'QMS_FileVersionInfo', @PkCondition, 0;
			END			
			delete from qms.full_text_content where document_id = @DocID; 
			declare @SQL_UPDATE varchar(1000) = FORMATMESSAGE('DELETE FROM qms.full_text_content WHERE document_id=%d', @DocID);
			SET @vStepID = 11;
			exec SYNC_SP_DataSynchronizer_DataLog null, null, null, 0, @SQL_UPDATE
			SET @PreviousID=@DocID  
			SET @FolderCNT=@FolderCNT-1  
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
	select @FilePathAfterDel, @FilePath
END
