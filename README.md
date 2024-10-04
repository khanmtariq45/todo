DELETE qa
FROM QMS_DTL_Vessel_Assignment qa
LEFT JOIN (
    SELECT FolderID, VesselID
    FROM @FolderIDS f
    CROSS JOIN @VesselIDS v
) AS incoming
ON qa.Document_ID = incoming.FolderID
AND qa.Vessel_ID = incoming.VesselID
WHERE incoming.FolderID IS NULL
AND qa.Active_Status = 1;



CREATE OR ALTER PROCEDURE [dbo].[QMS_File_Keep_Assignment]     
(          
    @FolderIDS UDTT_QMSAssignmnetFolderIDs readonly,          
    @VesselIDS UDTT_QMSAssignedVesselIDs readonly,          
    @UserID INT          
)          
AS
BEGIN          
    BEGIN TRY   
        DECLARE @CheckCount INT = 0;

        -- Step 1: Files to process for syncing with vessels
        SELECT ID, ADID, HFID, NodeType, Version, VesselID INTO #FILES_TO_PROCESS
        FROM (
            SELECT DISTINCT 
                RANK() OVER(PARTITION BY F.ID, VID.VesselID ORDER BY Version DESC) AS RANK,
                F.ID, A.DOCUMENT_ID AS ADID, H.FileID AS HFID, NodeType, Version, VID.VesselID
            FROM QMSdtlsFile_Log F
            INNER JOIN @FolderIDs REQUESTED_FOLDER 
                ON REQUESTED_FOLDER.FolderID = F.ParentID 
                AND F.NodeType = 0
                AND F.active_status = 1         
            INNER JOIN @VesselIDS VID 
                ON F.active_status = 1      
            LEFT OUTER JOIN QMS_Sync_History H 
                ON H.FileID = F.ID 
                AND H.VesselID = VID.VesselID 
                AND H.Active_Status = 1      
            LEFT OUTER JOIN QMS_DTL_Vessel_Assignment A 
                ON A.Document_ID = F.ID 
                AND A.Vessel_ID = VID.VesselID 
                AND A.Active_Status = 1      
            WHERE F.ID IS NOT NULL
        ) FILES
        WHERE RANK = 1;

        -- Step 2: Insert or update the assignments
        MERGE INTO QMS_DTL_Vessel_Assignment AS TARGET             
        USING  #FILES_TO_PROCESS AS SOURCE
        ON TARGET.Document_ID = SOURCE.ID 
           AND SOURCE.ID IS NOT NULL 
           AND TARGET.FileVersion = SOURCE.Version
           AND TARGET.Vessel_ID = SOURCE.VesselID 
           AND TARGET.Active_Status = 1 
        -- Only update if necessary (avoid resync if it's already up to date)
        WHEN MATCHED AND (TARGET.FileVersion <> SOURCE.Version OR TARGET.Active_Status <> 1) THEN             
            UPDATE SET         
                TARGET.Date_Of_Modification = GETDATE(),        
                TARGET.Modified_By = @UserID,         
                TARGET.Active_Status = 1,         
                TARGET.Date_Of_Deletion = NULL,        
                TARGET.Deleted_By = NULL        
        -- Insert only if it doesn't exist (no re-sync if already there)
        WHEN NOT MATCHED BY TARGET AND SOURCE.ID IS NOT NULL THEN            
            INSERT (Document_ID, Vessel_ID, Created_By, Date_Of_Creation, Active_Status, FileVersion)            
            VALUES (SOURCE.ID, SOURCE.VesselID, @UserID, GETDATE(), 1, SOURCE.Version);

        -- Step 3: Remove vessel access for folders no longer selected
        -- This deletes records from the vessel assignments table for vessels and folders no longer present in the selected parameters.
        DELETE FROM QMS_DTL_Vessel_Assignment
        WHERE Vessel_ID NOT IN (SELECT VesselID FROM @VesselIDS)
          AND Document_ID IN (SELECT FolderID FROM @FolderIDS)
          AND Active_Status = 1;

        -- Step 4: Sync history update (avoid unnecessary updates if already synced)
        MERGE INTO QMS_Sync_History AS TARGET       
        USING #FILES_TO_PROCESS AS SOURCE 
        ON TARGET.FileID = SOURCE.ID 
           AND TARGET.VesselID = SOURCE.VesselID 
           AND TARGET.Active_Status = 1 
           AND TARGET.FileVersion = SOURCE.Version 
           AND SOURCE.Version IS NOT NULL
        -- Only update if necessary (avoid re-sync if it's already up to date)
        WHEN MATCHED AND (TARGET.FileVersion <> SOURCE.Version OR TARGET.Active_Status <> 1) THEN      
            UPDATE SET      
                TARGET.Date_Of_Modification = GETDATE(),      
                TARGET.Modified_By = @UserID,       
                TARGET.Active_Status = 1,       
                TARGET.Deleted_By = NULL,      
                TARGET.Date_Of_Deletion = NULL      
        -- Insert only if not already there (avoid resync)
        WHEN NOT MATCHED BY TARGET AND SOURCE.Version IS NOT NULL AND SOURCE.ID IS NOT NULL THEN       
            INSERT (FileID, VesselID, FileVersion, Created_By, Date_Of_Creation, Active_Status)      
            VALUES (SOURCE.ID, SOURCE.VesselID, SOURCE.Version, @UserID, GETDATE(), 1);

        -- Step 5: Folders to process for vessel access
        SELECT ID, NodeType, Version, VesselID, ADID INTO #FOLDERS_TO_PROCESS 
        FROM (
            SELECT DISTINCT F.ID, NodeType, Version, VesselID, A.DOCUMENT_ID AS ADID
            FROM QMSdtlsFile_Log F      
            INNER JOIN @FolderIDs REQUESTED_FOLDER ON REQUESTED_FOLDER.FolderID = F.ID      
            INNER JOIN @VesselIDS VID ON F.active_status = 1      
            LEFT OUTER JOIN QMS_DTL_Vessel_Assignment A 
                ON A.Document_ID = F.ID 
                AND A.Vessel_ID = VID.VesselID 
                AND A.Active_Status = 1      
        ) FOLDERS;

        -- Step 6: Insert or update folder assignments
        MERGE INTO QMS_DTL_Vessel_Assignment AS TARGET       
        USING #FOLDERS_TO_PROCESS AS SOURCE
        ON TARGET.Document_ID = SOURCE.ADID 
           AND TARGET.Vessel_ID = SOURCE.VesselID 
           AND TARGET.Active_Status = 1       
        -- Only update if necessary (avoid resync if it's already up to date)
        WHEN MATCHED AND (TARGET.FileVersion <> SOURCE.Version OR TARGET.Active_Status <> 1) THEN       
            UPDATE SET         
                TARGET.Date_Of_Modification = GETDATE(),        
                TARGET.Modified_By = @UserID,         
                TARGET.Active_Status = 1,         
                TARGET.Date_Of_Deletion = NULL,        
                TARGET.Deleted_By = NULL,        
                TARGET.FileVersion = SOURCE.Version                   
        -- Insert only if it doesn't exist (avoid resync if already there)
        WHEN NOT MATCHED BY TARGET AND SOURCE.ID IS NOT NULL THEN            
            INSERT (Document_ID, Vessel_ID, Created_By, Date_Of_Creation, Active_Status, FileVersion)            
            VALUES (SOURCE.ID, SOURCE.VesselID, @UserID, GETDATE(), 1, SOURCE.Version);

        -- Cleanup temp tables
        DROP TABLE #FILES_TO_PROCESS;
        DROP TABLE #FOLDERS_TO_PROCESS;

        RETURN 2;
    END TRY  
    BEGIN CATCH  
        DECLARE @ErrorMessage NVARCHAR(4000);      
        DECLARE @ErrorSeverity INT;      
        DECLARE @ErrorState INT; 
        SELECT @ErrorMessage = ERROR_MESSAGE(),      
               @ErrorSeverity = ERROR_SEVERITY(),      
               @ErrorState = ERROR_STATE();  

        IF (OBJECT_ID('tempdb..#FILES_TO_PROCESS') IS NOT NULL) BEGIN
            DROP TABLE #FILES_TO_PROCESS;
        END

        IF (OBJECT_ID('tempdb..#FOLDERS_TO_PROCESS') IS NOT NULL) BEGIN
            DROP TABLE #FOLDERS_TO_PROCESS;
        END

        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);  
    END CATCH           
END
