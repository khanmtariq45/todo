DECLARE @DocID NVARCHAR(20);
DECLARE @VesselID INT = 6;

EXEC [SYNC_SP_DataSynchronizer_DataLog] '', '', '', @VesselID, 'EXEC [inf].[utils_inf_backup_table] ''qms.full_text_content''';

DECLARE curDoc CURSOR FOR
SELECT DISTINCT ftc.document_id
FROM qms.full_text_content ftc
INNER JOIN QMSdtlsFile_Log lf on lf.id = ftc.document_id
INNER JOIN QMS_DTL_Vessel_Assignment va ON va.Document_ID = lf.id
WHERE va.Active_Status = 1 AND lf.NodeType = 0 and lf.active_status = 1 and va.vessel_id = @VesselID;

OPEN curDoc;
FETCH NEXT FROM curDoc INTO @DocID;

WHILE @@FETCH_STATUS = 0
BEGIN
	EXEC [qms].[sp_sync_full_text_content] @DocID, @VesselID;

    FETCH NEXT FROM curDoc INTO @DocID;
END

CLOSE curDoc;
DEALLOCATE curDoc;

