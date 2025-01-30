-- Step 1: Identify the latest approved version with the maximum level for each QMSID
WITH LatestVersion AS (
    SELECT 
        QMSID,
        MAX(Version) AS LatestVersion
    FROM 
        QMS_FILE_APPROVAL
    WHERE 
        Active_Status = 1
    GROUP BY 
        QMSID
),
ApprovedLatestVersion AS (
    SELECT 
        fa.QMSID,
        fa.LevelID,
        fa.Version
    FROM 
        QMS_FILE_APPROVAL fa
    INNER JOIN 
        LatestVersion lv
    ON 
        fa.QMSID = lv.QMSID AND fa.Version = lv.LatestVersion
    WHERE 
        fa.ApprovalStatus = 'Approved' -- Assuming 'Approved' is the status for approved files
),
MaxLevelApproved AS (
    SELECT 
        QMSID,
        MAX(LevelID) AS MaxLevelID,
        Version
    FROM 
        ApprovedLatestVersion
    GROUP BY 
        QMSID, Version
)

-- Step 2: Join with relevant tables and insert into the ledger
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
    MaxLevelApproved mla ON fl.QMSID = mla.QMSID 
    AND fl.Version = mla.Version
WHERE 
    va.Active_Status = 1
    AND NOT EXISTS (
        SELECT 1
        FROM qms_file_vessel_sync_ledger l
        WHERE va.ID = l.vessel_assignment_id
    );