/****** Object:  StoredProcedure [dbo].[QMS_Remove_Assignments]  Script Date: 06/03/2025 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Muhammad Tariq 
-- Create date: 06/03/2025
-- Description:	Optimized version of QMS_Remove_Assignments with @VesselIDS as a join
-- =============================================

CREATE OR ALTER PROCEDURE [dbo].[QMS_Remove_Assignments]      
(
    @FolderIDS UDTT_QMSAssignmnetFolderIDs READONLY,      
    @VesselIDS UDTT_QMSAssignedVesselIDs READONLY,      
    @UserID INT  
)      
AS   
BEGIN  
    SET NOCOUNT ON; -- Reduces network traffic by not sending the count of affected rows

    BEGIN TRY
        DECLARE @FileVesselInfo TABLE (DocId INT, VesselID INT);

        -- Populate data to deactivate records from vessel 
        INSERT INTO @FileVesselInfo (DocId, VesselID)
        SELECT fl.ID, va.Vessel_ID
        FROM QMSdtlsFile_Log fl WITH (NOLOCK)
        INNER JOIN QMS_DTL_Vessel_Assignment va WITH (NOLOCK) ON fl.ID = va.Document_ID
        INNER JOIN @FolderIDS fi ON fi.FolderID = fl.ID OR (fi.FolderID = fl.ParentId AND fl.NodeType = 0)
        INNER JOIN @VesselIDS vi ON va.Vessel_ID = vi.VesselID -- Join with @VesselIDS
        WHERE fl.Active_Status = 1 
          AND va.Active_Status = 1 
          AND fl.NodeType = 0;

        -- Deactivate QMS_DTL_Vessel_Assignment for all records with unchecked VesselIDs.
        UPDATE va
        SET va.Active_Status = 0, 
            va.Deleted_By = @UserID, 
            va.Date_Of_Deletion = GETDATE()
        FROM QMS_DTL_Vessel_Assignment va
        INNER JOIN QMSdtlsFile_Log fl ON va.Document_ID = fl.Id
        INNER JOIN @FolderIDS fi ON fi.FolderID = fl.ID OR (fi.FolderID = fl.ParentId AND fl.NodeType = 0)
        INNER JOIN @VesselIDS vi ON va.Vessel_ID = vi.VesselID -- Join with @VesselIDS
        WHERE va.Active_Status = 1;

        -- Deactivate QMS_Sync_History for all records with unchecked VesselIDs.
        UPDATE h
        SET h.Active_Status = 0, 
            h.Deleted_By = @UserID, 
            h.Date_Of_Deletion = GETDATE()
        FROM QMS_Sync_History h
        INNER JOIN QMSdtlsFile_Log fl ON h.FileID = fl.ID
        INNER JOIN @FolderIDS fi ON fi.FolderID = fl.ID OR (fi.FolderID = fl.ParentId AND fl.NodeType = 0)
        INNER JOIN @VesselIDS vi ON h.VesselID = vi.VesselID -- Join with @VesselIDS
        WHERE h.Active_Status = 1;

        -- Update QMSDTLSFILE_LOG and qms.full_text_content for all deleted document's assignment
        DECLARE @SQL_UPDATE NVARCHAR(MAX);

        DECLARE doc_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT DocId, VesselID FROM @FileVesselInfo;

        OPEN doc_cursor;
        FETCH NEXT FROM doc_cursor INTO @DocID, @VesselID;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Update QMSDTLSFILE_LOG
            SET @SQL_UPDATE = N'UPDATE QMSDTLSFILE_LOG SET Active_Status = 0 WHERE ID = @DocID';
            EXEC [SYNC_SP_DataSynchronizer_DataLog] '', '', '', @VesselID, @SQL_UPDATE;

            -- Delete from qms.full_text_content
            SET @SQL_UPDATE = N'DELETE FROM qms.full_text_content WHERE document_id = @DocID';
            EXEC [SYNC_SP_DataSynchronizer_DataLog] '', '', '', @VesselID, @SQL_UPDATE;

            FETCH NEXT FROM doc_cursor INTO @DocID, @VesselID;
        END;

        CLOSE doc_cursor;
        DEALLOCATE doc_cursor;

        RETURN 1; -- Success
    END TRY  
    BEGIN CATCH    
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();    
        EXEC inf_log_write 'qms', 'syncing', 'QMS_Remove_Assignments', 1, 'QMS_Remove_Assignments', @ErrorMessage;      
        RETURN -1; -- Failure
    END CATCH;
END;
GO