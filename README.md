DECLARE @UserId INT = 1;

-- First, get all accessible folders for the user to filter early
WITH AccessibleFolders AS (
    SELECT FolderID 
    FROM QMS_User_Folder_Access WITH (NOLOCK)
    WHERE UserID = @UserId
),
FileHierarchy AS (
    -- Level 0 (root) - we just use \ for root
    SELECT 
        f.ID,
        f.ParentID,
        f.logFileId,
        f.nodeType,
        CAST('\ ' AS VARCHAR(900)) AS filterPath,  -- Reduced from MAX to 900
        0 AS Level,
        CAST('Documents\' + f.logFileId + '\' AS VARCHAR(900)) AS FullPath
    FROM QMSdtlsFile_Log f WITH (NOLOCK)
    WHERE f.ParentID = 0
    AND f.active_status = 1
    AND EXISTS (SELECT 1 FROM AccessibleFolders af WHERE af.FolderID = f.ID)

    UNION ALL

    -- Children (skip root logFileId and append their own logFileId and \)
    SELECT 
        child.ID,
        child.ParentID,
        child.logFileId,
        child.nodeType,
        CAST(parent.filterPath + child.logFileId + '\' AS VARCHAR(900)) AS filterPath,
        parent.Level + 1 AS Level,
        CASE WHEN child.nodeType = 1 
             THEN CAST(parent.FullPath + child.logFileId + '\' AS VARCHAR(900)) 
             ELSE CAST(parent.FullPath + child.logFileId AS VARCHAR(900)) END AS FullPath
    FROM QMSdtlsFile_Log child WITH (NOLOCK)
    INNER JOIN FileHierarchy parent ON child.ParentID = parent.ID
    WHERE child.active_status = 1
    -- Only include children of accessible folders
    AND (child.nodeType = 1 AND EXISTS (SELECT 1 FROM AccessibleFolders af WHERE af.FolderID = child.ID)
         OR child.nodeType = 0 AND EXISTS (SELECT 1 FROM AccessibleFolders af WHERE af.FolderID = parent.ID))
)

-- Final Output
SELECT 
    va.date_of_Creatation AS dateCreated,
    ISNULL(fi.date_of_creatation, va.date_of_creatation) AS dateModified,
    ISNULL(fh.filterPath, '') AS filterPath,
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
    ISNULL(fh.FullPath, '') AS fullPath,
    va.version as fileVersion
FROM QMSdtlsFile_Log va WITH (NOLOCK)
LEFT JOIN FileHierarchy fh ON va.ID = fh.ID
LEFT JOIN QMS_FileVersionInfo fi WITH (NOLOCK) ON va.ID = fi.FileId AND va.version = fi.Version AND va.nodeType = 0
WHERE va.active_status = 1
AND (
    (va.nodeType = 1 AND EXISTS (SELECT 1 FROM AccessibleFolders af WHERE af.FolderID = va.ID))
    OR
    (va.nodeType = 0 AND EXISTS (SELECT 1 FROM AccessibleFolders af WHERE af.FolderID = va.ParentID))
)
ORDER BY va.logfileID
OPTION (MAXRECURSION 200, OPTIMIZE FOR UNKNOWN);