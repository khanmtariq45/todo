DECLARE @SQL_Script NVARCHAR(MAX);

SET @SQL_Script = N'
EXEC [inf].[utils_inf_backup_table] ''qms.full_text_content''
GO

IF ((SELECT SERVERPROPERTY(''IsFullTextInstalled'')) = 1)
BEGIN
    IF NOT EXISTS (
            SELECT 1
            FROM sys.fulltext_catalogs
            WHERE name = ''QMS_FTC_FILES''
            )
    BEGIN
        PRINT (''Full-text catalog QMS_FTC_FILES does not exist, creating...'')
        CREATE FULLTEXT CATALOG QMS_FTC_FILES;
    END
    ELSE
    BEGIN
        PRINT (''Full-text catalog QMS_FTC_FILES already exists.'')
    END

    IF NOT EXISTS (
            SELECT 1
            FROM sys.fulltext_indexes
            WHERE object_name(object_id) = ''full_text_content''
            )
    BEGIN
        PRINT (''Full-text index on full_text_content does not exist, creating...'')
        CREATE FULLTEXT INDEX ON qms.full_text_content (
            file_name LANGUAGE 1033,
            content TYPE COLUMN extension_for_indexing LANGUAGE 1033
        ) KEY INDEX PK_full_text_content ON QMS_FTC_FILES
        WITH CHANGE_TRACKING = AUTO;
    END
    ELSE
    BEGIN
        PRINT (''Full-text index on full_text_content already exists.'')
    END
END
ELSE
BEGIN
    PRINT (''Full-Text Search Feature Is Not Installed.'')
END

EXEC [inf].[utils_inf_backup_table] ''INF_Lib_Module''

IF EXISTS (SELECT 1 FROM [dbo].[INF_Lib_Module] WHERE Module_Code = ''qms'' AND active_status = 1)
BEGIN
    Update [dbo].[INF_Lib_Module] SET base_url = ''/#/qms'' WHERE Module_Code = ''qms'' AND active_status = 1
END
ELSE
BEGIN
    INSERT INTO INF_Lib_Module (
        ModuleId, 
        Module_UID, 
        Module_Code, 
        Module_Name, 
        Created_By, 
        Date_Of_Creation, 
        Modified_By, 
        Date_Of_Modification, 
        Active_Status, 
        parent_module_code, 
        base_url, 
        email_settings, 
        api_name
    ) VALUES (
        (SELECT ISNULL(MAX(ModuleId), 0) + 1 FROM INF_Lib_Module), 
        NEWID(), 
        ''QMS'', 
        ''J3 QMS'', 
        1,
        GETDATE(), 
        NULL, 
        NULL,
        1,
        ''quality'', 
        ''/#/qms'', 
        NULL, 
        NULL
    );
END

IF EXISTS (SELECT 1 FROM [dbo].[INF_Lib_Module] WHERE Module_Code = ''qms'' AND active_status = 1)
BEGIN
    Update [dbo].[INF_Lib_Module] SET base_url =''https://eps.jibe.solutions/eps/'' WHERE Module_Code = ''j2_qms'' AND active_status = 1
END
ELSE
BEGIN
    INSERT INTO INF_Lib_Module (
        ModuleId, 
        Module_UID, 
        Module_Code, 
        Module_Name, 
        Created_By, 
        Date_Of_Creation, 
        Modified_By, 
        Date_Of_Modification, 
        Active_Status, 
        parent_module_code, 
        base_url, 
        email_settings, 
        api_name
    ) VALUES (
        (SELECT ISNULL(MAX(ModuleId), 0) + 1 FROM INF_Lib_Module), 
        NEWID(), 
        ''j2_qms'', 
        ''J2 QMS'',
        1,
        GETDATE(), 
        NULL, 
        NULL,
        1,
        ''quality'', 
        ''https://eps.jibe.solutions/eps/'', 
        NULL, 
        NULL
    );
END

CREATE OR ALTER PROCEDURE [qms].[sp_search_files]
(
    @search_term varchar(4096),
    @user_id int = 1,
    @folder_path varchar(4096) = NULL,
    @modify_date_from DateTime = NULL,
    @modify_date_to DateTime = NULL,
    @skip int = 0,
    @take int = 100,
    @sort_by varchar(100) = ''FileName'',
    @sort_direction varchar(100) = ''asc''
)
WITH RECOMPILE 
AS
BEGIN
    DECLARE @search_text NVARCHAR(4000) = ''"'' + REPLACE(@search_term,''"'', '''') + ''*"''; 
    DECLARE @top_max_records bigint = 9223372036854775807;  
    SELECT * FROM (SELECT TOP (@top_max_records)
        fl.ID ID, ftc.document_id DocumentID,
        (SELECT LEFT(ISNULL(fl.filepath, ''''), LEN(ISNULL(fl.filepath, '''')) - CHARINDEX(''/'', REVERSE(ISNULL(fl.filepath, ''''))) + 1)) + ''/'' + ftc.file_name Filename,
        ftc.file_name As FilenameWithoutPath, 
        (SELECT LEFT(ISNULL(fl.filepath, ''''), LEN(ISNULL(fl.filepath, '''')) - CHARINDEX(''/'', REVERSE(ISNULL(fl.filepath, ''''))) + 1)) as FilePathWithoutFilename, 
        ftc.original_file_extension Extension, 
        CONVERT(DECIMAL(9,2), CEILING((ISNULL(fl.Size,0) / 1024.00) * 100) / 100) AS Size,
        fl.Version, fl.FilePath, fl.date_of_creatation CreateDate, fl.Date_of_modification as ModifyDate,
        COUNT(*) OVER (ORDER BY (SELECT NULL)) as RowsCount,
        CASE WHEN CONTAINS(ftc.file_name, @search_text) THEN 1 WHEN CONTAINS(ftc.content, @search_text) THEN 2 ELSE 3 END result_priority
        FROM qms.full_text_content ftc WITH (NOLOCK)
        INNER JOIN QMSDtlsFile_log fl WITH (NOLOCK) ON ftc.document_id = fl.ID AND fl.Active_Status = 1 AND fl.NodeType = 0
        WHERE 
            (@folder_path IS NULL OR LEN(@folder_path) = 0 OR fl.FilePath LIKE @folder_path + ''%'')
            AND (@modify_date_from IS NULL OR fl.Date_Of_Modification > @modify_date_from)
            AND (@modify_date_to IS NULL OR fl.Date_Of_Modification < @modify_date_to)
            AND (CONTAINS(ftc.file_name, @search_text) OR CONTAINS(ftc.content, @search_text))
        ORDER BY result_priority
    ) result
    OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY
END
';

EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'FulltextSearch Pre-Requisites - Bug 997868: EPS Prod - Demo Vessel - In EPS Manuals, search functionality is not working.', 
    'V', 
    @SQL_Script,
    @destination_uid= '00000000-0000-0000-0000-000000000000';