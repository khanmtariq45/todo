DECLARE @Today DATE = GETDATE();
DECLARE @Status INT = 1; -- Set desired status
DECLARE @Source VARCHAR(50) = 's'; -- Set desired source

WITH LatestUnapproved AS (
    -- Get the latest unapproved version for each QMSID
    SELECT *, 
           ROW_NUMBER() OVER (PARTITION BY QMSID ORDER BY version DESC, LevelID DESC) AS rn
    FROM QMS_FILE_APPROVAL
    WHERE Active_Status = 1 AND ApprovalStatus = 0
),
MaxLevel AS (
    -- Get the maximum LevelID for each QMSID in the latest unapproved version
    SELECT QMSID, MAX(LevelID) AS MaxLevelID
    FROM LatestUnapproved
    WHERE rn = 1  -- Only consider the latest unapproved version
    GROUP BY QMSID
),
FinalUnapproved AS (
    -- Ensure the max level matches the latest unapproved version
    SELECT lu.QMSID, lu.version AS UnapprovedVersion, ml.MaxLevelID
    FROM LatestUnapproved lu
    JOIN MaxLevel ml 
        ON lu.QMSID = ml.QMSID 
        AND lu.LevelID = ml.MaxLevelID
    WHERE lu.rn = 1  -- Again, only process the latest unapproved version
)

INSERT INTO qms_file_vessel_sync_ledger
        (vessel_assignment_id, date_of_creation, [status], [source], file_version)
SELECT DISTINCT va.ID, @Today, @Status, @Source, va.FileVersion
FROM QMS_DTL_Vessel_Assignment va
INNER JOIN LIB_VESSELS lv 
    ON va.Vessel_ID = lv.Vessel_ID 
    AND lv.Active_Status = 1 
    AND lv.INSTALLATION = 1
INNER JOIN QMSdtlsFile_Log fl 
    ON va.Document_ID = fl.ID 
    AND fl.Version = va.FileVersion 
    AND fl.Active_Status = 1 
    AND fl.NodeType = 0
INNER JOIN FinalUnapproved fu 
    ON va.Document_ID = fu.QMSID 
    AND fl.Version = fu.UnapprovedVersion  -- Ensure version matches latest unapproved version
WHERE va.Active_Status = 1 
AND NOT EXISTS (
    -- Prevent duplicate inserts
    SELECT 1 
    FROM qms_file_vessel_sync_ledger l 
    WHERE va.ID = l.vessel_assignment_id
);