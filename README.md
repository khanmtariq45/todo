DECLARE @UserId INT = 1;

-- Phase 1: Build folder hierarchy (only folders)
WITH FolderHierarchy AS (
    SELECT 
        ID,
        ParentID,
        logFileId,
        CAST('\ ' AS VARCHAR(MAX)) AS filterPath,
        0 AS Level,
        CAST('Documents\' + logFileId + '\' AS VARCHAR(MAX)) AS FullPath
    FROM QMSdtlsFile_Log WITH (NOLOCK)
    WHERE ParentID = 0 AND nodeType = 1

    UNION ALL

    SELECT 
        child.ID,
        child.ParentID,
        child.logFileId,
        CAST(parent.filterPath + child.logFileId + '\' AS VARCHAR(MAX)),
        parent.Level + 1,
        CAST(parent.FullPath + child.logFileId + '\' AS VARCHAR(MAX))
    FROM QMSdtlsFile_Log child WITH (NOLOCK)
    INNER JOIN FolderHierarchy parent ON child.ParentID = parent.ID
    WHERE child.nodeType = 1
)

-- Phase 2: Create final output with optimized joins
SELECT 
    va.date_of_Creatation AS dateCreated,
    ISNULL(fv.date_of_creatation, va.date_of_creatation) AS dateModified,
    ISNULL(
        CASE 
            WHEN va.nodeType = 1 THEN fh.filterPath 
            ELSE fh.filterPath + va.logFileId + '\'
        END, 
        '\ '
    ) AS filterPath,
    CASE
        WHEN va.nodeType = 1 AND EXISTS (
            SELECT 1
            FROM QMSdtlsFile_Log child WITH (NOLOCK)
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
    CONVERT(DECIMAL(9, 2), 
        CASE WHEN va.size > 0 
             THEN CEILING((va.size / 1024.00) * 100) / 100 
             ELSE 0 
        END) AS size,
    CASE 
        WHEN va.nodeType = 0 AND CHARINDEX('.', va.logFileId) > 0
            THEN REVERSE(LEFT(REVERSE(va.logFileId), CHARINDEX('.', REVERSE(va.logFileId)) - 1))
        ELSE 'Folder'
    END AS type,
    ISNULL(
        CASE 
            WHEN va.nodeType = 1 THEN fh.FullPath 
            ELSE fh.FullPath + va.logFileId 
        END,
        'Documents\' + va.logFileId + '\'
    ) AS fullPath,
    va.version as fileVersion
FROM QMSdtlsFile_Log va WITH (NOLOCK)
LEFT JOIN FolderHierarchy fh ON va.ParentID = fh.ID
LEFT JOIN QMS_FileVersionInfo fv WITH (NOLOCK)
    ON va.ID = fv.FileId 
    AND va.version = fv.Version 
    AND va.nodeType = 0
WHERE va.active_status = 1
ORDER BY va.logfileID
OPTION (MAXRECURSION 200, MAXDOP 4);