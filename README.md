DECLARE @UserId INT = 1;

-- Materialize accessible folders into temp table
CREATE TABLE #AccessibleFolders (FolderID INT PRIMARY KEY);
INSERT INTO #AccessibleFolders (FolderID)
SELECT FolderID 
FROM QMS_User_Folder_Access WITH (NOLOCK)
WHERE UserID = @UserId;

-- Build hierarchy with necessary columns
WITH FileHierarchy AS (
    SELECT 
        f.ID,
        f.ParentID,
        f.logFileId,
        f.nodeType,
        CAST('\ ' AS VARCHAR(1000)) AS filterPath,
        0 AS Level,
        CAST('Documents\' + f.logFileId + '\' AS VARCHAR(1000)) AS FullPath,
        f.date_of_Creatation,
        f.size,
        f.version
    FROM QMSdtlsFile_Log f WITH (NOLOCK)
    WHERE f.ParentID = 0
        AND f.active_status = 1
        AND EXISTS (SELECT 1 FROM #AccessibleFolders af WHERE af.FolderID = f.ID)

    UNION ALL

    SELECT 
        child.ID,
        child.ParentID,
        child.logFileId,
        child.nodeType,
        CAST(parent.filterPath + child.logFileId + '\' AS VARCHAR(1000)) AS filterPath,
        parent.Level + 1 AS Level,
        CASE WHEN child.nodeType = 1 
             THEN CAST(parent.FullPath + child.logFileId + '\' AS VARCHAR(1000)) 
             ELSE CAST(parent.FullPath + child.logFileId AS VARCHAR(1000)) END AS FullPath,
        child.date_of_Creatation,
        child.size,
        child.version
    FROM QMSdtlsFile_Log child WITH (NOLOCK)
    INNER JOIN FileHierarchy parent ON child.ParentID = parent.ID
    WHERE child.active_status = 1
        AND (
            (child.nodeType = 1 AND EXISTS (SELECT 1 FROM #AccessibleFolders af WHERE af.FolderID = child.ID))
            OR (child.nodeType = 0 AND EXISTS (SELECT 1 FROM #AccessibleFolders af WHERE af.FolderID = parent.ID))
        )
)

-- Final optimized output
SELECT 
    fh.date_of_Creatation AS dateCreated,
    ISNULL(fi.date_of_creatation, fh.date_of_Creatation) AS dateModified,
    fh.filterPath,
    CASE
        WHEN fh.nodeType = 1 AND EXISTS (
            SELECT 1
            FROM QMSdtlsFile_Log child WITH (NOLOCK)
            WHERE child.ParentID = fh.ID 
                AND child.active_status = 1 
                AND child.nodeType = 1
        ) THEN 1
        ELSE 0
    END AS hasChild,
    CAST(fh.ID AS VARCHAR(50)) AS id,
    CASE WHEN fh.nodeType = 0 THEN 1 ELSE 0 END AS isFile,
    fh.logFileId AS name,
    CAST(fh.parentid AS VARCHAR(50)) AS parentId,
    CONVERT(DECIMAL(9, 2), CEILING((ISNULL(fh.size, 0) / 1024.00) * 100) / 100) AS size,
    CASE 
        WHEN fh.nodeType = 0 AND CHARINDEX('.', REVERSE(fh.logFileId)) > 0
            THEN RIGHT(fh.logFileId, CHARINDEX('.', REVERSE(fh.logFileId)) - 1)
        ELSE 'Folder'
    END AS type,
    fh.FullPath AS fullPath,
    fh.version AS fileVersion
FROM FileHierarchy fh
LEFT JOIN QMS_FileVersionInfo fi WITH (NOLOCK) 
    ON fh.ID = fi.FileId 
    AND fh.version = fi.Version 
    AND fh.nodeType = 0
ORDER BY fh.logfileID
OPTION (MAXRECURSION 200);

DROP TABLE #AccessibleFolders;