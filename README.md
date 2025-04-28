CREATE TABLE [dbo].[QMS_FileVersionInfo] (
    [ID]                   INT           IDENTITY (1, 1) NOT NULL,
    [FileID]               INT           NULL,
    [Version]              INT           NULL,
    [FilePath]             VARCHAR (MAX) NULL,
    [Created_By]           INT           NOT NULL,
    [Date_Of_Creatation]   DATETIME      NOT NULL,
    [Modified_By]          INT           NULL,
    [Date_Of_Modification] DATETIME      NULL,
    [Deleted_By]           INT           NULL,
    [Date_Of_Deletion]     DATETIME      NULL,
    [Active_Status]        BIT           CONSTRAINT [DF_QMS_FileVersionInfo_Active_Status] DEFAULT ((1)) NOT NULL,
    [Is_Indexed]           BIT           DEFAULT ((0)) NOT NULL,
    [indexing_last_retry_time] DATETIME      NULL,
    CONSTRAINT [PK_QMS_FileVersionInfo] PRIMARY KEY CLUSTERED ([ID] ASC) WITH (FILLFACTOR = 80)
);

CREATE NONCLUSTERED INDEX IX_QMS_FILEVERSIONINFO__IS_INDEXED_FILEID_VERSION ON QMS_FILEVERSIONINFO(is_indexed, fileId, version);



import { MigrationUtilsService, eApplicationLocation } from "j2utils";
import { MigrationInterface, QueryRunner } from "typeorm";

export class V3252132QmsCreateAlterSPGetQMSDocumentTreeSlashFix1745241336056 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const className = this.constructor.name;
    try {
      let application = await MigrationUtilsService.getApplicationLocation();
      if (application === eApplicationLocation.Vessel) {
        await queryRunner.query(`CREATE OR ALTER PROCEDURE [qms].[SP_Get_QMS_Document_Tree] 
@UserId INT
AS
BEGIN
BEGIN TRY
    -- Step 1: Identify parents for hasChild
    DROP TABLE IF EXISTS #Orphans;
    SELECT DISTINCT ParentID 
    INTO #Orphans 
    FROM QMSdtlsFile_Log 
    WHERE active_status = 0;

   `);
      }

      await MigrationUtilsService.migrationLog(className, "", "S", "qms", "SP_Get_QMS_Document_Tree_Index");
    } catch (error) {
      await MigrationUtilsService.migrationLog(className, error, "E", "qms", "SP_Get_QMS_Document_Tree_Index", true);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
