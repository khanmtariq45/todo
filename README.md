The system will check which vessels were added (newly selected) and will sync the files in the selected folders and sub-folders to these vessels
The system will check which vessels were removed and will remove the files from these vessels
The system will not impact or re-sync any vessel that was not changed (no resync will be done for these vessels)      

CREATE OR ALTER PROCEDURE [dbo].[QMS_File_Keep_Assignment]     
        (          
            @FolderIDS UDTT_QMSAssignmnetFolderIDs readonly ,          
            @VesselIDS UDTT_QMSAssignedVesselIDs readonly,          
            @UserID INT          
           )          
           AS
           BEGIN          
           BEGIN TRY   
           DECLARE @CheckCount INT=0
            SELECT  ID,ADID,HFID,NodeType,Version,VesselID INTO #FILES_TO_PROCESS FROM(      
                   SELECT DISTINCT RANK() OVER(PARTITION BY F.ID,vid.vesselid ORDER BY VERSION DESC) 
                   RANK,F.ID, A.DOCUMENT_ID ADID, H.FileID HFID  
                   , NodeType,Version,VID.VesselID
                   FROM QMSdtlsFile_Log F      
                   INNER JOIN @FolderIDs REQUESTED_FOLDER 
                               ON REQUESTED_FOLDER.FolderID = F.ParentID 
                               AND F.NodeType = 0   
                               AND F.active_status = 1         
                   FULL JOIN @VesselIDS VID ON F.active_status = 1      
                   LEFT OUTER JOIN QMS_Sync_History H ON H.FileID = F.ID 
                                   AND H.VesselID = VID.VesselID AND H.Active_Status = 1      
                   LEFT OUTER JOIN QMS_DTL_Vessel_Assignment A ON A.Document_ID = F.ID 
                                   AND A.Vessel_ID = VID.VesselID AND A.Active_Status = 1      
				   WHERE F.ID is not null
                   )FILES      WHERE RANK=1
               MERGE INTO QMS_DTL_Vessel_Assignment AS TARGET             
               USING  #FILES_TO_PROCESS 
               AS SOURCE
               ON TARGET.Document_ID=SOURCE.ID AND SOURCE.ID  is not null AND TARGET.FileVersion=SOURCE.Version
               AND TARGET.Vessel_ID=SOURCE.VesselID AND TARGET.Active_Status = 1 
               WHEN MATCHED THEN             
				   UPDATE SET         
				   TARGET.Date_Of_Modification=GETDATE()        
				   ,TARGET.Modified_By=@UserID         
				   ,TARGET.Active_Status=1         
				   ,TARGET.Date_Of_Deletion=null        
				   ,TARGET.Deleted_By=null        
                WHEN NOT MATCHED BY TARGET AND SOURCE.ID  is not null THEN            
					INSERT (Document_ID, Vessel_ID, Created_By, Date_Of_Creation, Active_Status, FileVersion)            
					VALUES (SOURCE.ID, SOURCE.VesselID, @UserID, GETDATE(), 1, SOURCE.Version);
                MERGE INTO QMS_Sync_History AS TARGET       
                USING #FILES_TO_PROCESS
                AS SOURCE 
                ON TARGET.FileID = SOURCE.ID AND TARGET.VesselID = SOURCE.VesselID 
                AND TARGET.Active_Status = 1 AND TARGET.FileVersion = SOURCE.Version AND SOURCE.Version is not null
               WHEN MATCHED THEN      
               UPDATE SET      
               TARGET.Date_Of_Modification=GETDATE()      
               ,TARGET.Modified_By=@UserID       
               ,TARGET.Active_Status=1       
               ,TARGET.Deleted_By=null      
               ,TARGET.Date_Of_Deletion=null      
               WHEN NOT MATCHED BY TARGET AND SOURCE.Version is not null AND SOURCE.ID  is not null  THEN       
				   INSERT (FileID, VesselID, FileVersion, Created_By, Date_Of_Creation, Active_Status)      
				   VALUES (SOURCE.ID, SOURCE.VesselID, SOURCE.Version, @UserID, GETDATE(), 1);
               SELECT ID, NodeType,Version
               ,VesselID,ADID  INTO #FOLDERS_TO_PROCESS FROM (      
               select distinct F.ID, NodeType,Version
               ,VesselID,A.DOCUMENT_ID ADID 
               FROM QMSdtlsFile_Log F      
               INNER JOIN @FolderIDs REQUESTED_FOLDER ON REQUESTED_FOLDER.FolderID = F.ID      
               FULL JOIN @VesselIDS VID ON F.active_status = 1      
               LEFT OUTER JOIN QMS_DTL_Vessel_Assignment A ON A.Document_ID = F.ID 
               AND A.Vessel_ID = VID.VesselID AND A.Active_Status = 1      
               ) FOLDERS      
               MERGE INTO QMS_DTL_Vessel_Assignment AS TARGET       
               USING #FOLDERS_TO_PROCESS AS SOURCE
               ON TARGET.Document_ID=SOURCE.ADID 
               AND TARGET.Vessel_ID=SOURCE.VesselID AND TARGET.Active_Status = 1       
               WHEN MATCHED THEN       
               UPDATE SET         
               TARGET.Date_Of_Modification=GETDATE()        
               ,TARGET.Modified_By=@UserID         
               ,TARGET.Active_Status=1         
               ,TARGET.Date_Of_Deletion=null        
               ,TARGET.Deleted_By=null        
               ,TARGET.FileVersion = 0                   
               WHEN NOT MATCHED BY TARGET AND SOURCE.ID is not null THEN            
               INSERT (Document_ID, Vessel_ID, Created_By, Date_Of_Creation, Active_Status, FileVersion)            
               VALUES (SOURCE.ID, SOURCE.VesselID, @UserID, GETDATE(), 1, 0);      
               drop table #FILES_TO_PROCESS
               drop table #FOLDERS_TO_PROCESS       
               RETURN 2   
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
                 IF (OBJECT_ID('tempdb..#FILES_TO_PROCESS') IS NOT NULL)
                 BEGIN
                   drop table #FILES_TO_PROCESS
                 END
                 IF (OBJECT_ID('tempdb..#FOLDERS_TO_PROCESS') IS NOT NULL)
                 BEGIN
                         drop table #FOLDERS_TO_PROCESS
                 END
                RAISERROR (@ErrorMessage,@ErrorSeverity, @ErrorState );  
           END CATCH           
           END

