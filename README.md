.DECLARE @Today datetime = GETDATE(), @Source char = 's', @Status char = 'p';

-- Step 1: Identify the latest version for each QMSID
WITH LatestVersion AS (
    SELECT QMSID,
        MAX(Version) AS LatestVersion
    FROM 
        QMS_FILE_APPROVAL
    WHERE 
        Active_Status = 1
    GROUP BY 
        QMSID
),
-- Step 2: Find the MAX LEVEL for the latest version (even if not approved)
MaxLevel AS (
    SELECT 
        QMSID,
        MAX(LevelID) AS MaxLevelID,
        Version
    FROM 
        QMS_FILE_APPROVAL
    WHERE 
        Active_Status = 1
    GROUP BY 
        QMSID, Version
),
-- Step 3: Check if the MAX LEVEL is approved
ApprovedMaxLevel AS (
    SELECT 
        fa.QMSID,
        fa.LevelID,
        fa.Version
    FROM 
        QMS_FILE_APPROVAL fa
    INNER JOIN 
        MaxLevel ml ON fa.QMSID = ml.QMSID 
        AND fa.Version = ml.Version 
        AND fa.LevelID = ml.MaxLevelID
    WHERE 
        fa.ApprovalStatus = 1 -- Only include if MAX LEVEL is approved
)

-- Step 4: Insert into the ledger ONLY if MAX LEVEL is approved
INSERT INTO qms_file_vessel_sync_ledger
   (vessel_assignment_id, date_of_creation, [status], [source], file_version)
SELECT DISTINCT 
   va.ID, 
   @Today, 
   @Status, 
   @Source, 
   va.FileVersion
FROM 
    QMS_DTL_Vessel_Assignment va
INNER JOIN 
    LIB_VESSELS lv ON va.Vessel_ID = lv.Vessel_ID 
    AND lv.Active_Status = 1 
    AND lv.INSTALLATION = 1
INNER JOIN 
    QMSdtlsFile_Log fl ON va.Document_ID = fl.ID 
    AND fl.Version = va.FileVersion 
    AND fl.Active_Status = 1 
    AND fl.NodeType = 0
INNER JOIN 
    ApprovedMaxLevel aml ON fl.ID = aml.QMSID 
    AND fl.Version = aml.Version
WHERE 
    va.Active_Status = 1
    AND NOT EXISTS (
        SELECT 1
        FROM qms_file_vessel_sync_ledger l
        WHERE va.ID = l.vessel_assignment_id
    );