CREATE OR ALTER PROCEDURE [qms].[J3_QMS_Search]
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

BEGIN TRY

DECLARE @search_text NVARCHAR(4000) = '"' + REPLACE(@search_term,'"', '') + '*"';
declare @top_max_records bigint = 9223372036854775807; /* max value for bigint, required because we cannot use the order by in subquery without top */	

select * from		
	(select top (@top_max_records)
			(select left(isnull(fl.filepath, ''), len(isnull(fl.filepath, '')) - charindex('/', reverse(isnull(fl.filepath, '')) + '/')) + '/' + ftc.file_name) Filename,
			ftc.original_file_extension type, 
			CONVERT(DECIMAL(9,2), ceiling((isnull(fl.Size, 0) / 1024.00) * 100) / 100) AS size,
			case when contains(ftc.file_name, @search_text) then 1 when contains(ftc.content, @search_text) then 2 else 3 end result_priority,
			fl.date_of_creatation AS dateCreated,
			fl.Date_of_modification AS dateModified,
			'\' + REPLACE(
				LEFT(fl.filepath, LEN(fl.filepath) - CHARINDEX('/', REVERSE(fl.filepath) + '/')) + '\',
				'/', '\'
			) AS filterPath,
			0 as hasChild,
			fl.ID AS id,
			1 AS isFile,
			fl.logFileId AS name,
			fl.ParentID AS parentId
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
END TRY
	BEGIN CATCH
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
	EXEC inf_log_write 'qms'
			,'QMS'
			,'J3_QMS_Search'
			,1
			,'J3_QMS_Search'
			,@ErrorMessage;
 
    RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;
END;
