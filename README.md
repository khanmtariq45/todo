I want to run this SP 
EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'DB Change 994515: OSG - Multiple Vessels - In QMS, files were not sync to Vessels.', 
    'O', 
    @SQL_Script;

make below script as @SQL_Script
 
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

UPDATE qmsdtlsfile_log
SET filepath = CONCAT(t.parent_path, '/', t.qms_filename),
LOGManual1= t.parent_path,
LOGManual2= t.parent_path
FROM qmsdtlsfile_log f
JOIN #TempFilePaths t ON f.id = t.file_id;
 
UPDATE QMS_FileVersionInfo
SET filepath = CONCAT(t.parent_path, '/', t.qms_filename)
FROM QMS_FileVersionInfo f
JOIN #TempFilePaths t ON f.FileID = t.file_id;


DECLARE curDoc CURSOR FOR
SELECT DISTINCT lf.id, lf.filePath, va.vessel_ID 
FROM QMSdtlsFile_Log lf with (nolock)
INNER JOIN QMS_DTL_Vessel_Assignment va ON va.Document_ID = lf.id
INNER JOIN #TempFilePaths t on t.file_id = lf.id
INNER JOIN lib_vessels Vessel ON Vessel.Vessel_ID = va.Vessel_ID
WHERE va.Active_Status = 1 and vessel.installation = 1 AND vessel.active_status = 1
AND vessel.autosync = 1 AND lf.NodeType = 0;

OPEN curDoc;
FETCH NEXT FROM curDoc INTO @DocID, @FilePath, @VesselID;

WHILE @@FETCH_STATUS = 0
BEGIN

	DECLARE @SlashIndex INT = CHARINDEX(''/'', REVERSE(@FilePath));
    SET @FileName = SUBSTRING(@FilePath, LEN(@FilePath) - @SlashIndex + 2, @SlashIndex + 1);
    EXEC SYNC_INS_DataLog_Attachments @FileName, @VesselID;

    DECLARE @PkCondition VARCHAR(100) = 'ID=''' + CAST(@DocID AS VARCHAR) + '''';
    DECLARE @TableName VARCHAR(100) = 'QMSdtlsFile_Log';
    EXEC SYNC_SP_DataSynch_MultiPK_DataLog @TableName, @PkCondition, @VesselID;

    IF EXISTS (SELECT 1 FROM qms.full_text_content WITH (NOLOCK) WHERE document_id = @DocID)
    BEGIN
        EXEC [qms].[sp_sync_full_text_content] @DocID, @VesselID;
    END;

    FETCH NEXT FROM curDoc INTO @DocID, @FilePath, @VesselID;
END

CLOSE curDoc;
DEALLOCATE curDoc;


drop table if exists #TempFilePaths
