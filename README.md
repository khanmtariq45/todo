CREATE PROCEDURE [dbo].[SP_GenericDataSynchronizer]
    @VesselIDs NVARCHAR(MAX),  -- Comma-separated Vessel IDs
    @FileIDs NVARCHAR(MAX)     -- Comma-separated File IDs
AS
BEGIN
    SET NOCOUNT ON;

    -- Table variables to hold VesselIDs and FileIDs
    DECLARE @VesselIDTable TABLE (VesselID INT);
    DECLARE @FileIDTable TABLE (FileID INT);

    -- Split VesselIDs into the table
    INSERT INTO @VesselIDTable (VesselID)
    SELECT VALUE
    FROM STRING_SPLIT(@VesselIDs, ',');

    -- Split FileIDs into the table
    INSERT INTO @FileIDTable (FileID)
    SELECT VALUE
    FROM STRING_SPLIT(@FileIDs, ',');

    -- Declare variables for processing
    DECLARE @VesselID INT;
    DECLARE @FileID INT;
    DECLARE @FilePath NVARCHAR(255);
    DECLARE @FileName NVARCHAR(255);

    -- Cursor to process VesselIDs
    DECLARE curVessel CURSOR FOR
    SELECT VesselID FROM @VesselIDTable;

    OPEN curVessel;
    FETCH NEXT FROM curVessel INTO @VesselID;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Cursor to process FileIDs for each VesselID
        DECLARE curFile CURSOR FOR
        SELECT FileID FROM @FileIDTable;

        OPEN curFile;
        FETCH NEXT FROM curFile INTO @FileID;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            BEGIN TRY
                -- Vessel Side Backup Scripts
                EXEC [SYNC_SP_DataSynchronizer_DataLog] '', '', '', @VesselID, 'EXEC [inf].[utils_inf_backup_table] ''QMSdtlsFile_Log''';
                EXEC [SYNC_SP_DataSynchronizer_DataLog] '', '', '', @VesselID, 'EXEC [inf].[utils_inf_backup_table] ''qms.full_text_content''';

                -- Fetch FilePath
                SELECT @FilePath = FilePath FROM QMSdtlsFile_Log WITH (NOLOCK) WHERE id = @FileID;

                -- Extract FileName
                DECLARE @SlashIndex INT = CHARINDEX('/', REVERSE(@FilePath));
                SET @FileName = SUBSTRING(@FilePath, LEN(@FilePath) - @SlashIndex + 2, @SlashIndex + 1);
                EXEC SYNC_INS_DataLog_Attachments @FileName, @VesselID;

                -- Sync Metadata for QMSdtlsFile_Log
                DECLARE @PkCondition NVARCHAR(100) = 'ID=''' + CAST(@FileID AS NVARCHAR) + '''';
                EXEC SYNC_SP_DataSynch_MultiPK_DataLog 'QMSdtlsFile_Log', @PkCondition, @VesselID;

                -- Check and Sync qms.full_text_content
                IF EXISTS (SELECT 1 FROM qms.full_text_content WITH (NOLOCK) WHERE document_id = @FileID)
                BEGIN
                    EXEC [qms].[sp_sync_full_text_content] @FileID, @VesselID;
                END;
            END TRY
            BEGIN CATCH
                -- Log or handle errors as needed
                PRINT 'Error processing VesselID: ' + CAST(@VesselID AS NVARCHAR) + ' with FileID: ' + CAST(@FileID AS NVARCHAR);
            END CATCH;

            FETCH NEXT FROM curFile INTO @FileID;
        END

        CLOSE curFile;
        DEALLOCATE curFile;

        FETCH NEXT FROM curVessel INTO @VesselID;
    END

    CLOSE curVessel;
    DEALLOCATE curVessel;

    SET NOCOUNT OFF;
END