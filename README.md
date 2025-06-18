DECLARE @UserId INT = 1;

-- First, get all accessible folder IDs for the user
WITH AccessibleFolders AS (
    SELECT DISTINCT FolderID 
    FROM QMS_User_Folder_Access WITH (NOLOCK)
    WHERE UserID = @UserId
),
-- Get all records that should be visible to the user
VisibleItems AS (
    SELECT va.*
    FROM QMSdtlsFile_Log va WITH (NOLOCK)
    WHERE va.active_status = 1
    AND (
        (va.nodeType = 1 AND EXISTS (SELECT 1 FROM AccessibleFolders af WHERE af.FolderID = va.ID))
        OR
        (va.nodeType = 0 AND EXISTS (SELECT 1 FROM AccessibleFolders af WHERE af.FolderID = va.ParentID))
    )
),
-- Build the complete hierarchy for visible items
FileHierarchy AS (
    -- Base case: root folders (ParentID = 0)
    SELECT 
        f.ID,
        f.ParentID,
        f.logFileId,
        f.nodeType,
        CAST('\' AS VARCHAR(900)) AS filterPath,
        0 AS Level,
        CAST('Documents\' + f.logFileId + '\' AS VARCHAR(900)) AS FullPath
    FROM VisibleItems f
    WHERE f.ParentID = 0

    UNION ALL

    -- Recursive case: child items
    SELECT 
        child.ID,
        child.ParentID,
        child.logFileId,
        child.nodeType,
        CAST(parent.filterPath + child.logFileId + CASE WHEN child.nodeType = 1 THEN '\' ELSE '' END AS VARCHAR(900)),
        parent.Level + 1,
        CASE WHEN child.nodeType = 1 
             THEN CAST(parent.FullPath + child.logFileId + '\' AS VARCHAR(900)) 
             ELSE CAST(parent.FullPath + child.logFileId AS VARCHAR(900)) END
    FROM VisibleItems child
    INNER JOIN FileHierarchy parent ON child.ParentID = parent.ID
)

-- Final output with all paths correctly calculated
SELECT 
    va.date_of_Creatation AS dateCreated,
    ISNULL(fi.date_of_creatation, va.date_of_creatation) AS dateModified,
    fh.filterPath,
    CASE
        WHEN va.nodeType = 1 AND EXISTS (
            SELECT 1
            FROM QMSdtlsFile_Log child WITH (NOLOCK)
            WHERE child.ParentID = va.ID AND child.active_status = 1 AND child.nodeType = 1
        ) THEN 1
        ELSE 0
    END AS hasChild,
    CAST(va.ID AS VARCHAR(50)) AS id,
    CASE WHEN va.nodeType = 0 THEN 1 ELSE 0 END AS isFile,
    va.logFileId AS name,
    CAST(va.parentid AS VARCHAR(50)) AS parentId,
    CONVERT(DECIMAL(9, 2), CEILING((ISNULL(va.size, 0) / 1024.00) * 100) / 100) AS size,
    CASE 
        WHEN va.nodeType = 0 AND CHARINDEX('.', REVERSE(va.logFileId)) > 0
            THEN RIGHT(va.logFileId, CHARINDEX('.', REVERSE(va.logFileId)) - 1)
        ELSE 'Folder'
    END AS type,
    fh.FullPath,
    va.version as fileVersion
FROM VisibleItems va
INNER JOIN FileHierarchy fh ON va.ID = fh.ID
LEFT JOIN QMS_FileVersionInfo fi WITH (NOLOCK) ON va.ID = fi.FileId AND va.version = fi.Version AND va.nodeType = 0
ORDER BY va.logfileID
OPTION (MAXRECURSION 200, OPTIMIZE FOR UNKNOWN);