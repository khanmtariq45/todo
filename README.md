DECLARE @SQL_Script NVARCHAR(MAX) = 
N'CREATE OR ALTER PROCEDURE [qms].[sp_search_files] (
	@search_term VARCHAR(4096),
	@user_id INT = 1,
	@folder_path VARCHAR(4096) = NULL,
	@modify_date_from DATETIME = NULL,
	@modify_date_to DATETIME = NULL,
	@skip INT = 0,
	@take INT = 100,
	@sort_by VARCHAR(100) = ''FileName'',
	@sort_direction VARCHAR(100) = ''asc''
)
WITH RECOMPILE
AS
BEGIN
	DECLARE @search_text NVARCHAR(4000) = ''"'' + REPLACE(@search_term, ''"'', '''') + ''*"''; 
	DECLARE @top_max_records BIGINT = 9223372036854775807; 

	SELECT * FROM (
		SELECT TOP (@top_max_records) fl.ID ID, 
			ftc.document_id DocumentID,
			(SELECT LEFT(ISNULL(fl.filepath, ''''), LEN(ISNULL(fl.filepath, '''')) - CHARINDEX(''/'', REVERSE(ISNULL(fl.filepath, '''')) + ''/'')) + ''/'' + ftc.file_name) Filename,
			ftc.file_name AS FilenameWithoutPath,
			(SELECT LEFT(ISNULL(fl.filepath, ''''), LEN(ISNULL(fl.filepath, '''')) - CHARINDEX(''/'', REVERSE(ISNULL(fl.filepath, '''')) + ''/''))) AS FilePathWithoutFilename,
			ftc.original_file_extension Extension,
			CONVERT(DECIMAL(9, 2), CEILING((ISNULL(fl.Size, 0) / 1024.00) * 100) / 100) AS Size,
			fl.Version,
			fl.FilePath,
			fl.date_of_creatation CreateDate,
			fl.Date_of_modification AS ModifyDate,
			COUNT(*) OVER (ORDER BY (SELECT NULL)) AS RowsCount,
			CASE 
				WHEN CONTAINS (ftc.file_name, @search_text) THEN 1
				WHEN CONTAINS (ftc.content, @search_text) THEN 2
				ELSE 3
			END result_priority
		FROM qms.full_text_content ftc WITH (NOLOCK)
		INNER JOIN QMSDtlsFile_log fl WITH (NOLOCK) 
			ON ftc.document_id = fl.ID 
			AND fl.Active_Status = 1 
			AND fl.NodeType = 0
		WHERE (@folder_path IS NULL OR LEN(@folder_path) = 0 OR fl.FilePath LIKE @folder_path + ''%'')
			AND (@modify_date_from IS NULL OR fl.Date_Of_Modification > @modify_date_from)
			AND (@modify_date_to IS NULL OR fl.Date_Of_Modification < @modify_date_to)
			AND (CONTAINS (ftc.file_name, @search_text) OR CONTAINS (ftc.content, @search_text))
		ORDER BY 
			CASE WHEN @sort_by = ''FileName'' AND @sort_direction = ''asc'' THEN ftc.file_name END ASC,
			CASE WHEN @sort_by = ''FileName'' AND @sort_direction = ''desc'' THEN ftc.file_name END DESC,
			CASE WHEN @sort_by = ''Size'' AND @sort_direction = ''asc'' THEN fl.size END ASC,
			CASE WHEN @sort_by = ''Size'' AND @sort_direction = ''desc'' THEN fl.size END DESC,
			CASE WHEN @sort_by = ''Version'' AND @sort_direction = ''asc'' THEN fl.version END ASC,
			CASE WHEN @sort_by = ''Version'' AND @sort_direction = ''desc'' THEN fl.version END DESC,
			CASE WHEN @sort_by = ''Extension'' AND @sort_direction = ''asc'' THEN ftc.original_file_extension END ASC,
			CASE WHEN @sort_by = ''Extension'' AND @sort_direction = ''desc'' THEN ftc.original_file_extension END DESC
	) result
	ORDER BY result_priority 
	OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY;
END';

EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'DB Change 979896: QMS_QC/Stage 2_QMS Main_3rd level approver approved the file directly and user can view the file, though approval is pending from 1st and 2nd approval', 
    'O', 
    @SQL_Script;