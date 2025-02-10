DECLARE @SQL_Script NVARCHAR(MAX);

SET @SQL_Script = N'
DECLARE @DocID NVARCHAR(20);
DECLARE @VesselID INT;
DECLARE @FilePath VARCHAR(250);
DECLARE @FileName VARCHAR(50);

-- Backup qms_file_vessel_sync_ledger table
EXEC [inf].[utils_inf_backup_table] ''qms_file_vessel_sync_ledger'';

-- Update qms_file_vessel_sync_ledger table
UPDATE ledg
SET ledg.retry_count = 0,
    ledg.status = ''p'',
    ledg.source = ''s'',
    ledg.date_of_modification = GETDATE(),
    ledg.last_sync_time = NULL,
    ledg.verification_request_last_sent_date = NULL,
    ledg.verification_request_retry_count = 0,
    ledg.metadata_sync_verified = NULL,
    ledg.file_sync_verified = NULL,
    ledg.last_error_message = NULL
FROM QMS_DTL_Vessel_Assignment va
INNER JOIN qms_file_vessel_sync_ledger ledg ON ledg.vessel_assignment_id = va.ID
INNER JOIN lib_vessels Vessel ON Vessel.Vessel_ID = va.Vessel_ID
WHERE Vessel.Active_Status = 1 
  AND va.Active_Status = 1;

-- Cursor for document synchronization
DECLARE curDoc CURSOR FOR
SELECT DISTINCT lf.id, va.vessel_ID 
FROM QMSdtlsFile_Log lf
INNER JOIN QMS_DTL_Vessel_Assignment va ON va.Document_ID = lf.id
INNER JOIN qms_file_vessel_sync_ledger led ON led.vessel_assignment_id = va.id
WHERE va.Active_Status = 1 AND lf.NodeType = 0 AND led.status IN (''r'', ''f'', ''p'');

OPEN curDoc;
FETCH NEXT FROM curDoc INTO @DocID, @VesselID;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Document synchronization logic
    EXEC [SYNC_SP_DataSynchronizer_DataLog] '''', '''', '''', @VesselID, ''EXEC [inf].[utils_inf_backup_table] ''''QMSdtlsFile_Log'''''';
    EXEC [SYNC_SP_DataSynchronizer_DataLog] '''', '''', '''', @VesselID, ''EXEC [inf].[utils_inf_backup_table] ''''qms.full_text_content'''''';

    DECLARE @PkCondition VARCHAR(100) = ''ID='''''' + CAST(@DocID AS VARCHAR) + '''''''';
    DECLARE @TableName VARCHAR(100) = ''QMSdtlsFile_Log'';
    EXEC SYNC_SP_DataSynch_MultiPK_DataLog @TableName, @PkCondition, @VesselID;

    IF EXISTS (SELECT 1 FROM qms.full_text_content WITH (NOLOCK) WHERE document_id = @DocID)
    BEGIN
        EXEC [qms].[sp_sync_full_text_content] @DocID, @VesselID;
    END;

    FETCH NEXT FROM curDoc INTO @DocID, @VesselID;
END

CLOSE curDoc;
DEALLOCATE curDoc;

-- Cursor for file attachment synchronization
DECLARE SyncList CURSOR FOR
SELECT DISTINCT lf.filePath, va.vessel_ID 
FROM QMSdtlsFile_Log lf
INNER JOIN QMS_DTL_Vessel_Assignment va ON va.Document_ID = lf.id
INNER JOIN qms_file_vessel_sync_ledger led ON led.vessel_assignment_id = va.id
WHERE va.Active_Status = 1 AND lf.NodeType = 0 AND led.status IN (''r'', ''f'', ''p'');

OPEN SyncList;
FETCH NEXT FROM SyncList INTO @FilePath, @VesselID;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- File attachment synchronization logic
    DECLARE @SlashIndex INT = CHARINDEX(''/'', REVERSE(@FilePath));
    SET @FileName = SUBSTRING(@FilePath, LEN(@FilePath) - @SlashIndex + 2, @SlashIndex + 1);
    EXEC SYNC_INS_DataLog_Attachments @FileName, @VesselID;

    FETCH NEXT FROM SyncList INTO @FilePath, @VesselID;
END

CLOSE SyncList;
DEALLOCATE SyncList;
';

-- Register the combined script for execution
EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'DB Change 987695: CST - Multiple Vessels - In QMS files were not sync to Vessels.', 
    'O', 
    @SQL_Script;