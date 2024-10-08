CREATE OR ALTER PROCEDURE [dbo].[QMS_RESYNC_ASSIGNEMNETS]      
  (  
  @FolderIDS UDTT_QMSAssignmnetFolderIDs readonly ,      
    @VesselIDS UDTT_QMSAssignedVesselIDs readonly ,      
  @UserID INT  
  )      
  AS   
  BEGIN   

  Declare   
  @DocID INT,@FolderID INT,@DocIDCNT INT,@CheckCount INT=0,@VesselID INT=0,@InactiveAssignment_VesselID INT=0,@FileVersion INT,@SQL_UPDATE Nvarchar(max)=''      
  DECLARE @assignmentID int
  
      Declare FolderID_Cursor CURSOR FOR   
      SELECT FolderID FROM @FolderIDS   order by FolderID asc  

      Declare @fetch_FolderID_Cursor int  
  OPEN FolderID_Cursor  

  FETCH NEXT FROM FolderID_Cursor INTO @FolderID   
  set @fetch_FolderID_Cursor=@@FETCH_STATUS  
  WHILE @fetch_FolderID_Cursor = 0      
  BEGIN  
          
    Declare DocID_Cursor CURSOR FOR   
    select ID from QMSdtlsFile_Log where ParentID=@FolderID and Active_Status=1 and NodeType=0  
    Declare @fetch_DocID_Cursor int  
    OPEN DocID_Cursor  
    FETCH NEXT FROM DocID_Cursor INTO @DocID    
    set @fetch_DocID_Cursor=@@FETCH_STATUS  
    WHILE @fetch_DocID_Cursor = 0      
    BEGIN   
      SET @FileVersion=(select Version from QMSdtlsFile_Log where ID=@DocID and Active_Status=1 and NodeType=0)      
    
      Declare VesselID_Cursor CURSOR FOR   
      SELECT VesselID from @VesselIDS  
      Declare @fetch_VesselID_Cursor int  
      OPEN VesselID_Cursor  

      FETCH NEXT FROM VesselID_Cursor INTO @VesselID   

      Update QMS_DTL_Vessel_Assignment set Active_Status=0 ,Deleted_By=@UserID,Date_Of_Deletion=GETDATE() where Document_ID=@DocID and Active_Status=1 and Vessel_ID=@VesselID    
      Update QMS_DTL_Vessel_Assignment set Active_Status=0 ,Deleted_By=@UserID,Date_Of_Deletion=GETDATE() where Document_ID=@FolderID and Active_Status=1 and Vessel_ID=@VesselID
      Update QMS_Sync_History set  Active_Status=0,Deleted_By=@UserID,Date_Of_Deletion=GETDATE() where FileID=@DocID and Active_Status=1 and VesselID=@VesselID

      set @fetch_VesselID_Cursor=@@FETCH_STATUS  
      WHILE @fetch_VesselID_Cursor = 0   
      BEGIN      
      IF Exists(select top 1 ID from QMS_DTL_Vessel_Assignment where Document_ID=@DocID and Vessel_ID=@VesselID and FileVersion=@FileVersion)      
      BEGIN      
      
		select top 1 @assignmentID=ID from QMS_DTL_Vessel_Assignment 
		where Document_ID=@DocID and Vessel_ID=@VesselID and FileVersion=@FileVersion
		order by ID desc

        Update QMS_DTL_Vessel_Assignment 
		set Date_Of_Modification=GETDATE(),Modified_By=@UserID ,Active_Status=1 ,FileVersion=@FileVersion,Date_Of_Deletion=null,Deleted_By=null
        where ID = @assignmentID

        Update QMS_Sync_History set Date_Of_Modification=GETDATE(),Modified_By=@UserID ,Date_Of_Deletion=null,Deleted_By=null,Active_Status=1 
		where FileID=@DocID and VesselID=@VesselID and FileVersion=@FileVersion      
        SET @CheckCount=@CheckCount+1      
      END      
      ELSE      
      BEGIN      
        Insert into QMS_DTL_Vessel_Assignment(Document_ID,Vessel_ID,Created_By,Date_Of_Creation,Active_Status,FileVersion)      
        values(@DocID,@VesselID,@UserID,GETDATE(),1,@FileVersion)      
        SET @CheckCount=@CheckCount+1      
      END      
    
    --Merge data in QMS_Sync_History table       
        MERGE INTO QMS_Sync_History AS TARGET       
        USING (VALUES(@DocID,@VesselID,@FileVersion,@UserID,getdate(),1))      
        AS SOURCE (FileID,VesselID,FileVersion,Created_By,Date_Of_Creation,Active_Status)      
        ON TARGET.FileID=SOURCE.FileID      
        AND TARGET.VESSELID=SOURCE.VesselID      
        AND TARGET.FileVersion=SOURCE.FileVersion   
        AND TARGET.SyncID is null    
        WHEN MATCHED THEN       
        UPDATE SET   
        TARGET.Active_Status=1  
          ,TARGET.Date_Of_Modification=GETDATE()       
        WHEN NOT MATCHED BY TARGET THEN      
        INSERT (FileID,VesselID,FileVersion,Created_By,Date_Of_Creation,Active_Status)      
        VALUES (@DocID,@VesselID,@FileVersion,@UserID,getdate(),1);   
    
        FETCH NEXT FROM VesselID_Cursor INTO @VesselID   
      set @fetch_VesselID_Cursor=@@FETCH_STATUS   
      END
      CLOSE VesselID_Cursor
      DEALLOCATE VesselID_Cursor  
      
      FETCH NEXT FROM DocID_Cursor INTO @DocID   
      set @fetch_DocID_Cursor=@@FETCH_STATUS  
    END   
    CLOSE DocID_Cursor  
    DEALLOCATE DocID_Cursor  

    FETCH NEXT FROM FolderID_Cursor INTO @FolderID  
    set @fetch_FolderID_Cursor=@@FETCH_STATUS    
  END   
  CLOSE FolderID_Cursor  
  DEALLOCATE FolderID_Cursor     
  
  IF(@CheckCount>0)      
  RETURN 1		
  else      
  RETURN 0      
        
  END
