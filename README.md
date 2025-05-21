Msg 1750, Level 16, State 1, Line 1
Could not create constraint or index. See previous errors.
Msg 1101, Level 17, State 1, Line 1
Could not allocate a new page for database 'JiBEShip' because of insufficient disk space in filegroup 'PRIMARY'. Create the necessary space by dropping objects in the filegroup, adding additional files to the filegroup, or setting autogrowth on for existing files in the filegroup.

 BEGIN TRY
              BEGIN TRANSACTION;
             IF NOT EXISTS (
            SELECT * FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'QMS_FileVersionInfo' AND TABLE_SCHEMA = 'dbo'
        )
        BEGIN
            CREATE TABLE [dbo].[QMS_FileVersionInfo] (
                [ID] INT NOT NULL,
                [FileID] INT NULL,
                [Version] INT NULL,
                [FilePath] VARCHAR(MAX) NULL,
                [Created_By] INT NOT NULL,
                [Date_Of_Creatation] DATETIME NOT NULL,
                [Modified_By] INT NULL,
                [Date_Of_Modification] DATETIME NULL,
                [Deleted_By] INT NULL,
                [Date_Of_Deletion] DATETIME NULL,
                [Active_Status] BIT CONSTRAINT [DF_QMS_FileVersionInfo_Active_Status] DEFAULT ((1)) NOT NULL,
                [Is_Indexed] BIT DEFAULT ((0)) NOT NULL,
                [indexing_last_retry_time] DATETIME NULL,
                CONSTRAINT [PK_QMS_FileVersionInfo] PRIMARY KEY CLUSTERED ([ID] ASC) WITH (FILLFACTOR = 80)
            );
        END
        ELSE
        BEGIN
            -- Add ID_temp column if it doesn't exist
            IF NOT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'QMS_FileVersionInfo' AND COLUMN_NAME = 'ID_temp'
            )
            BEGIN
                EXEC('ALTER TABLE dbo.QMS_FileVersionInfo ADD ID_temp INT NULL;');
            END

            -- Copy values from ID to ID_temp
            EXEC('UPDATE dbo.QMS_FileVersionInfo SET ID_temp = ID;');

            -- Drop existing primary key constraint
            EXEC('ALTER TABLE dbo.QMS_FileVersionInfo DROP CONSTRAINT PK_QMS_FileVersionInfo;');

            -- Drop original ID column
            EXEC('ALTER TABLE dbo.QMS_FileVersionInfo DROP COLUMN ID;');

            -- Rename ID_temp to ID
            EXEC('EXEC sp_rename ''dbo.QMS_FileVersionInfo.ID_temp'', ''ID'', ''COLUMN'';');

            -- Alter ID to NOT NULL
            EXEC('ALTER TABLE dbo.QMS_FileVersionInfo ALTER COLUMN ID INT NOT NULL;');

            -- Re-add primary key constraint
            EXEC('ALTER TABLE dbo.QMS_FileVersionInfo ADD CONSTRAINT PK_QMS_FileVersionInfo PRIMARY KEY (ID ASC) WITH (FILLFACTOR = 80);');
        END
              COMMIT TRANSACTION;
            END TRY
            BEGIN CATCH
              ROLLBACK TRANSACTION;
              THROW;
            END CATCH
