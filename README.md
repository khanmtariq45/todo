WITH ParentFolders AS (
    SELECT id, filepath AS parent_path
    FROM qmsdtlsfile_log
    WHERE nodetype = 1
),
ChildFiles AS (
    SELECT f.id, f.filepath, p.parent_path
    FROM qmsdtlsfile_log f
    JOIN ParentFolders p ON f.parent_id = p.id
    WHERE f.nodetype = 0
),
CleanedPaths AS (
    SELECT id, filepath, parent_path,
           SUBSTRING(filepath, 1, LEN(filepath) - CHARINDEX('/', REVERSE(filepath))) AS cleaned_filepath
    FROM ChildFiles
)
SELECT id, filepath, parent_path
FROM CleanedPaths
WHERE cleaned_filepath <> parent_path;