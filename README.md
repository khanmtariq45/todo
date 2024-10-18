/****** Object:  StoredProcedure [dbo].[QMS_Create_Assignments]  Script Date: 10/09/2024 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Muhammad Tariq 
-- Create date: 10/09/2024
-- Description:	for folder and file assignment with selected vessels
-- =============================================

CREATE OR ALTER PROCEDURE [dbo].[QMS_Create_Assignments]      
  (  
  @FolderIDS UDTT_QMSAssignmnetFolderIDs readonly ,      
  @VesselIDS UDTT_QMSAssignedVesselIDs readonly ,      
  @UserID INT  
  )      
  AS   
  BEGIN  
  BEGIN TRY

    DECLARE @VesselIDList NVARCHAR(MAX) = '';
    DECLARE @FolderIDList NVARCHAR(MAX) = '';

    SELECT @VesselIDList = STUFF((SELECT CONCAT(', ', CAST(VesselID AS NVARCHAR(MAX)))
                                  FROM @VesselIDS
                                  FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '');

    SELECT @FolderIDList = STUFF((SELECT CONCAT(', ', CAST(FolderID AS NVARCHAR(MAX)))
                                  FROM @FolderIDS
                                  FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '');

    DECLARE @param NVARCHAR(MAX) = CONCAT('@FolderIDList=', @FolderIDList,
                                          ',@VesselIDList=', @VesselIDList,
                                          ',@UserID=', @UserID);

    EXEC inf_log_write 'qms','syncing','QMS_Create_Assignments1', 1, 'QMS_Create_Assignments1', @param;
    -- Update QMS_DTL_Vessel_Assignment
    UPDATE va
    SET va.Active_Status = 0, va.Deleted_By = @UserID, va.Date_Of_Deletion = GETDATE()
    FROM QMS_DTL_Vessel_Assignment va
    INNER JOIN QMSdtlsFile_Log fl ON va.Document_ID = fl.Id
    INNER JOIN @FolderIDS fi ON fi.FolderID = fl.ID OR (fi.FolderID = fl.ParentId AND fl.NodeType = 0)
    WHERE va.Active_Status = 1 AND va.Vessel_ID NOT IN (SELECT VesselID FROM @VesselIDS);

    -- Update QMS_Sync_History
    UPDATE h
    SET h.Active_Status = 0, h.Deleted_By = @UserID, h.Date_Of_Deletion = GETDATE()
    FROM QMS_Sync_History h
    INNER JOIN QMSdtlsFile_Log fl ON h.FileID = fl.ID
    INNER JOIN @FolderIDS fi ON fi.FolderID = fl.ID OR (fi.FolderID = fl.ParentId AND fl.NodeType = 0)
    WHERE h.Active_Status = 1 AND h.VesselID NOT IN (SELECT VesselID FROM @VesselIDS);

    exec [dbo].[QMS_File_Keep_Assignment] @FolderIDS , @VesselIDS, @UserID
     return 2;
    END TRY  

	BEGIN CATCH    
		DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE()    
		EXEC inf_log_write 'qms','syncing','QMS_Create_Assignments', 1, 'QMS_Create_Assignments', @ErrorMessage      
	END CATCH
END 
