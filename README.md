import { MigrationUtilsService } from 'j2utils';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class V3253412JMSGetSafetyObservationProcess1756811019895 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const className = this.constructor.name;
        try {
            await queryRunner.query(`
CREATE OR ALTER PROCEDURE [dbo].[JMS_Get_Safety_Observation_Process] 
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        SELECT 
            sop.id, 
            sop.field, 
            sop.available,
            STRING_AGG(jlw.status_displayName, ', ') AS [mandatory For]
        FROM JMS_Safety_Observation_Process sop (NOLOCK)
        LEFT JOIN JMS_Safety_Observation_MandatoryFor fmc (NOLOCK) 
            ON sop.id = fmc.fieldid 
            AND fmc.active_status = 1
        LEFT JOIN JMS_LIB_Workflow jlw (NOLOCK) 
            ON fmc.MandatoryFor = jlw.id 
            AND jlw.active_status = 1
        WHERE sop.active_status = 1
        GROUP BY sop.id, sop.field, sop.available
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000);
        DECLARE @ErrorSeverity INT;
        DECLARE @ErrorState INT;
        DECLARE @logMessage VARCHAR(MAX);
        
        SELECT 
            @ErrorMessage = ERROR_MESSAGE(),
            @ErrorSeverity = ERROR_SEVERITY(),
            @ErrorState = ERROR_STATE();

        SET @logMessage = CONCAT(
            'Failed! ErrorMessage:', @ErrorMessage,
            ', ErrorSeverity:', @ErrorSeverity,
            ', ErrorState:', @ErrorState
        );

        EXEC [dbo].[inf_log_write] 
            'jms', NULL, 'JMS_Get_Safety_Observation_Process', 
            0, 'Exception occurred in SP', @logMessage, 'sql', 1, 0;

        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
`);
            await MigrationUtilsService.migrationLog(
                className, '', 'S', 'jms', 'JMS_Get_Safety_Observation_Process'
            );
        } catch (error) {
            await MigrationUtilsService.migrationLog(
                className, error, 'E', 'jms', 'JMS_Get_Safety_Observation_Process', true
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Down migration not implemented
    }
}