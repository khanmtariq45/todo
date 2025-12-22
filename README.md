CREATE OR ALTER PROCEDURE [dbo].[FMS_SP_Sync_VerifyToVessel] 
    @Sync_Log_ID INT,
    @File_Id INT,
	@Status_ID INT,
	@Schedule_ID INT,
    @Version INT,
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        DECLARE @Uid UNIQUEIDENTIFIER, 
                @schedule_from DATETIMEOFFSET = GETDATE() - 30, 
                @schedule_to DATETIMEOFFSET = GETDATE() + 30, 
                @batchCommands VARCHAR(MAX), 
                @vesselId INT, 
                @documentName VARCHAR(200),
                @ScheduleExists BIT = 0,
                @StatusExists BIT = 0;

        -- Get vessel ID
        SELECT @vesselId = VESSEL_ID
        FROM LIB_VESSELS WITH (NOLOCK)
        WHERE active_status = 1 AND installation = 1;

        -- Check if Schedule exists on office side
        IF (@Schedule_ID IS NOT NULL)
        BEGIN
            IF EXISTS (SELECT 1 FROM FMS_DTL_Schedule WITH (NOLOCK) 
                       WHERE Schedule_ID = @Schedule_ID AND active_status = 1)
                SET @ScheduleExists = 1;
        END

        -- Check if Schedule Status exists on office side
        IF (@Status_ID IS NOT NULL)
        BEGIN
            IF EXISTS (SELECT 1 FROM FMS_DTL_Schedule_Status WITH (NOLOCK) 
                       WHERE Status_ID = @Status_ID AND active_status = 1)
                SET @StatusExists = 1;
        END

        -- Get document name from FMS file table
        SELECT @documentName = REPLACE(RIGHT(FilePath, (CHARINDEX('/', REVERSE(FilePath), 1))), '/', '')
        FROM FMS_DTL_File WITH (NOLOCK)
        WHERE ID = @File_Id AND [Version] = @Version
            AND active_status = 1;

        -- If document not found, mark for retry
        IF (@documentName IS NULL)
        BEGIN
            DECLARE @query VARCHAR(500) = FORMATMESSAGE(
                'UPDATE FMS_DTL_Schedule_Status_SyncLog SET Status = ''%s'', Metadata_Sync_Verified = %i, File_Sync_Verified = %i, Schedule_Sync_Verified = %i, Schedule_Status_Sync_Verified = %i WHERE Sync_Log_ID = %i',
                'r', 0, 0, @ScheduleExists, @StatusExists, @Sync_Log_ID
            );
            
            EXEC [SYNC_SP_DataSynchronizer_DataLog] '', '', '', @vesselId, @query;
        END
        ELSE
        BEGIN
            -- Create batch command to verify file exists on vessel and update sync status
            SET @batchCommands = 'START /B "FMS Sync Validation" cmd /c "set FILEEXIST=0 & (IF exist C:\\JIBEApps\\App\\Uploads\\FMS\\DOCUMENTS\\' + 
                CAST(@documentName AS VARCHAR(350)) + 
                ' ( set FILEEXIST=1 )) & (sqlcmd -S "localhost\jibeexpress" -U JIBE_SHIP -P "J^%5x@gklj551^^" -d jibeship -Q "DECLARE @opVarchar varchar(max), @Vessel_ID int, @Sync_Log_ID int = ' + 
                CAST(@Sync_Log_ID AS VARCHAR(50)) + ', @ScheduleExists bit = ' + CAST(@ScheduleExists AS VARCHAR(1)) + ', @StatusExists bit = ' + CAST(@StatusExists AS VARCHAR(1)) + '; ' +
                'SELECT TOP 1 @Vessel_ID = Vessel_id FROM lib_vessels WHERE active_status = 1 AND installation = 1; ' +
                'SET @opVarchar = ''UPDATE FMS_DTL_Schedule_Status_SyncLog SET Status = case when $(FILEEXIST) = 0' +
                CASE WHEN @Schedule_ID IS NOT NULL THEN ' OR @ScheduleExists = 0' ELSE '' END +
                CASE WHEN @Status_ID IS NOT NULL THEN ' OR @StatusExists = 0' ELSE '' END +
                ' then ''''r'''' else ''''c'''' end, ' +
                'Metadata_Sync_Verified = 1, File_Sync_Verified = $(FILEEXIST), ' +
                'Schedule_Sync_Verified = @ScheduleExists, ' +
                'Schedule_Status_Sync_Verified = @StatusExists, ' +
                'Modified_By = 1, Date_Of_Modification = GETDATE() WHERE Sync_Log_ID = @Sync_Log_ID''; ' +
                'EXEC [SYNC_SP_DataSynchronizer_DataLog] '''','''','''',@Vessel_ID,@opVarchar")"  & exit 0';
            
            SET @Uid = NEWID();
            
            INSERT INTO inf_vessel_app_maintanance(
                uid, 
                vessel_id, 
                schedule_from, 
                schedule_to, 
                batch_status, 
                command_line,
                created_by, 
                date_of_creation, 
                active_status, 
                is_server, 
                is_client, 
                is_force
            )
            VALUES(
                @Uid, 
                @vesselId, 
                @schedule_from, 
                @schedule_to, 
                'P', 
                @batchCommands,
                1, 
                GETDATE(), 
                1, 
                1, 
                0, 
                0
            );

		END
    END TRY
    BEGIN CATCH
        -- Log error details
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH

END
