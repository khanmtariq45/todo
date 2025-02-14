DECLARE @SQL_Script NVARCHAR(MAX);

SET @SQL_Script = N'
DECLARE @FolderId NVARCHAR(20);
DECLARE @VesselID INT = 4760;

EXEC [SYNC_SP_DataSynchronizer_DataLog] '''', '''', '''', @VesselID, ''EXEC [inf].[utils_inf_backup_table] ''''QMSdtlsFile_Log'''''';

CREATE TABLE #folder_ids (folder_id INT);

WITH folder_hierarchy AS (
    SELECT id, parentid
    FROM qmsdtlsfile_log with (nolock)
    WHERE parentid = 0	AND active_status = 1 AND nodetype = 1 
    UNION ALL
    SELECT f.id, f.parentid
    FROM qmsdtlsfile_log f with (nolock)
    INNER JOIN folder_hierarchy fh ON f.parentid = fh.id 
    WHERE f.nodetype = 1 AND f.active_status = 1
)

INSERT INTO #folder_ids (folder_id)
SELECT id FROM folder_hierarchy;

DECLARE curDoc CURSOR FOR
SELECT folder_id FROM #folder_ids;

OPEN curDoc;
FETCH NEXT FROM curDoc INTO @FolderId;

WHILE @@FETCH_STATUS = 0
BEGIN

    DECLARE @PkCondition VARCHAR(100) = ''ID='''''' + CAST(@FolderId AS VARCHAR) + '''''''';
    DECLARE @TableName VARCHAR(100) = ''QMSdtlsFile_Log'';
    EXEC SYNC_SP_DataSynch_MultiPK_DataLog @TableName, @PkCondition, @VesselID;

    FETCH NEXT FROM curDoc INTO @FolderId;
END

CLOSE curDoc;
DEALLOCATE curDoc;

DROP TABLE #folder_ids;
';

EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'Task 1 Bug 979218: CST - Multiple Vessels - In QMS files were not sync to Vessels.', 
    'O', 
    @SQL_Script;
