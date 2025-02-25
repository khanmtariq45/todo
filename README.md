-- Create a temp table to store the required data
CREATE TABLE #TempFilePaths (
    file_id INT,
    parent_path NVARCHAR(MAX),
    qms_filename NVARCHAR(MAX),
    new_filepath NVARCHAR(MAX)
);

-- Populate the temp table with the required data
WITH ParentFolders AS (
    SELECT id AS parent_id, filepath AS parent_path
    FROM qmsdtlsfile_log WITH (NOLOCK)
    WHERE nodetype = 1 AND active_status = 1
),
ChildFiles AS (
    SELECT f.id AS file_id, f.filepath, p.parent_path
    FROM qmsdtlsfile_log f WITH (NOLOCK)
    JOIN ParentFolders p ON f.parentid = p.parent_id
    WHERE f.nodetype = 0 AND f.active_status = 1
),
CleanedPaths AS (
    SELECT file_id, filepath, parent_path,
           SUBSTRING(filepath, LEN(filepath) - CHARINDEX('/', REVERSE(filepath)) + 2, LEN(filepath)) AS qms_filename
    FROM ChildFiles
)
INSERT INTO #TempFilePaths (file_id, parent_path, qms_filename, new_filepath)
SELECT file_id, parent_path, qms_filename,
       CONCAT(parent_path, '/', qms_filename) AS new_filepath
FROM CleanedPaths;


-- Update the original table using the temp table
UPDATE qmsdtlsfile_log
SET filepath = t.new_filepath
FROM qmsdtlsfile_log f
JOIN #TempFilePaths t ON f.id = t.file_id;