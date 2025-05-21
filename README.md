there are two issue one is that it is taking a lot of time may be we can optimize by any indexing addition or something else 
second problem is that it is giving me some duplicate record may be due to folder record multiple entries are present for one user

CREATE OR ALTER PROCEDURE [qms].[SP_Get_QMS_Document_Tree] 
@UserId INT
AS
BEGIN
BEGIN TRY
    -- Step 1: Identify parents for hasChild
    DROP TABLE IF EXISTS #Orphans;
    SELECT DISTINCT ParentID 
    INTO #Orphans 
    FROM QMSdtlsFile_Log 
    WHERE active_status = 0;

    CREATE CLUSTERED INDEX CX_#Orphans ON #Orphans (ParentID);

    -- Step 2: Recursive CTE to build hierarchy and full path (skip root's logFileId)
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
    LEFT OUTER JOIN #Orphans o ON o.ParentID = va.ID
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
    OPTION (MAXRECURSION 200); -- Support deep hierarchies
END TRY
 BEGIN CATCH
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
 EXEC inf_log_write 'qms'
   ,'QMS'
   ,'SP_Get_QMS_Document_Tree'
   ,1
   ,'SP_Get_QMS_Document_Tree'
   ,@ErrorMessage;
 
    RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;
END;
