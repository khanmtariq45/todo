import { MigrationUtilsService, eApplicationLocation } from "j2utils";
import { MigrationInterface, QueryRunner } from "typeorm";

export class V3252133_RemoveIdentityFromQMSFileVersionInfo1680000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const className = this.constructor.name;
    try {
      const application = await MigrationUtilsService.getApplicationLocation();
      if (application === eApplicationLocation.Vessel) {
        await queryRunner.startTransaction();
        try {
          // Check if table exists
          const tableCheck = await queryRunner.query(`
            SELECT OBJECT_ID('dbo.QMS_FileVersionInfo', 'U') AS TableId
          `);

          const tableExists = tableCheck[0]?.TableId !== null;

          if (tableExists) {
            // Table exists, proceed with IDENTITY removal
            // Step 1: Add new column without IDENTITY
            await queryRunner.query(`
              ALTER TABLE dbo.QMS_FileVersionInfo ADD ID_temp INT NULL;
            `);

            // Step 2: Copy old ID values
            await queryRunner.query(`
              UPDATE dbo.QMS_FileVersionInfo SET ID_temp = ID;
            `);

            // Step 3: Drop primary key constraint
            await queryRunner.query(`
              ALTER TABLE dbo.QMS_FileVersionInfo DROP CONSTRAINT PK_QMS_FileVersionInfo;
            `);

            // Step 4: Drop old ID column
            await queryRunner.query(`
              ALTER TABLE dbo.QMS_FileVersionInfo DROP COLUMN ID;
            `);

            // Step 5: Rename new column
            await queryRunner.query(`
              EXEC sp_rename 'dbo.QMS_FileVersionInfo.ID_temp', 'ID', 'COLUMN';
            `);

            // Step 6: Recreate primary key
            await queryRunner.query(`
              ALTER TABLE dbo.QMS_FileVersionInfo ADD CONSTRAINT PK_QMS_FileVersionInfo PRIMARY KEY CLUSTERED (ID ASC) WITH (FILLFACTOR = 80);
            `);
          } else {
            // Table does not exist, create it freshly without IDENTITY
            await queryRunner.query(`
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

              CREATE NONCLUSTERED INDEX IX_QMS_FILEVERSIONINFO__IS_INDEXED_FILEID_VERSION
              ON QMS_FILEVERSIONINFO(is_indexed, fileId, version);
            `);
          }

          await queryRunner.commitTransaction();
        } catch (innerError) {
          await queryRunner.rollbackTransaction();
          throw innerError;
        }
      }

      await MigrationUtilsService.migrationLog(className, "", "S", "qms", "RemoveIdentityOrCreateQMSFileVersionInfo");
    } catch (error) {
      await MigrationUtilsService.migrationLog(className, error, "E", "qms", "RemoveIdentityOrCreateQMSFileVersionInfo", true);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Leaving down() empty because undoing this type of change is complex
  }
}