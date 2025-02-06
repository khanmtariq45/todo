DECLARE @SQL_Script NVARCHAR(MAX) = 
N'DECLARE @DocID NVARCHAR(20);
DECLARE @VesselID INT = 6;

EXEC [SYNC_SP_DataSynchronizer_DataLog] '''', '''', '''', @VesselID, ''EXEC [inf].[utils_inf_backup_table] ''''qms.full_text_content'''' '';

DECLARE curDoc CURSOR FOR
SELECT DISTINCT ftc.document_id
FROM qms.full_text_content ftc
INNER JOIN QMSdtlsFile_Log lf ON lf.id = ftc.document_id
INNER JOIN QMS_DTL_Vessel_Assignment va ON va.Document_ID = lf.id
WHERE va.Active_Status = 1 AND lf.NodeType = 0 AND lf.active_status = 1 AND va.vessel_id = @VesselID;

OPEN curDoc;
FETCH NEXT FROM curDoc INTO @DocID;

WHILE @@FETCH_STATUS = 0
BEGIN
	EXEC [qms].[sp_sync_full_text_content] @DocID, @VesselID;
    FETCH NEXT FROM curDoc INTO @DocID;
END

CLOSE curDoc;
DEALLOCATE curDoc;';

EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'DB Change 979896: QMS_QC/Stage 2_QMS Main_3rd level approver approved the file directly and user can view the file, though approval is pending from 1st and 2nd approval', 
    'O', 
    @SQL_Script;