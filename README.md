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
    DECLARE @top_max_records bigint = 9223372036854775807; /* max value for bigint, required because we cannot use the order by in subquery without top */    

    ;WITH FileHierarchy AS (
        -- Level 0 (root) will have only \
        SELECT 
            ID,
            ParentID,
            logFileId,
            CAST('\ ' AS VARCHAR(MAX)) AS FilePath,  -- Root has only \
            0 AS Level
        FROM QMSDtlsFile_log
        WHERE ParentID IS NULL

        UNION ALL

        -- Children (skip root logFileId and build path from the next level)
        SELECT 
            child.ID,
            child.ParentID,
            child.logFileId,
            CAST(parent.FilePath + child.logFileId + '\' AS VARCHAR(MAX)) AS FilePath,
            parent.Level + 1 AS Level
        FROM QMSDtlsFile_log child
        INNER JOIN FileHierarchy parent ON child.ParentID = parent.ID
    )

    -- Select the search results with the updated filterPath logic
    SELECT * FROM        
    (
        SELECT TOP (@top_max_records)
            -- Adjusting the filepath using the updated filterPath logic
            (SELECT LEFT(ISNULL(fl.filepath, ''), LEN(ISNULL(fl.filepath, '')) - CHARINDEX('/', REVERSE(ISNULL(fl.filepath, '')) + '/')) + '/' + ftc.file_name) Filename,
            ftc.original_file_extension AS type, 
            CONVERT(DECIMAL(9,2), CEILING((ISNULL(fl.Size, 0) / 1024.00) * 100) / 100) AS size,
            CASE WHEN CONTAINS(ftc.file_name, @search_text) THEN 1 
                 WHEN CONTAINS(ftc.content, @search_text) THEN 2 ELSE 3 END AS result_priority,
            fl.date_of_creatation AS dateCreated,
            fl.Date_of_modification AS dateModified,
            -- Updated filterPath to follow the hierarchy
            '\' + REPLACE(
                LEFT(fh.FilePath, LEN(fh.FilePath) - CHARINDEX('/', REVERSE(fh.FilePath) + '/')) + '\',
                '/', '\'
            ) AS filterPath,
            0 AS hasChild,
            fl.ID AS id,
            1 AS isFile,
            fl.logFileId AS name,
            fl.ParentID AS parentId
        FROM qms.full_text_content ftc WITH (NOLOCK)
        INNER JOIN QMSDtlsFile_log fl WITH (NOLOCK) ON ftc.document_id = fl.ID AND fl.Active_Status = 1 AND fl.NodeType = 0
        LEFT JOIN FileHierarchy fh ON fl.ID = fh.ID
        WHERE 
            (@folder_path IS NULL OR LEN(@folder_path) = 0 OR fl.FilePath LIKE @folder_path + '%')
            AND (@modify_date_from IS NULL OR fl.Date_Of_Modification > @modify_date_from)
            AND (@modify_date_to IS NULL OR fl.Date_Of_Modification < @modify_date_to)
            AND (CONTAINS(ftc.file_name, @search_text) OR CONTAINS(ftc.content, @search_text))
        ORDER BY 
            CASE WHEN @sort_by = 'FileName' AND @sort_direction = 'asc' THEN ftc.file_name END ASC,
            CASE WHEN @sort_by = 'FileName' AND @sort_direction = 'desc' THEN ftc.file_name END DESC,
            CASE WHEN @sort_by = 'Size' AND @sort_direction = 'asc' THEN fl.size END ASC,
            CASE WHEN @sort_by = 'Size' AND @sort_direction = 'desc' THEN fl.size END DESC,
            CASE WHEN @sort_by = 'Version' AND @sort_direction = 'asc' THEN fl.version END ASC,
            CASE WHEN @sort_by = 'Version' AND @sort_direction = 'desc' THEN fl.version END DESC,
            CASE WHEN @sort_by = 'Extension' AND @sort_direction = 'asc' THEN ftc.original_file_extension END ASC,
            CASE WHEN @sort_by = 'Extension' AND @sort_direction = 'desc' THEN ftc.original_file_extension END DESC
    ) result
    ORDER BY result_priority
    OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY

END TRY
BEGIN CATCH
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    EXEC inf_log_write 'qms', 'QMS', 'J3_QMS_Search', 1, 'J3_QMS_Search', @ErrorMessage;
    RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;
END;