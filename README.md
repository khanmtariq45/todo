CREATE OR ALTER PROCEDURE [dbo].[QMS_File_Keep_Assignment]     
(
    @FolderIDS UDTT_QMSAssignmnetFolderIDs READONLY,          
    @VesselIDS UDTT_QMSAssignedVesselIDs READONLY,          
    @UserID INT          
)
AS
BEGIN          
    BEGIN TRY   
        -- Temporary table to store files to process
        SELECT ID, ADID, HFID, NodeType, Version, VesselID 
        INTO #FILES_TO_PROCESS 
        FROM (
            SELECT DISTINCT 
                RANK() OVER (PARTITION BY F.ID, vid.vesselid ORDER BY VERSION DESC) AS RANK,
                F.ID, 
                A.DOCUMENT_ID AS ADID, 
                H.FileID AS HFID,  
                NodeType, 
                Version, 
                VID.VesselID
            FROM QMSdtlsFile_Log F      
            INNER JOIN @FolderIDS REQUESTED_FOLDER 
                ON REQUESTED_FOLDER.FolderID = F.ParentID 
                AND F.NodeType = 0   
                AND F.active_status = 1         
            FULL JOIN @VesselIDS VID 
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

        -- Merge into QMS_DTL_Vessel_Assignment (for files)
        MERGE INTO QMS_DTL_Vessel_Assignment AS TARGET             
        USING #FILES_TO_PROCESS AS SOURCE
        ON TARGET.Document_ID = SOURCE.ID 
           AND SOURCE.ID IS NOT NULL 
           AND TARGET.FileVersion = SOURCE.Version
           AND TARGET.Vessel_ID = SOURCE.VesselID 
           AND TARGET.Active_Status = 1 
        WHEN NOT MATCHED BY TARGET AND SOURCE.ID IS NOT NULL THEN            
            INSERT (Document_ID, Vessel_ID, Created_By, Date_Of_Creation, Active_Status, FileVersion)            
            VALUES (SOURCE.ID, SOURCE.VesselID, @UserID, GETDATE(), 1, SOURCE.Version);

        -- Merge into QMS_Sync_History (for files)
        MERGE INTO QMS_Sync_History AS TARGET       
        USING #FILES_TO_PROCESS AS SOURCE 
        ON TARGET.FileID = SOURCE.ID 
           AND TARGET.VesselID = SOURCE.VesselID 
           AND TARGET.Active_Status = 1 
           AND TARGET.FileVersion = SOURCE.Version 
           AND SOURCE.Version IS NOT NULL
        WHEN NOT MATCHED BY TARGET AND SOURCE.Version IS NOT NULL AND SOURCE.ID IS NOT NULL THEN       
            INSERT (FileID, VesselID, FileVersion, Created_By, Date_Of_Creation, Active_Status)      
            VALUES (SOURCE.ID, SOURCE.VesselID, SOURCE.Version, @UserID, GETDATE(), 1);

        -- Temporary table to store folders to process
        SELECT ID, NodeType, Version, VesselID, ADID  
        INTO #FOLDERS_TO_PROCESS 
        FROM (
            SELECT DISTINCT 
                F.ID, 
                NodeType, 
                Version, 
                VesselID, 
                A.DOCUMENT_ID AS ADID 
            FROM QMSdtlsFile_Log F      
            INNER JOIN @FolderIDS REQUESTED_FOLDER 
                ON REQUESTED_FOLDER.FolderID = F.ID      
            FULL JOIN @VesselIDS VID 
                ON F.active_status = 1      
            LEFT OUTER JOIN QMS_DTL_Vessel_Assignment A 
                ON A.Document_ID = F.ID 
                AND A.Vessel_ID = VID.VesselID 
                AND A.Active_Status = 1      
        ) FOLDERS;

        -- Merge into QMS_DTL_Vessel_Assignment (for folders)
        MERGE INTO QMS_DTL_Vessel_Assignment AS TARGET       
        USING #FOLDERS_TO_PROCESS AS SOURCE
        ON TARGET.Document_ID = SOURCE.ADID 
           AND TARGET.Vessel_ID = SOURCE.VesselID 
           AND TARGET.Active_Status = 1       
        WHEN NOT MATCHED BY TARGET AND SOURCE.ID IS NOT NULL THEN            
            INSERT (Document_ID, Vessel_ID, Created_By, Date_Of_Creation, Active_Status, FileVersion)            
            VALUES (SOURCE.ID, SOURCE.VesselID, @UserID, GETDATE(), 1, 0);

        -- Clean up temporary tables
        DROP TABLE #FILES_TO_PROCESS;
        DROP TABLE #FOLDERS_TO_PROCESS;

        -- Return success code
        RETURN 2;   
    END TRY  
    BEGIN CATCH  
        -- Error handling
        DECLARE @ErrorMessage NVARCHAR(4000);      
        DECLARE @ErrorSeverity INT;      
        DECLARE @ErrorState INT; 
        SELECT       
            @ErrorMessage = ERROR_MESSAGE(),      
            @ErrorSeverity = ERROR_SEVERITY(),      
            @ErrorState = ERROR_STATE();  

        -- Clean up temporary tables if they exist
        IF (OBJECT_ID('tempdb..#FILES_TO_PROCESS') IS NOT NULL)
        BEGIN
            DROP TABLE #FILES_TO_PROCESS;
        END
        IF (OBJECT_ID('tempdb..#FOLDERS_TO_PROCESS') IS NOT NULL)
        BEGIN
            DROP TABLE #FOLDERS_TO_PROCESS;
        END

        -- Raise the error
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);  
    END CATCH           
END;