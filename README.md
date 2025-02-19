DECLARE @SQL_Script NVARCHAR(MAX);

SET @SQL_Script = N'
EXEC [inf].[utils_inf_backup_table] ''QMS_DTL_Vessel_Assignment'';
EXEC [inf].[utils_inf_backup_table] ''qms_file_vessel_sync_ledger'';
EXEC [inf].[utils_inf_backup_table] ''QMS_Sync_History'';


DELETE va
FROM QMS_DTL_Vessel_Assignment va
INNER JOIN qmsdtlsfile_log qdf ON qdf.ID = va.Document_Id
INNER JOIN qms_file_vessel_sync_ledger ledg ON ledg.vessel_assignment_id = va.ID
INNER JOIN lib_vessels Vessel ON Vessel.Vessel_ID = va.Vessel_ID
WHERE va.Active_Status = 1
  AND Vessel.installation = 1
  AND Vessel.autosync = 1
  AND Vessel.Active_Status = 1
  AND ledg.status <> ''c''
  AND va.Vessel_ID in (7721, 6764, 5653, 5645, 7517, 6068, 6432, 5715, 5302, 7186)
  AND EXISTS (
      SELECT 1
      FROM qmsdtlsfile_log qdfl WITH (NOLOCK)
      WHERE qdfl.ID = va.Document_ID
        AND (qdfl.Active_status = 0 OR va.FileVersion <> qdfl.Version)
  );

DELETE ledg
FROM qms_file_vessel_sync_ledger ledg
inner join QMS_DTL_Vessel_Assignment va on va.id = ledg.vessel_assignment_id 
where va.Vessel_ID in (7721, 6764, 5653, 5645, 7517, 6068, 6432, 5715, 5302, 7186) and ledg.vessel_assignment_id not in (select id from QMS_DTL_Vessel_Assignment with (nolock) where active_status = 1);

DELETE qh
FROM QMS_Sync_History qh
inner join QMS_DTL_Vessel_Assignment va on va.Document_ID = qh.FileID and va.FileVersion = qh.FileVersion
WHERE 
va.Vessel_ID in (7721, 6764, 5653, 5645, 7517, 6068, 6432, 5715, 5302, 7186) and
NOT EXISTS (
    SELECT 1
    FROM QMS_DTL_Vessel_Assignment qa with (nolock)
    WHERE qa.Document_ID = qh.FileID
      AND qa.FileVersion = qh.FileVersion
);
';


EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'DB Change 989173: DB Change - SLOMAN NEPTUN - Multiple Vessels - In QMS files were not sync to Vessels.', 
    'O', 
    @SQL_Script;
