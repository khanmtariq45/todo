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
SELECT parent_id, file_id, file_name, filepath, parent_path, active_status, date_of_modification, date_of_creatation
FROM CleanedPaths
WHERE cleaned_filepath <> parent_path order by parent_id desc


I have recevied data like now I want to replace filePath with parent_path but firstly get QMS_ name which encrypted name of file add it to end of parent_path and set it to filepath

216	309	MLC Certification BGI.pdf	DOCUMENTS/Safety Management System (SMS)/D14 Personnel and Training/2 Appendices/D14 Appendix V MLC-Manual/Attachments/2 Authorised Agents/QMS_041b283d-e497-46c5-9145-9e256a328a6c.pdf	DOCUMENTS/Safety Management System (SMS)/D14 Personnel and Training/2 Appendices/D14 Appendix V MLC-Manual/Attachments/2 Authorised Agents/MLC Certification	1		2024-01-10 09:09:32.920
