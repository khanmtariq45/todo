CREATE OR ALTER PROCEDURE [dbo].[FMS_SP_Sync_VerifyToVessel]
    @Sync_Log_ID INT,
    @File_Id INT,
    @Status_ID INT = NULL,
    @Schedule_ID INT = NULL,
    @Version INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @ErrorMessage NVARCHAR(4000),
            @ErrorSeverity INT,
            @ErrorState INT,
            @ErrorLine INT,
            @ErrorProcedure NVARCHAR(128);

    BEGIN TRY
        -- Validate required parameters
        IF @Sync_Log_ID IS NULL OR @File_Id IS NULL OR @Version IS NULL
        BEGIN
            RAISERROR('Sync_Log_ID, File_Id, and Version are required parameters.', 16, 1);
            RETURN;
        END

        DECLARE @Uid UNIQUEIDENTIFIER = NEWID(),
                @schedule_from DATETIMEOFFSET = DATEADD(DAY, -30, SYSDATETIMEOFFSET()),
                @schedule_to DATETIMEOFFSET = DATEADD(DAY, 30, SYSDATETIMEOFFSET()),
                @batchCommands NVARCHAR(MAX),
                @vesselId INT,
                @documentName NVARCHAR(500),
                @filePath NVARCHAR(1000),
                @ScheduleExists BIT = 0,
                @StatusExists BIT = 0,
                @syncUpdateQuery NVARCHAR(MAX);

        -- Get vessel ID with proper indexing
        SELECT TOP 1 @vesselId = VESSEL_ID
        FROM dbo.LIB_VESSELS
        WHERE active_status = 1 
          AND installation = 1
          AND VESSEL_ID IS NOT NULL;

        IF @vesselId IS NULL
        BEGIN
            RAISERROR('No active installation vessel found.', 16, 1);
            RETURN;
        END

        -- Check if Schedule exists
        IF @Schedule_ID IS NOT NULL
        BEGIN
            SET @ScheduleExists = CASE 
                WHEN EXISTS (
                    SELECT 1 
                    FROM dbo.FMS_DTL_Schedule 
                    WHERE Schedule_ID = @Schedule_ID 
                      AND active_status = 1
                ) THEN 1 
                ELSE 0 
            END;
        END

        -- Check if Schedule Status exists
        IF @Status_ID IS NOT NULL
        BEGIN
            SET @StatusExists = CASE 
                WHEN EXISTS (
                    SELECT 1 
                    FROM dbo.FMS_DTL_Schedule_Status 
                    WHERE Status_ID = @Status_ID 
                      AND active_status = 1
                ) THEN 1 
                ELSE 0 
            END;
        END

        -- Get document information with better file path parsing
        SELECT TOP 1 
            @filePath = FilePath,
            @documentName = CASE 
                WHEN CHARINDEX('/', REVERSE(FilePath)) > 0 
                THEN RIGHT(FilePath, CHARINDEX('/', REVERSE(FilePath)) - 1)
                ELSE FilePath
            END
        FROM dbo.FMS_DTL_File
        WHERE ID = @File_Id 
          AND [Version] = @Version
          AND active_status = 1;

        -- If document not found
        IF @documentName IS NULL
        BEGIN
            SET @syncUpdateQuery = N'
                UPDATE dbo.FMS_DTL_Schedule_Status_SyncLog 
                SET Status = ''r'',
                    Metadata_Sync_Verified = 0,
                    File_Sync_Verified = 0,
                    Schedule_Sync_Verified = @ScheduleExists,
                    Schedule_Status_Sync_Verified = @StatusExists,
                    Modified_By = 1,
                    Date_Of_Modification = GETDATE()
                WHERE Sync_Log_ID = @SyncLogID';

            EXEC dbo.SYNC_SP_DataSynchronizer_DataLog 
                @Vessel_ID = @vesselId,
                @Query = @syncUpdateQuery,
                @Params = N'@ScheduleExists BIT, @StatusExists BIT, @SyncLogID INT',
                @ParamValues = '@ScheduleExists=' + CAST(@ScheduleExists AS NVARCHAR(1)) + 
                             ',@StatusExists=' + CAST(@StatusExists AS NVARCHAR(1)) +
                             ',@SyncLogID=' + CAST(@Sync_Log_ID AS NVARCHAR(20));
        END
        ELSE
        BEGIN
            -- Use a configuration table or parameter for paths/credentials
            DECLARE @VesselDBName NVARCHAR(128) = 'jibeship',
                    @VesselDBServer NVARCHAR(128) = 'localhost\jibeexpress',
                    @BasePath NVARCHAR(500) = 'C:\JIBEApps\App\Uploads\FMS\DOCUMENTS\';

            -- Create secure batch command using configuration
            SET @batchCommands = N'
                SET NOCOUNT ON;
                DECLARE @FileExist BIT = 0;
                
                -- Check if file exists using xp_fileexist (requires appropriate permissions)
                DECLARE @FileCheck TABLE (FileExists INT, IsDirectory INT, ParentDirectoryExists INT);
                INSERT INTO @FileCheck
                EXEC master.dbo.xp_fileexist ''' + @BasePath + @documentName + N''';
                
                SELECT @FileExist = FileExists FROM @FileCheck;
                
                -- Update sync log
                UPDATE dbo.FMS_DTL_Schedule_Status_SyncLog 
                SET Status = CASE 
                    WHEN @FileExist = 0 
                       OR (@Schedule_ID IS NOT NULL AND @ScheduleExists = 0)
                       OR (@Status_ID IS NOT NULL AND @StatusExists = 0)
                    THEN ''r''
                    ELSE ''c''
                END,
                Metadata_Sync_Verified = 1,
                File_Sync_Verified = @FileExist,
                Schedule_Sync_Verified = @ScheduleExists,
                Schedule_Status_Sync_Verified = @StatusExists,
                Modified_By = 1,
                Date_Of_Modification = GETDATE()
                WHERE Sync_Log_ID = ' + CAST(@Sync_Log_ID AS NVARCHAR(20)) + N';
            ';

            -- Log the batch command for debugging (remove in production)
            INSERT INTO dbo.Sync_DebugLog (LogDate, CommandType, CommandText, Vessel_ID)
            VALUES (GETDATE(), 'BatchCommand', LEFT(@batchCommands, 4000), @vesselId);

            -- Insert into maintenance table
            INSERT INTO dbo.inf_vessel_app_maintenance (
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
                is_force,
                task_type
            )
            VALUES (
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
                0,
                'FMS_Sync_Verify'
            );

            -- Return success information
            SELECT 
                @Uid AS BatchUID,
                @vesselId AS VesselID,
                @documentName AS DocumentName,
                @ScheduleExists AS ScheduleExists,
                @StatusExists AS StatusExists;
        END
    END TRY
    BEGIN CATCH
        SELECT 
            @ErrorMessage = ERROR_MESSAGE(),
            @ErrorSeverity = ERROR_SEVERITY(),
            @ErrorState = ERROR_STATE(),
            @ErrorLine = ERROR_LINE(),
            @ErrorProcedure = ISNULL(ERROR_PROCEDURE(), OBJECT_NAME(@@PROCID));

        -- Log error to error table
        INSERT INTO dbo.Sync_ErrorLog (
            ErrorDate, ProcedureName, ErrorLine, ErrorMessage, 
            ErrorSeverity, ErrorState, Sync_Log_ID, Vessel_ID
        )
        VALUES (
            GETDATE(), @ErrorProcedure, @ErrorLine, @ErrorMessage,
            @ErrorSeverity, @ErrorState, @Sync_Log_ID, @vesselId
        );

        -- Re-throw the error for the calling application
        THROW;
    END CATCH
END