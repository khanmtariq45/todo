{
    "Execution_date": "2025-09-05T04:24:46.607Z",
    "Module_Code": "jms",
    "Vessel_id": 733,
    "status": "E",
    "log": "QueryFailedError: Error: Incorrect syntax near the keyword \"with\". If this statement is a common table expression, an xmlnamespaces clause or a change tracking context clause, the previous statement must be terminated with a semicolon.",
    "Function_Code": "JMS_Get_Safety_Observation_Process",
    "name": "V3253412JMSGetSafetyObservationProcess1756811019895"
  }

import { MigrationUtilsService } from 'j2utils';
import { MigrationInterface, QueryRunner } from 'typeorm';
/**
   * @author Muhammad Tariq
   * @description Added SP JMS_Get_Safety_Observation_Process
   * @param queryRunner
   * @Menu_Script - No
   * @environment - All
   * @Executed_On - Office and Vessel
   * @clients - All
   * @SQL_MAIN_PR - https://dev.azure.com/jibe-erp/JiBe/_git/sql-jibe-main/pullrequest/155724
   * @SQL_Ship_PR - https://dev.azure.com/jibe-erp/JiBe/_git/sql-jibe-ship/pullrequest/155726
   * @approved_by Zakhar.
   */
export class V3253412JMSGetSafetyObservationProcess1756811019895 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
    const className = this.constructor.name;
    try {
            await queryRunner.query(`CREATE OR ALTER PROCEDURE [dbo].[JMS_Get_Safety_Observation_Process] 
AS BEGIN

SET NOCOUNT ON;

BEGIN TRY
    SELECT sop.id, sop.field, sop.available,
        string_agg(jlw.status_displayName, ', ') 'mandatory For'
    from JMS_Safety_Observation_Process sop With (NOLOCK)
        left join JMS_Safety_Observation_MandatoryFor fmc on sop.id = fmc.fieldid and fmc.active_status = 1
	left join JMS_LIB_Workflow jlw ON fmc.MandatoryFor = jlw.id and jlw.active_status = 1
where sop.active_status = 1
group by sop.id, sop.field, sop.available

END TRY
    BEGIN CATCH
    DECLARE @ErrorMessage NVARCHAR(4000);
		DECLARE @ErrorSeverity INT;
		DECLARE @ErrorState INT;
		DECLARE @logMessage VARCHAR(MAX);
		
		SELECT @ErrorMessage = ERROR_MESSAGE()
			,@ErrorSeverity = ERROR_SEVERITY()
			,@ErrorState = ERROR_STATE();

		SET @logMessage = CONCAT('Failed! ErrorMessage:', @ErrorMessage,', ErrorSeverity:',@ErrorSeverity,', ErrorState:',@ErrorState);

		EXEC [dbo].[inf_log_write] 'jms',NULL,'JMS_Get_Safety_Observation_Process',0,'Exception occurred in SP',@logMessage,'sql',1,0;

		RAISERROR (@ErrorMessage,@ErrorSeverity,@ErrorState);
    END CATCH;
END;
`);
            await MigrationUtilsService.migrationLog(className, '', 'S', 'jms', 'JMS_Get_Safety_Observation_Process');

    } catch (error) {
      await MigrationUtilsService.migrationLog(className, error, 'E', 'jms', 'JMS_Get_Safety_Observation_Process', true);
    }
  }
  public async down(queryRunner: QueryRunner): Promise<void> {}
}
