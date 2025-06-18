

declare @UserId INT = 1;
    WITH FileHierarchy AS (
        -- Level 0 (root) - we just use \ for root
        SELECT 
            ID,
            ParentID,
            logFileId,
            CAST('\ ' AS VARCHAR(MAX)) AS filterPath,  -- Root is just \ (skip logFileId)
            0 AS Level,
            CAST('Documents\' + logFileId+'\' AS VARCHAR(MAX)) AS FullPath
        FROM QMSdtlsFile_Log
        WHERE ParentID = 0

        UNION ALL

        -- Children (skip root logFileId and append their own logFileId and \)
        SELECT 
            child.ID,
            child.ParentID,
            child.logFileId,
            CAST(parent.filterPath + child.logFileId + '\' AS VARCHAR(MAX)) AS filterPath,
                        parent.Level + 1 AS Level,
            CASE WHEN child.nodetype=1 
            THEN CAST(parent.FullPath + child.logFileId + '\' AS VARCHAR(MAX)) 
            ELSE CAST(parent.FullPath + child.logFileId AS VARCHAR(MAX)) END AS FullPath
        FROM QMSdtlsFile_Log child
        INNER JOIN FileHierarchy parent ON child.ParentID = parent.ID
    )

    -- Step 3: Final Output
    SELECT 
        va.date_of_Creatation AS dateCreated,
        ISNULL(fi.date_of_creatation, va.date_of_creatation) AS dateModified,

        -- Filter Path (skip root folder)
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

        CASE 
            WHEN va.nodeType = 0 THEN 1 ELSE 0
        END AS isFile,

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
    LEFT JOIN QMS_FileVersionInfo fi ON va.ID = fi.FileId and va.version = fi.Version AND va.nodeType = 0
    WHERE va.active_status = 1
    and (exists (select 1 from QMS_User_Folder_Access qufa 
                    where qufa.UserID = @UserId 
                    AND va.ID = qufa.FolderID
                            AND va.nodeType = 1)
        or exists (select 1 from QMS_User_Folder_Access qufa 
                    where qufa.UserID = @UserId 
                    AND va.ParentID = qufa.FolderID
                            AND va.nodeType = 0)
            )
        ORDER BY va.logfileID
    OPTION (MAXRECURSION 200);
