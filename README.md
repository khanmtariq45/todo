I need to run sp 

EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'FulltextSearch Pre-Requisites - Bug 997868: EPS Prod - Demo Vessel - In EPS Manuals, search functionality is not working.', 
    'V', 
    @SQL_Script,
	@destination_uid= '00000000-0000-0000-0000-000000000000';
	and need complete below script as  @SQL_Script

EXEC [inf].[utils_inf_backup_table] 'qms.full_text_content'
GO

IF ((SELECT SERVERPROPERTY('IsFullTextInstalled')) = 1)
BEGIN
	
    IF NOT EXISTS (
            SELECT 1
            FROM sys.fulltext_catalogs
            WHERE name = 'QMS_FTC_FILES'
            )
    BEGIN
        PRINT ('Full-text catalog QMS_FTC_FILES does not exist, creating...')
        CREATE FULLTEXT CATALOG QMS_FTC_FILES;
    END
    ELSE
    BEGIN
        PRINT ('Full-text catalog QMS_FTC_FILES already exists.')
    END

	IF NOT EXISTS (
			SELECT 1
			FROM sys.fulltext_indexes
			WHERE object_name(object_id) = 'full_text_content'
			)
	BEGIN
		PRINT ('Full-text index on full_text_content does not exist, creating...')
		CREATE FULLTEXT INDEX ON qms.full_text_content (
			file_name LANGUAGE 1033,
			content TYPE COLUMN extension_for_indexing LANGUAGE 1033
		) KEY INDEX PK_full_text_content ON QMS_FTC_FILES
		WITH CHANGE_TRACKING = AUTO;
	END
	ELSE
	BEGIN
		PRINT ('Full-text index on full_text_content already exists.')
	END
END
ELSE
BEGIN
	PRINT ('Full-Text Search Feature Is Not Installed.')
END
GO

EXEC [inf].[utils_inf_backup_table] 'INF_Lib_Module'

IF EXISTS (SELECT 1 FROM [dbo].[INF_Lib_Module] WHERE Module_Code = 'qms' AND active_status = 1)
BEGIN
    Update [dbo].[INF_Lib_Module] SET base_url = '/#/qms' WHERE Module_Code = 'qms' AND active_status = 1
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
   'QMS', 
   'J3 QMS', 
   1,
   GETDATE(), 
   NULL, 
   NULL,
   1,
   'quality', 
   '/#/qms', 
   NULL, 
   NULL
);
END


IF EXISTS (SELECT 1 FROM [dbo].[INF_Lib_Module] WHERE Module_Code = 'qms' AND active_status = 1)
BEGIN
    Update [dbo].[INF_Lib_Module] SET base_url ='https://eps.jibe.solutions/eps/' WHERE Module_Code = 'j2_qms' AND active_status = 1
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
   'j2_qms', 
   'J2 QMS',
   1,
   GETDATE(), 
   NULL, 
   NULL,
   1,
   'quality', 
   'https://eps.jibe.solutions/eps/', 
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
    @sort_by varchar(100) = 'FileName',
    @sort_direction varchar(100) = 'asc'
)
WITH RECOMPILE 
AS
 
BEGIN
 
DECLARE @search_text NVARCHAR(4000) = '"' + REPLACE(@search_term,'"', '') + '*"';
declare @top_max_records bigint = 9223372036854775807;  
 
select * from       
    (select top (@top_max_records)
            fl.ID ID, ftc.document_id DocumentID,
            (select left(isnull(fl.filepath,''), len(isnull(fl.filepath,'')) - charindex('/', reverse(isnull(fl.filepath,'')) + '/')) + '/' + ftc.file_name) Filename,
            ftc.file_name As FilenameWithoutPath, 
            (select left(isnull(fl.filepath,''), len(isnull(fl.filepath,'')) - charindex('/', reverse(isnull(fl.filepath,'')) + '/')) ) as FilePathWithoutFilename, 
            ftc.original_file_extension Extension, CONVERT(DECIMAL(9,2),ceiling((isnull(fl.Size,0) / 1024.00) * 100) / 100) AS Size,
            fl.Version, fl.FilePath, fl.date_of_creatation CreateDate, fl.Date_of_modification as ModifyDate,
            COUNT(*) OVER (ORDER BY (SELECT NULL)) as RowsCount,
            case when  contains(ftc.file_name, @search_text) then 1 when contains(ftc.content, @search_text) then 2 else 3 end result_priority
    FROM qms.full_text_content ftc with (nolock)
        INNER JOIN QMSDtlsFile_log fl with (nolock) ON ftc.document_id=fl.ID AND fl.Active_Status=1 AND fl.NodeType=0
    WHERE 
        (@folder_path is null or len(@folder_path) = 0 or fl.FilePath like @folder_path + '%')
        AND (@modify_date_from IS NULL OR fl.Date_Of_Modification > @modify_date_from)
        AND (@modify_date_to IS NULL OR fl.Date_Of_Modification < @modify_date_to)
        AND (contains(ftc.file_name, @search_text) OR contains(ftc.content, @search_text))
    
    Order By 
        CASE WHEN @sort_by = 'FileName' AND @sort_direction = 'asc' THEN ftc.file_name END ASC,
        CASE WHEN @sort_by = 'FileName' AND @sort_direction = 'desc' THEN ftc.file_name END DESC,
        CASE WHEN @sort_by = 'Size' AND @sort_direction = 'asc' THEN fl.size END ASC,
        CASE WHEN @sort_by = 'Size' AND @sort_direction = 'desc' THEN fl.size END DESC,
        CASE WHEN @sort_by = 'Version' AND @sort_direction = 'asc' THEN fl.version END ASC,
        CASE WHEN @sort_by = 'Version' AND @sort_direction = 'desc' THEN fl.version END DESC,
        CASE WHEN @sort_by = 'Extension' AND @sort_direction = 'asc' THEN ftc.original_file_extension END ASC,
        CASE WHEN @sort_by = 'Extension' AND @sort_direction = 'desc' THEN ftc.original_file_extension END DESC
    ) result
order by result_priority
OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY
END
