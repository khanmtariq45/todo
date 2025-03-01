I need a @SQL_Script to run 
EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'DB Change 996907: DB Change - Bug 996800: SLOMAN NEPTUN - Office - In QMS, unable to view and download pdf files.', 
    'O', 
    @SQL_Script;
	Please wrap below script in @SQL_Script to run SP 
EXEC [inf].[utils_inf_backup_table] 'INF_Lib_Module'
 
Update dbo.INF_Lib_Module set base_Url = '/#/qms'  where Module_Code ='QMS' and active_status = 1

