I am getting this error in migration PR of nodejs


<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< Migration Started >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< Migration Error >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
QueryFailedError: TransactionError: Transaction has not begun. Call begin() first.
    at new QueryFailedError (C:\JIBEApps\J3App\node_modules\typeorm\error\QueryFailedError.js:11:28)
    at C:\JIBEApps\J3App\node_modules\typeorm\driver\sqlserver\SqlServerQueryRunner.js:232:61
    at C:\JIBEApps\J3App\node_modules\mssql\lib\base.js:1293:25
    at Immediate.<anonymous> (C:\JIBEApps\J3App\node_modules\mssql\lib\tedious.js:592:25)
    at processImmediate (node:internal/timers:468:21) {
  code: 'ENOTBEGUN',
  query: 'INSERT INTO "JiBEShip".."migrations"("timestamp", "name") VALUES (@0, @1)',
  parameters: [
    MssqlParameter { value: 1745824296808, type: 'bigint', params: [] },
    MssqlParameter {
      value: 'V3252212ProcurementAlterSpQMSFileVersionInfo1745824296808',
      type: 'varchar',
      params: []
    }
  ]
}
The migrations executed successfully
The migrations completed. Exiting the process.






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
          await queryRunner.query(`
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
            EXEC('ALTER TABLE dbo.QMS_FileVersionInfo ADD CONSTRAINT PK_QMS_FileVersionInfo PRIMARY KEY CLUSTERED (ID ASC) WITH (FILLFACTOR = 80);');
        END
          `);

          await queryRunner.commitTransaction();
        } catch (innerError) {
          await queryRunner.rollbackTransaction();
          await MigrationUtilsService.migrationLog(
            className,
            innerError,
            "E",
            "qms",
            "QMS_FileVersionInfo innerError",
            true
          );
        }
      }

      await MigrationUtilsService.migrationLog(className, "", "S", "qms", "QMS_FileVersionInfo");
    } catch (error) {
      await MigrationUtilsService.migrationLog(className, error, "E", "qms", "QMS_FileVersionInfo", true);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
