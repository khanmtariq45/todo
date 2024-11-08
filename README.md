DECLARE @FolderID INT = 0;

WITH RecursiveFolders AS (
    SELECT @FolderID AS FolderID
    UNION ALL
    SELECT va.ID
    FROM QMSdtlsFile_Log va WITH (NOLOCK)
    INNER JOIN RecursiveFolders rf ON va.ParentID = rf.FolderID
    WHERE va.nodeType = 1 AND va.active_status = 1
)
SELECT DISTINCT 
    va.id, 
    va.logFileId, 
    va.parentID,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM QMSdtlsFile_Log child WITH (NOLOCK)
            WHERE child.ParentID = va.id 
              AND child.active_status = 1 
              AND child.nodeType = 1
        ) THEN 1 
        ELSE 0 
    END AS HasChild
FROM QMSdtlsFile_Log va WITH (NOLOCK)
INNER JOIN RecursiveFolders rf ON va.ID = rf.FolderID
WHERE va.active_status = 1 AND va.nodeType = 1
OPTION (MAXRECURSION 100);