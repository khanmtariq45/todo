DECLARE @UserId INT = 1;

WITH FolderHierarchy AS (
    SELECT 
        ID,
        ParentID,
        logFileId,
        CAST('\ ' AS VARCHAR(MAX)) AS filterPath,
        0 AS Level,
        CAST('Documents\' + logFileId + '\' AS VARCHAR(MAX)) AS FullPath
    FROM QMSdtlsFile_Log
    WHERE ParentID = 0 AND nodeType = 1  -- Root must be folder

    UNION ALL

    SELECT 
        child.ID,
        child.ParentID,
        child.logFileId,
        CAST(parent.filterPath + child.logFileId + '\' AS VARCHAR(MAX)) AS filterPath,
        parent.Level + 1 AS Level,
        CAST(parent.FullPath + child.logFileId + '\' AS VARCHAR(MAX)) AS FullPath
    FROM QMSdtlsFile_Log child
    INNER JOIN FolderHierarchy parent ON child.ParentID = parent.ID
    WHERE child.nodeType = 1  -- Only folders
),
FileHierarchy AS (
    -- Folders from hierarchy
    SELECT * FROM FolderHierarchy
    
    UNION ALL
    
    -- Files attached to folders
    SELECT 
        f.ID,
        f.ParentID,
        f.logFileId,
        CAST(fh.filterPath + f.logFileId + '\' AS VARCHAR(MAX)) AS filterPath,
        fh.Level + 1 AS Level,
        CAST(fh.FullPath + f.logFileId AS VARCHAR(MAX)) AS FullPath
    FROM QMSdtlsFile_Log f
    INNER JOIN FolderHierarchy fh ON f.ParentID = fh.ID
    WHERE f.nodeType = 0  -- Only files
)
SELECT 
    va.date_of_Creatation AS dateCreated,
    ISNULL(fv.date_of_creatation, va.date_of_creatation) AS dateModified,
    ISNULL(fh.filterPath, '') AS filterPath,
    CASE
        WHEN va.nodeType = 1 AND EXISTS (
            SELECT 1
            FROM QMSdtlsFile_Log child
            WHERE child.ParentID = va.ID 
                AND child.active_status = 1 
                AND child.nodeType = 1
        ) THEN 1
        ELSE 0
    END AS hasChild,
    CAST(va.ID AS VARCHAR(50)) AS id,
    CASE WHEN va.nodeType = 0 THEN 1 ELSE 0 END AS isFile,
    va.logFileId AS name,
    CAST(va.parentid AS VARCHAR(50)) AS parentId,
    CONVERT(DECIMAL(9, 2), CEILING((ISNULL(va.size, 0) / 1024.00) * 100) / 100 AS size,
    CASE 
        WHEN va.nodeType = 0 AND CHARINDEX('.', REVERSE(va.logFileId)) > 0
            THEN RIGHT(va.logFileId, CHARINDEX('.', REVERSE(va.logFileId)) - 1)
        ELSE 'Folder'
    END AS type,
    ISNULL(fh.FullPath, '') AS fullPath,
    va.version as fileVersion
FROM QMSdtlsFile_Log va
LEFT JOIN FileHierarchy fh ON va.ID = fh.ID
LEFT JOIN QMS_FileVersionInfo fv 
    ON va.ID = fv.FileId 
    AND va.version = fv.Version 
    AND va.nodeType = 0
WHERE va.active_status = 1
ORDER BY va.logfileID
OPTION (MAXRECURSION 200);