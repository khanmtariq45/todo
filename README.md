CREATE OR ALTER PROCEDURE [dbo].[QMS_RESYNC_ASSIGNEMNETS]      
(  
  @FolderIDS UDTT_QMSAssignmnetFolderIDs readonly,      
  @VesselIDS UDTT_QMSAssignedVesselIDs readonly,      
  @UserID INT  
)      
AS   
BEGIN   
  DECLARE   
    @DocID INT, @FolderID INT, @CheckCount INT = 0, 
    @VesselID INT = 0, @FileVersion INT, 
    @assignmentID INT

  DECLARE FolderID_Cursor CURSOR FOR   
    SELECT FolderID FROM @FolderIDS ORDER BY FolderID ASC  

  OPEN FolderID_Cursor  
  FETCH NEXT FROM FolderID_Cursor INTO @FolderID   
  
  WHILE @@FETCH_STATUS = 0  
  BEGIN  
    -- Loop through files in the folder
    DECLARE DocID_Cursor CURSOR FOR   
      SELECT ID FROM QMSdtlsFile_Log 
      WHERE ParentID = @FolderID AND Active_Status = 1 AND NodeType = 0 

    OPEN DocID_Cursor  
    FETCH NEXT FROM DocID_Cursor INTO @DocID    
    
    WHILE @@FETCH_STATUS = 0  
    BEGIN   
      SET @FileVersion = (SELECT Version 
                          FROM QMSdtlsFile_Log 
                          WHERE ID = @DocID AND Active_Status = 1 AND NodeType = 0)      
    
      -- Loop through vessels
      DECLARE VesselID_Cursor CURSOR FOR   
        SELECT VesselID FROM @VesselIDS  
        
      OPEN VesselID_Cursor  
      FETCH NEXT FROM VesselID_Cursor INTO @VesselID   

      WHILE @@FETCH_STATUS = 0  
      BEGIN      
        -- Check if the assignment exists and update it
        IF EXISTS (SELECT TOP 1 ID 
                   FROM QMS_DTL_Vessel_Assignment 
                   WHERE Document_ID = @DocID AND Vessel_ID = @VesselID AND FileVersion = @FileVersion)      
        BEGIN      
          SELECT TOP 1 @assignmentID = ID 
          FROM QMS_DTL_Vessel_Assignment 
          WHERE Document_ID = @DocID AND Vessel_ID = @VesselID AND FileVersion = @FileVersion
          ORDER BY ID DESC

          UPDATE QMS_DTL_Vessel_Assignment 
          SET Date_Of_Modification = GETDATE(), Modified_By = @UserID, 
              Active_Status = 1, FileVersion = @FileVersion, 
              Date_Of_Deletion = NULL, Deleted_By = NULL
          WHERE ID = @assignmentID
        END      
        ELSE      
        BEGIN      
          -- Insert a new assignment if not found
          INSERT INTO QMS_DTL_Vessel_Assignment(Document_ID, Vessel_ID, Created_By, Date_Of_Creation, Active_Status, FileVersion)      
          VALUES(@DocID, @VesselID, @UserID, GETDATE(), 1, @FileVersion)      
        END      
    
        -- Merge data in QMS_Sync_History table       
        MERGE INTO QMS_Sync_History AS TARGET       
        USING (VALUES(@DocID, @VesselID, @FileVersion, @UserID, GETDATE(), 1)) AS SOURCE (FileID, VesselID, FileVersion, Created_By, Date_Of_Creation, Active_Status)      
        ON TARGET.FileID = SOURCE.FileID AND TARGET.VesselID = SOURCE.VesselID AND TARGET.FileVersion = SOURCE.FileVersion   
        WHEN MATCHED THEN       
          UPDATE SET TARGET.Active_Status = 1, TARGET.Date_Of_Modification = GETDATE()       
        WHEN NOT MATCHED BY TARGET THEN      
          INSERT (FileID, VesselID, FileVersion, Created_By, Date_Of_Creation, Active_Status)      
          VALUES (@DocID, @VesselID, @FileVersion, @UserID, GETDATE(), 1);   

        FETCH NEXT FROM VesselID_Cursor INTO @VesselID   
      END -- End Vessel Loop
      
      CLOSE VesselID_Cursor  
      DEALLOCATE VesselID_Cursor  

      FETCH NEXT FROM DocID_Cursor INTO @DocID   
    END -- End File Loop
    
    CLOSE DocID_Cursor  
    DEALLOCATE DocID_Cursor  

    FETCH NEXT FROM FolderID_Cursor INTO @FolderID  
  END -- End Folder Loop
  
  CLOSE FolderID_Cursor  
  DEALLOCATE FolderID_Cursor     
  
  IF (@CheckCount > 0)      
    RETURN 1		
  ELSE      
    RETURN 0      
END