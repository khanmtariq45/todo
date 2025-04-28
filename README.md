import { MigrationUtilsService, eApplicationLocation } from "j2utils";
import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * @author Muhammad Tariq
 * @description updated QMS_FileVersionInfo table to remove IDENTITY from ID column
 * @impactedModules QMS
 * @approvedBy Zakhar
 * @environment ALL
 * @client All the clients
 * @sqlShipPR https://dev.azure.com/jibe-erp/JiBe/_git/sql-jibe-ship/pullrequest/142664
 * @class V3252212ProcurementAlterSpQMSFileVersionInfo1745824296808
 * @implements {MigrationInterface}
 */
export class V3252212ProcurementAlterSpQMSFileVersionInfo1745824296808 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const className = this.constructor.name;
    try {
      const application = await MigrationUtilsService.getApplicationLocation();
      if (application === eApplicationLocation.Vessel) {
        await queryRunner.startTransaction();
        try {
          // Check if table exists
          const QMS_FileVersionInfo_exists = await queryRunner.hasTable("QMS_FileVersionInfo");

            if (!QMS_FileVersionInfo_exists) {
                // Table does not exist, create it
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
                `);
                
            } else {

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

                 // Step 6: Make new ID column NOT NULL
                 await queryRunner.query(`
                    ALTER TABLE dbo.QMS_FileVersionInfo ALTER COLUMN ID INT NOT NULL;
                `);
    
                // Step 7: Recreate primary key
                await queryRunner.query(`
                    ALTER TABLE dbo.QMS_FileVersionInfo ADD CONSTRAINT PK_QMS_FileVersionInfo PRIMARY KEY CLUSTERED (ID ASC) WITH (FILLFACTOR = 80);
                `);
            }

          await queryRunner.commitTransaction();
        } catch (innerError) {
          await queryRunner.rollbackTransaction();
          throw innerError;
        }
      }

      await MigrationUtilsService.migrationLog(className, "", "S", "qms", "QMS_FileVersionInfo");
    } catch (error) {
      await MigrationUtilsService.migrationLog(className, error, "E", "qms", "QMS_FileVersionInfo", true);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
