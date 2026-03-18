DECLARE @SqlScript NVARCHAR(MAX) = '
CREATE OR ALTER PROCEDURE [dbo].[FMS_Sync_VerifyToVessel] 
    @Sync_Log_ID INT,
    @File_ID INT,
    @Schedule_ID INT,
    @Status_ID INT = NULL,
    @Version INT
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

        SELECT TOP 1 @vesselId = VESSEL_ID
        FROM dbo.LIB_VESSELS WITH (NOLOCK)
        WHERE active_status = 1 
          AND installation = 1;

        IF @Schedule_ID IS NOT NULL
        BEGIN
            SET @ScheduleExists = CASE 
                WHEN EXISTS (
                    SELECT 1 
                    FROM dbo.FMS_DTL_Schedule WITH (NOLOCK)
                    WHERE Schedule_ID = @Schedule_ID 
                      AND active_status = 1
                ) THEN 1 ELSE 0 END;
        END

        IF @Status_ID IS NOT NULL
        BEGIN
            SET @StatusExists = CASE 
                WHEN EXISTS (
                    SELECT 1 
                    FROM dbo.FMS_DTL_Schedule_Status WITH (NOLOCK)
                    WHERE Status_ID = @Status_ID
                      AND Active_Status = 1
                ) THEN 1 ELSE 0 END;
        END
        ELSE
            SET @StatusExists = 1;

        SELECT TOP 1
            @documentName = CASE 
                WHEN CHARINDEX(''/'', REVERSE(FilePath)) > 0 
                THEN RIGHT(FilePath, CHARINDEX(''/'', REVERSE(FilePath)) - 1)
                ELSE FilePath
            END
        FROM dbo.FMS_DTL_File WITH (NOLOCK)
        WHERE ID = @File_ID 
          AND [Version] = @Version
          AND active_status = 1;

        DECLARE @isJ3FMSEnabled BIT = 0, @docPath VARCHAR(100);
        
        SELECT @isJ3FMSEnabled = 1
        FROM inf_lib_configuration WITH (NOLOCK)
        WHERE [key] = ''isJ3FMSEnabled'' 
          AND active_status = 1 
          AND [value] = 1;
        
        IF @isJ3FMSEnabled = 0
            SET @docPath = ''C:\\JIBEApps\\App\\Uploads\\FMSL\\'';
        ELSE
            SET @docPath = ''C:\\JIBEApps\\Uploads\\FMS\\FMSL\\'';

        IF (@documentName IS NULL)
        BEGIN
            DECLARE @query VARCHAR(1000) = FORMATMESSAGE(
                ''UPDATE FMS_DTL_Schedule_Status_SyncLog 
                  SET Status = ''''%s'''',
                      Metadata_Sync_Verified = %i,
                      File_Sync_Verified = %i,
                      Schedule_Sync_Verified = %i,
                      Status_Sync_Verified = %i
                  WHERE Sync_Log_ID = %i'',
                ''r'', 0, 0, CAST(@ScheduleExists AS INT), @StatusExists, @Sync_Log_ID
            );

            EXEC [SYNC_SP_DataSynchronizer_DataLog] '''', '''', '''', @vesselId, @query;
        END
        ELSE
        BEGIN
            SET @batchCommands = 
            ''START /B "QMS Validation" cmd /c "set FILEEXIST=0 & 
            (IF exist '' + @docPath + cast(@documentName as varchar(350)) + '' ( set FILEEXIST=1 )) & 
            (sqlcmd -S "localhost\\jibeexpress" -U JIBE_SHIP -P "J^%5x@gklj551^^" -d jibeship 
            -v FILEEXIST=%FILEEXIST% 
            -Q "DECLARE @opVarchar varchar(max), @Vessel_ID int; 
                select top 1 @Vessel_ID = Vessel_id from lib_vessels where active_status = 1 and installation = 1; 
                DECLARE @Sync_Log_ID int = '' + cast(@Sync_Log_ID as varchar(50)) + '', 
                        @version int = '' + cast(@Version as varchar(50)) + '';
                SET @opVarchar = ''''update FMS_DTL_Schedule_Status_SyncLog 
                SET Status = case when $(FILEEXIST)=1 AND '' + CAST(@ScheduleExists AS VARCHAR(1)) + ''=1 AND '' + CAST(@StatusExists AS VARCHAR(1)) + ''=1 
                                  then ''''''c'''''' else ''''''r'''''' end,
                    Metadata_Sync_Verified = 1,
                    File_Sync_Verified = $(FILEEXIST),
                    Schedule_Sync_Verified = '' + CAST(@ScheduleExists AS VARCHAR(1)) + '',
                    Status_Sync_Verified = '' + CAST(@StatusExists AS VARCHAR(1)) + ''
                where Sync_Log_ID = '''' + cast(@Sync_Log_ID as varchar(50)) + '''' 
                  and Version = '''' + cast(@Version as varchar(50)) + '''';
                exec [SYNC_SP_DataSynchronizer_DataLog] '''''','''''','''''',@Vessel_ID,@opVarchar" )" & exit 0'';

            SET @Uid = NEWID();

            INSERT INTO inf_vessel_app_maintanance(
                uid, vessel_id, schedule_from, schedule_to,
                batch_status, command_line,
                created_by, date_of_creation,
                active_status, is_server, is_client, is_force
            )
            VALUES(
                @Uid, @vesselId, @schedule_from, @schedule_to,
                ''P'', @batchCommands,
                1, GETDATE(),
                1, 1, 0, 0
            );
        END
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        DECLARE @param VARCHAR(MAX) = CONCAT(
            ''@Sync_Log_ID='', CONVERT(VARCHAR(500), @Sync_Log_ID),
            '',@File_ID='', CONVERT(VARCHAR(500), @File_ID),
            '',@Schedule_ID='', CONVERT(VARCHAR(500), @Schedule_ID),
            '',@Status_ID='', CONVERT(VARCHAR(500), @Status_ID),
            '',@Version='', CONVERT(VARCHAR(500), @Version)
        );

        DECLARE @logMessage VARCHAR(MAX) = CONCAT(
            ''Failed! ErrorMessage:'', @ErrorMessage,
            '', ErrorSeverity:'', @ErrorSeverity,
            '', ErrorState:'', @ErrorState,
            '', parameters:-'', @param
        );

        EXEC [dbo].[inf_log_write] 
            ''sync'', NULL, ''FMS_Sync_VerifyToVessel'', 0,
            ''Exception occurred in SP'', @logMessage, ''sql'', 1, 0;

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
';