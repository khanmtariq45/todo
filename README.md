
DECLARE @Today DATE = GETDATE();
DECLARE @Status INT = 1; -- or your desired status value
DECLARE @Source VARCHAR(50) = 's'; -- or your desired source value

WITH LatestVersion AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY QMSID ORDER BY version DESC, LevelID DESC) AS rn
    FROM QMS_FILE_APPROVAL
    WHERE Active_Status = 1
),
LatestVersionMax AS (
    SELECT *
    FROM LatestVersion
    WHERE version = (SELECT MAX(version) FROM LatestVersion)
),
MaxLevel AS (
    SELECT QMSID, MAX(LevelID) AS MaxLevelID
    FROM LatestVersionMax
    GROUP BY QMSID
),
ApprovedMaxLevel AS (
    SELECT ml.QMSID
    FROM MaxLevel ml
    JOIN LatestVersionMax lv ON ml.QMSID = lv.QMSID AND ml.MaxLevelID = lv.LevelID
    WHERE lv.ApprovalStatus = 1
)
  
INSERT INTO qms_file_vessel_sync_ledger
        (vessel_assignment_id, date_of_creation, [status], [source], file_version)
    select distinct va.ID, @Today, @Status, @Source, va.FileVersion
FROM QMS_DTL_Vessel_Assignment va
INNER JOIN LIB_VESSELS lv ON
    va.Vessel_ID = lv.Vessel_ID AND lv.Active_Status = 1 AND lv.INSTALLATION = 1
INNER JOIN QMSdtlsFile_Log fl ON
    va.Document_ID = fl.ID AND
    fl.Version = va.FileVersion AND fl.Active_Status = 1 AND fl.NodeType = 0
 INNER JOIN ApprovedMaxLevel aml ON
    va.Document_ID = aml.QMSID
WHERE va.Active_Status = 1 AND
    NOT EXISTS (
        SELECT 1
        FROM qms_file_vessel_sync_ledger l
        WHERE va.ID = l.vessel_assignment_id
    );

