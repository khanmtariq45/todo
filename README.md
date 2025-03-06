/****** Object:  StoredProcedure [dbo].[QMS_Remove_Assignments]  Script Date: 06/03/2025 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Muhammad Tariq 
-- Create date: 06/03/2025
-- Description:	
-- =============================================

CREATE OR ALTER PROCEDURE [dbo].[QMS_Remove_Assignments]      
  (  
  @FolderIDS UDTT_QMSAssignmnetFolderIDs readonly,      
  @VesselIDS UDTT_QMSAssignedVesselIDs readonly,      
  @UserID INT  
  )      
  AS   
  BEGIN  
  BEGIN TRY

  DECLARE @DocID INT, @VesselID INT;
  DECLARE @SQL_UPDATE NVARCHAR(MAX);

  DECLARE @FileVesselInfo TABLE (DocId INT, VesselID INT);

    -- populated data to deactivate records from vessel 
    INSERT INTO @FileVesselInfo (DocId, VesselID)
    SELECT fl.ID, va.Vessel_ID
    FROM QMSdtlsFile_Log fl with (nolock)
    INNER JOIN QMS_DTL_Vessel_Assignment va WITH (NOLOCK) ON fl.ID = va.Document_ID
    INNER JOIN @FolderIDS fi ON fi.FolderID = fl.ID OR (fi.FolderID = fl.ParentId AND fl.NodeType = 0)
    WHERE fl.Active_Status = 1 AND va.Active_Status = 1 
    AND fl.NodeType = 0 AND va.Vessel_ID IN (SELECT VesselID FROM @VesselIDS);

    -- deactivate QMS_DTL_Vessel_Assignment for all records with unchecked VesselIDs.
    UPDATE va
    SET va.Active_Status = 0, va.Deleted_By = @UserID, va.Date_Of_Deletion = GETDATE()
    FROM QMS_DTL_Vessel_Assignment va
    INNER JOIN QMSdtlsFile_Log fl ON va.Document_ID = fl.Id
    INNER JOIN @FolderIDS fi ON fi.FolderID = fl.ID OR (fi.FolderID = fl.ParentId AND fl.NodeType = 0)
    WHERE va.Active_Status = 1 AND va.Vessel_ID IN (SELECT VesselID FROM @VesselIDS);

    -- deactivate QMS_Sync_History for all records with unchecked VesselIDs.
    UPDATE h
    SET h.Active_Status = 0, h.Deleted_By = @UserID, h.Date_Of_Deletion = GETDATE()
    FROM QMS_Sync_History h
    INNER JOIN QMSdtlsFile_Log fl ON h.FileID = fl.ID
    INNER JOIN @FolderIDS fi ON fi.FolderID = fl.ID OR (fi.FolderID = fl.ParentId AND fl.NodeType = 0)
    WHERE h.Active_Status = 1 AND h.VesselID IN (SELECT VesselID FROM @VesselIDS);

    -- Update QMSDTLSFILE_LOG for all deleted document's assignment
    DECLARE doc_cursor CURSOR FOR
    SELECT DocId, VesselID from @FileVesselInfo

    OPEN doc_cursor;
    FETCH NEXT FROM doc_cursor INTO @DocID, @VesselID;

    WHILE @@FETCH_STATUS = 0
    BEGIN

        SET @SQL_UPDATE = 'UPDATE QMSDTLSFILE_LOG SET Active_Status = 0 WHERE ID = ' + CAST(@DocID AS NVARCHAR(100));
        EXEC [SYNC_SP_DataSynchronizer_DataLog] '', '', '', @VesselID, @SQL_UPDATE;

        SET @SQL_UPDATE = 'DELETE FROM qms.full_text_content WHERE document_id= '+ CAST(@DocID AS NVARCHAR(100));
        EXEC [SYNC_SP_DataSynchronizer_DataLog] '', '', '', @VesselID, @SQL_UPDATE;

        FETCH NEXT FROM doc_cursor INTO @DocID, @VesselID;
    END;

    CLOSE doc_cursor;
    DEALLOCATE doc_cursor;
    
    return 1;
    END TRY  

	BEGIN CATCH    
		DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE()    
		EXEC inf_log_write 'qms','syncing','QMS_Remove_Assignments', 1, 'QMS_Remove_Assignments', @ErrorMessage      
	END CATCH
END 
