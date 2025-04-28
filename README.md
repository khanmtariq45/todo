import { MigrationUtilsService, eApplicationLocation } from "j2utils";
import { MigrationInterface, QueryRunner } from "typeorm";

export class V3252133_RemoveIdentityFromQMSFileVersionInfo1680000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const className = this.constructor.name;
    try {
      let application = await MigrationUtilsService.getApplicationLocation();
      if (application === eApplicationLocation.Vessel) {
        await queryRunner.startTransaction();
        try {
          // Step 1: Drop foreign key constraints if any (you must handle manually if referenced)
          
          // Step 2: Create a new column without identity
          await queryRunner.query(`
            ALTER TABLE dbo.QMS_FileVersionInfo ADD ID_temp INT NULL;
          `);

          // Step 3: Copy the ID values
          await queryRunner.query(`
            UPDATE dbo.QMS_FileVersionInfo SET ID_temp = ID;
          `);

          // Step 4: Drop the primary key constraint
          await queryRunner.query(`
            ALTER TABLE dbo.QMS_FileVersionInfo DROP CONSTRAINT PK_QMS_FileVersionInfo;
          `);

          // Step 5: Drop the old ID column
          await queryRunner.query(`
            ALTER TABLE dbo.QMS_FileVersionInfo DROP COLUMN ID;
          `);

          // Step 6: Rename the new column to ID
          await queryRunner.query(`
            EXEC sp_rename 'dbo.QMS_FileVersionInfo.ID_temp', 'ID', 'COLUMN';
          `);

          // Step 7: Recreate the primary key
          await queryRunner.query(`
            ALTER TABLE dbo.QMS_FileVersionInfo ADD CONSTRAINT PK_QMS_FileVersionInfo PRIMARY KEY CLUSTERED (ID ASC) WITH (FILLFACTOR = 80);
          `);

          await queryRunner.commitTransaction();
        } catch (innerError) {
          await queryRunner.rollbackTransaction();
          throw innerError;
        }
      }

      await MigrationUtilsService.migrationLog(className, "", "S", "qms", "RemoveIdentityFromQMSFileVersionInfo");
    } catch (error) {
      await MigrationUtilsService.migrationLog(className, error, "E", "qms", "RemoveIdentityFromQMSFileVersionInfo", true);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Usually, reverting this kind of change is very complex, so down migration can be left empty
  }
}