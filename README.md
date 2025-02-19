DECLARE @SQL_Script NVARCHAR(MAX);

SET @SQL_Script = N'
-- Backup tables before deletion
EXEC [inf].[utils_inf_backup_table] ''QMS_DTL_Vessel_Assignment'';
EXEC [inf].[utils_inf_backup_table] ''qms_file_vessel_sync_ledger'';
EXEC [inf].[utils_inf_backup_table] ''QMS_Sync_History'';

-- Create a temporary table to store IDs of records to be deleted
IF OBJECT_ID(''tempdb..#TempDeletedAssignments'') IS NOT NULL
    DROP TABLE #TempDeletedAssignments;

CREATE TABLE #TempDeletedAssignments (
    ID INT PRIMARY KEY
);

-- Insert relevant IDs before deletion
INSERT INTO #TempDeletedAssignments (ID)
SELECT va.ID
FROM QMS_DTL_Vessel_Assignment va
INNER JOIN qmsdtlsfile_log qdf ON qdf.ID = va.Document_Id
INNER JOIN qms_file_vessel_sync_ledger ledg ON ledg.vessel_assignment_id = va.ID
INNER JOIN lib_vessels Vessel ON Vessel.Vessel_ID = va.Vessel_ID
WHERE va.Active_Status = 1
  AND Vessel.installation = 1
  AND Vessel.autosync = 1
  AND Vessel.Active_Status = 1
  AND ledg.status <> ''c''
  AND va.Vessel_ID IN (7721, 6764, 5653, 5645, 7517, 6068, 6432, 5715, 5302, 7186)
  AND EXISTS (
      SELECT 1
      FROM qmsdtlsfile_log qdfl WITH (NOLOCK)
      WHERE qdfl.ID = va.Document_ID
        AND (qdfl.Active_status = 0 OR va.FileVersion <> qdfl.Version)
  );

-- Delete from QMS_DTL_Vessel_Assignment using temp table
DELETE va
FROM QMS_DTL_Vessel_Assignment va
INNER JOIN #TempDeletedAssignments temp ON va.ID = temp.ID;

-- Delete from qms_file_vessel_sync_ledger using temp table
DELETE ledg
FROM qms_file_vessel_sync_ledger ledg
INNER JOIN #TempDeletedAssignments temp ON ledg.vessel_assignment_id = temp.ID;

-- Delete from QMS_Sync_History using temp table
DELETE qh
FROM QMS_Sync_History qh
WHERE EXISTS (
    SELECT 1 FROM QMS_DTL_Vessel_Assignment va
    INNER JOIN #TempDeletedAssignments temp ON va.ID = temp.ID
    WHERE va.Document_ID = qh.FileID AND va.FileVersion = qh.FileVersion
);

-- Drop the temp table after use
DROP TABLE #TempDeletedAssignments;
';

-- Register script for execution
EXEC [inf].[register_script_for_execution] 
    ''QMS'', 
    ''QMS_Document'', 
    ''DB Change 989173: DB Change - SLOMAN NEPTUN - Multiple Vessels - In QMS files were not sync to Vessels.'', 
    ''O'', 
    @SQL_Script;