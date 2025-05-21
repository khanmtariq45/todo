CREATE OR ALTER PROCEDURE [qms].[SP_Get_QMS_Document_Tree] 
@UserId INT
AS
BEGIN
BEGIN TRY
    -- Create temp table for accessible folders/files upfront to avoid multiple subqueries
    DROP TABLE IF EXISTS #AccessibleItems;
    SELECT DISTINCT 
        FolderID AS ItemID,
        1 AS IsFolder
    INTO #AccessibleItems
    FROM QMS_User_Folder_Access WITH (NOLOCK)
    WHERE UserID = @UserId;
    
    -- Also include files that are children of accessible folders
    INSERT INTO #AccessibleItems (ItemID, IsFolder)
    SELECT DISTINCT 
        f.ID,
        0 AS IsFolder
    FROM QMSdtlsFile_Log f WITH (NOLOCK)
    INNER JOIN QMS_User_Folder_Access fa WITH (NOLOCK) ON f.ParentID = fa.FolderID
    WHERE fa.UserID = @UserId AND f.nodeType = 0 AND f.active_status = 1;
    
    CREATE CLUSTERED INDEX IX_AccessibleItems ON #AccessibleItems (ItemID, IsFolder);

    -- Identify parents for hasChild
    DROP TABLE IF EXISTS #Orphans;
    SELECT DISTINCT ParentID 
    INTO #Orphans 
    FROM QMSdtlsFile_Log WITH (NOLOCK)
    WHERE active_status = 0;

    CREATE CLUSTERED INDEX CX_#Orphans ON #Orphans (ParentID);

    -- Step 2: Recursive CTE to build hierarchy and full path (skip root's logFileId)
    WITH FileHierarchy AS (
        -- Level 0 (root) - we just use \ for root
        SELECT 
            ID,
            ParentID,
            logFileId,
            CAST('\ ' AS VARCHAR(MAX)) AS filterPath,
            0 AS Level,
            CAST('Documents\' + logFileId+'\' AS VARCHAR(MAX)) AS FullPath,
            nodeType
        FROM QMSdtlsFile_Log WITH (NOLOCK)
        WHERE ParentID = 0 AND active_status = 1

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
                ELSE CAST(parent.FullPath + child.logFileId AS VARCHAR(MAX)) 
            END AS FullPath,
            child.nodeType
        FROM QMSdtlsFile_Log child WITH (NOLOCK)
        INNER JOIN FileHierarchy parent ON child.ParentID = parent.ID
        WHERE child.active_status = 1
    )

    -- Step 3: Final Output
    SELECT DISTINCT -- Added DISTINCT to eliminate duplicates
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
    INNER JOIN #AccessibleItems ai ON va.ID = ai.ItemID AND 
                                    ((ai.IsFolder = 1 AND va.nodeType = 1) OR 
                                     (ai.IsFolder = 0 AND va.nodeType = 0))
    LEFT OUTER JOIN #Orphans o ON o.ParentID = va.ID
    LEFT JOIN FileHierarchy fh ON va.ID = fh.ID
    LEFT JOIN QMS_FileVersionInfo fi WITH (NOLOCK) ON va.ID = fi.FileId and va.version = fi.Version AND va.nodeType = 0
    WHERE va.active_status = 1
    ORDER BY va.nodeType DESC, va.logfileID -- Folders first, then files
    OPTION (MAXRECURSION 200, OPTIMIZE FOR UNKNOWN); -- Added query hint
END TRY
BEGIN CATCH
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    EXEC inf_log_write 'qms', 'QMS', 'SP_Get_QMS_Document_Tree', 1, 'SP_Get_QMS_Document_Tree', @ErrorMessage;
    RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;
END;