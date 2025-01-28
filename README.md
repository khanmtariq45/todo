DECLARE @SQL_UPDATE NVARCHAR(MAX);
DECLARE @FilePath NVARCHAR(255);
DECLARE @FileId INT = 5727;
DECLARE @VesselID INT;
DECLARE @FileName NVARCHAR(255);

-- List of vessel IDs
DECLARE @VesselIDs TABLE (VesselID INT);
INSERT INTO @VesselIDs (VesselID) VALUES (4814), (4820), (4821), (4822), (4823), (4824), (4825), (4826), (4829), (4831), (4832), (4833), (4839), (4954);

-- Declare a cursor to iterate over the vessel IDs
DECLARE curVessel CURSOR FOR
SELECT VesselID FROM @VesselIDs;

OPEN curVessel;
FETCH NEXT FROM curVessel INTO @VesselID;

WHILE @@FETCH_STATUS = 0
BEGIN
    BEGIN TRY
	
	 -- Vessel Side Backup Script
		EXEC [SYNC_SP_DataSynchronizer_DataLog] '', '', '', @VesselID, 'EXEC [inf].[utils_inf_backup_table] ''QMSdtlsFile_Log''';
		EXEC [SYNC_SP_DataSynchronizer_DataLog] '', '', '', @VesselID, 'EXEC [inf].[utils_inf_backup_table] ''qms.full_text_content''';
	
		SELECT @FilePath = FilePath FROM QMSdtlsFile_Log WITH (NOLOCK) WHERE id = @FileId;
		
        -- Extract FileName from FilePath
        DECLARE @SlashIndex INT = CHARINDEX('/', REVERSE(@FilePath));
        SET @FileName = SUBSTRING(@FilePath, LEN(@FilePath) - @SlashIndex + 2, @SlashIndex + 1);
        EXEC SYNC_INS_DataLog_Attachments @FileName, @VesselID;

        -- Sync metadata for QMSdtlsFile_Log
        DECLARE @PkCondition VARCHAR(100) = 'ID=''' + CAST(@FileId AS VARCHAR) + '''';
        DECLARE @TableName VARCHAR(100) = 'QMSdtlsFile_Log';
        EXEC SYNC_SP_DataSynch_MultiPK_DataLog @TableName, @PkCondition, @VesselID;

         -- Check if the document exists in the full_text_content table and execute the synchronization procedure if it does
		IF EXISTS (SELECT 1 FROM qms.full_text_content WITH (NOLOCK) WHERE document_id = @FileId)
		BEGIN
			EXEC [qms].[sp_sync_full_text_content] @FileId, @VesselID;
		END;
		
    END TRY
    BEGIN CATCH
        PRINT 'Error processing document ID: ' + CAST(@FileId AS VARCHAR);
    END CATCH

    FETCH NEXT FROM curVessel INTO @VesselID;
END

CLOSE curVessel;
DEALLOCATE curVessel;
