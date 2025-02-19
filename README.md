DECLARE @SQL_Script NVARCHAR(MAX);

 

SET @SQL_Script = N'

DECLARE @DocID NVARCHAR(20);

DECLARE @VesselID INT;

 

DECLARE curDoc CURSOR FOR

SELECT DISTINCT lf.id, va.vessel_ID

FROM QMSdtlsFile_Log lf with (nolock)

INNER JOIN QMS_DTL_Vessel_Assignment va ON va.Document_ID = lf.id

INNER JOIN qms_file_vessel_sync_ledger led ON led.vessel_assignment_id = va.id

INNER JOIN lib_vessels Vessel ON Vessel.Vessel_ID = va.Vessel_ID

WHERE va.Active_Status = 1 and vessel.installation = 1 and Vessel.active_status = 1

and vessel.autosync = 1 AND lf.NodeType = 0 AND led.status IN (''r'', ''f'', ''p'');

 

OPEN curDoc;

FETCH NEXT FROM curDoc INTO @DocID, @VesselID;

 

WHILE @@FETCH_STATUS = 0

BEGIN

Â Â Â  EXEC [SYNC_SP_DataSynchronizer_DataLog] '''', '''', '''', @VesselID, ''EXEC [inf].[utils_inf_backup_table] ''''QMSdtlsFile_Log'''''';

Â Â Â  EXEC [SYNC_SP_DataSynchronizer_DataLog] '''', '''', '''', @VesselID, ''EXEC [inf].[utils_inf_backup_table] ''''qms.full_text_content'''''';

 

Â Â Â  DECLARE @PkCondition VARCHAR(100) = ''ID='''''' + CAST(@DocID AS VARCHAR) + '''''''';

Â Â Â  DECLARE @TableName VARCHAR(100) = ''QMSdtlsFile_Log'';

Â Â Â  EXEC SYNC_SP_DataSynch_MultiPK_DataLog @TableName, @PkCondition, @VesselID;

 

Â Â Â  IF EXISTS (SELECT 1 FROM qms.full_text_content WITH (NOLOCK) WHERE document_id = @DocID)

Â Â Â  BEGIN

Â Â Â Â Â Â Â  EXEC [qms].[sp_sync_full_text_content] @DocID, @VesselID;

Â Â Â  END;

 

Â Â Â  FETCH NEXT FROM curDoc INTO @DocID, @VesselID;

END

 

CLOSE curDoc;

DEALLOCATE curDoc;

';

 

 

select @SQL_Script

EXEC [inf].[register_script_for_execution]

Â Â Â  'QMS',

Â Â Â  'QMS_Document',

Â Â Â  'DB Change 987757: Bug 979219: OSG - Multiple Vessels - In QMS, files were not sync to Vessels.',

Â Â Â  'O',

Â Â Â  @SQL_Script;
