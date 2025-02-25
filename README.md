drop table if exists #TempFilePaths
 
CREATE TABLE #TempFilePaths (
    parent_id INT,
	file_id INT,
	qms_filename NVARCHAR(MAX),
	file_name NVARCHAR(MAX),
    filepath NVARCHAR(MAX),
    parent_path NVARCHAR(MAX),
    active_status NVARCHAR(MAX)
);
 
WITH ParentFolders AS (
    SELECT id AS parent_id, filepath AS parent_path
    FROM qmsdtlsfile_log with (nolock)
    WHERE nodetype = 1 and active_status = 1
),
ChildFiles AS (
    SELECT f.LogFileID as file_name,f.active_status, f.id AS file_id, f.filepath, f.date_of_modification, f.date_of_creatation, p.parent_id, p.parent_path
    FROM qmsdtlsfile_log f with (nolock)
    JOIN ParentFolders p ON f.parentid = p.parent_id
    WHERE f.nodetype = 0 and f.active_status = 1
),
CleanedPaths AS (
    SELECT file_id, file_name, active_status, filepath, parent_id, parent_path, date_of_modification, date_of_creatation,
           SUBSTRING(filepath, 1, LEN(filepath) - CHARINDEX('/', REVERSE(filepath))) AS cleaned_filepath
    FROM ChildFiles
)
 
INSERT INTO #TempFilePaths (parent_id, file_id, qms_filename, file_name, filepath, parent_path, active_status)
SELECT parent_id, file_id, SUBSTRING(filepath, LEN(filepath) - CHARINDEX('/', REVERSE(filepath)) + 2, LEN(filepath)) AS qms_filename, file_name, filepath, parent_path, active_status
FROM CleanedPaths
WHERE cleaned_filepath <> parent_path

select  CONCAT(t.parent_path, '/', t.qms_filename) as filepath,
  t.parent_path as LOGManual1, t.parent_path as LOGManual2
FROM qmsdtlsfile_log f
JOIN #TempFilePaths t ON f.id = t.file_id;
