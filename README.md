WITH ParentFolders AS (
    SELECT id AS folder_id, filepath AS parent_path
    FROM qmsdtlsfile_log
    WHERE nodetype = 1
),
ChildFiles AS (
    SELECT f.id AS file_id, f.filepath, f.date_modified, f.date_created, p.folder_id, p.parent_path
    FROM qmsdtlsfile_log f
    JOIN ParentFolders p ON f.parent_id = p.folder_id
    WHERE f.nodetype = 0
),
CleanedPaths AS (
    SELECT file_id, filepath, folder_id, parent_path, date_modified, date_created,
           SUBSTRING(filepath, 1, LEN(filepath) - CHARINDEX('/', REVERSE(filepath))) AS cleaned_filepath
    FROM ChildFiles
)
SELECT folder_id, file_id, date_modified, date_created, filepath, parent_path
FROM CleanedPaths
WHERE cleaned_filepath <> parent_path;