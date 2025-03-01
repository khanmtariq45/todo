DECLARE @SQL_Script NVARCHAR(MAX);

SET @SQL_Script = N'
EXEC [inf].[utils_inf_backup_table] ''INF_Lib_Module'';

UPDATE dbo.INF_Lib_Module
SET base_Url = ''/#/qms''
WHERE Module_Code = ''QMS''
  AND active_status = 1;
';

EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'DB Change 996907: DB Change - Bug 996800: SLOMAN NEPTUN - Office - In QMS, unable to view and download pdf files.', 
    'O', 
    @SQL_Script;