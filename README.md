DROP TABLE IF EXISTS #TempFilePaths;

CREATE TABLE #TempFilePaths (
    parent_id INT,
    file_id INT,
    qms_filename VARCHAR(MAX),
    file_name VARCHAR(MAX),
    filepath VARCHAR(550),
    parent_path VARCHAR(MAX),
    active_status VARCHAR(MAX)
);

WITH ParentFolders AS (
    SELECT id AS parent_id, filepath AS parent_path
    FROM qmsdtlsfile_log WITH (NOLOCK)
    WHERE nodetype = 1 AND active_status = 1
),
ChildFiles AS (
    SELECT f.LogFileID AS file_name, f.active_status, f.id AS file_id, f.filepath, f.date_of_modification, f.date_of_creatation, p.parent_id, p.parent_path
    FROM qmsdtlsfile_log f WITH (NOLOCK)
    JOIN ParentFolders p ON f.parentid = p.parent_id
    WHERE f.nodetype = 0 AND f.active_status = 1
),
CleanedPaths AS (
    SELECT file_id, file_name, active_status, filepath, parent_id, parent_path, date_of_modification, date_of_creatation,
           SUBSTRING(filepath, 1, LEN(filepath) - CHARINDEX('/', REVERSE(filepath))) AS cleaned_filepath
    FROM ChildFiles
)
INSERT INTO #TempFilePaths (parent_id, file_id, qms_filename, file_name, filepath, parent_path, active_status)
SELECT parent_id, file_id, 
       RIGHT(filepath, CHARINDEX('/', REVERSE(filepath)) - 1) AS qms_filename, -- Correctly extract filename with extension
       file_name, filepath, parent_path, active_status
FROM CleanedPaths
WHERE cleaned_filepath <> parent_path;

SELECT CONCAT(t.parent_path, '/', t.qms_filename) AS filepath,
       t.parent_path AS LOGManual1, t.parent_path AS LOGManual2
FROM qmsdtlsfile_log f
JOIN #TempFilePaths t ON f.id = t.file_id;