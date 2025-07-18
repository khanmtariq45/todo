CREATE OR ALTER PROCEDURE [qms].[SP_Get_QMS_Core_Main_Tree] 
    @UserId INT
AS
BEGIN
    BEGIN TRY
        SET NOCOUNT ON;

        -- Step 1: AccessibleFolders temp table
        DROP TABLE IF EXISTS #AccessibleFolders;
        CREATE TABLE #AccessibleFolders (FolderID INT PRIMARY KEY);
        
        INSERT INTO #AccessibleFolders (FolderID)
        SELECT DISTINCT FolderID
        FROM qms.QMS_User_Folder_Access WITH (NOLOCK)
        WHERE UserID = @UserId;

        -- Step 2: FileHierarchy temp table with MAX length for folderPath
        DROP TABLE IF EXISTS #FileHierarchy;
        CREATE TABLE #FileHierarchy (
            ID INT PRIMARY KEY,
            LogFileID VARCHAR(1000),
            ParentID INT,
            nodeType INT,
            folderPath VARCHAR(MAX)  -- Changed to MAX to prevent truncation
        );
        CREATE NONCLUSTERED INDEX IX_FileHierarchy_ParentID ON #FileHierarchy (ParentID) INCLUDE (ID);

        -- Optimized hierarchy population using recursive CTE with consistent types
        ;WITH FolderCTE AS (
            SELECT 
                ID, 
                LogFileID, 
                ParentID, 
                nodeType,
                CAST('/' + CAST(ID AS VARCHAR(30)) + '/' AS VARCHAR(MAX)) AS folderPath
            FROM qms.QMSdtlsFile_Log WITH (NOLOCK)
            WHERE 
                ParentID = 0
                AND active_status = 1
                AND nodeType = 1
            UNION ALL
            SELECT 
                child.ID,
                child.LogFileID,
                child.ParentID,
                child.nodeType,
                CAST(parent.folderPath + CAST(child.ID AS VARCHAR(30)) + '/' AS VARCHAR(MAX))
            FROM qms.QMSdtlsFile_Log child WITH (NOLOCK)
            INNER JOIN FolderCTE parent ON child.ParentID = parent.ID
            WHERE 
                child.active_status = 1
                AND child.nodeType = 1
        )
        INSERT INTO #FileHierarchy (ID, LogFileID, ParentID, nodeType, folderPath)
        SELECT ID, LogFileID, ParentID, nodeType, folderPath
        FROM FolderCTE
        OPTION (MAXRECURSION 1000);

        -- Precompute child/folder existence flags
        DROP TABLE IF EXISTS #FolderStatus;
        CREATE TABLE #FolderStatus (
            FolderID INT PRIMARY KEY,
            HasChildFolders BIT,
            HasFiles BIT
        );

        INSERT INTO #FolderStatus (FolderID, HasChildFolders, HasFiles)
        SELECT 
            fh.ID,
            CASE WHEN EXISTS (
                SELECT 1 
                FROM #FileHierarchy child 
                WHERE child.ParentID = fh.ID
            ) THEN 1 ELSE 0 END,
            CASE WHEN EXISTS (
                SELECT 1 
                FROM qms.QMSdtlsFile_Log child WITH (NOLOCK)
                WHERE child.ParentID = fh.ID
                    AND child.active_status = 1
                    AND child.nodeType = 0
            ) THEN 1 ELSE 0 END
        FROM #FileHierarchy fh;

        -- Optimized final output
        SELECT 
            CAST(va.ID AS VARCHAR(50)) AS id,
            va.logFileId AS name,
            CAST(va.parentid AS VARCHAR(50)) AS parentId,
            CASE WHEN fs.HasChildFolders = 1 THEN 'true' ELSE 'false' END AS hasChild,
            CASE WHEN fs.HasFiles = 1 THEN 'true' ELSE 'false' END AS hasFile,
            fh.folderPath
        FROM qms.QMSdtlsFile_Log va WITH (NOLOCK)
        INNER JOIN #FileHierarchy fh ON va.ID = fh.ID
        INNER JOIN #FolderStatus fs ON va.ID = fs.FolderID
        WHERE 
            va.active_status = 1
            AND va.nodeType = 1
            AND EXISTS (
                SELECT 1 
                FROM #AccessibleFolders af 
                WHERE af.FolderID = va.ID
            )
        ORDER BY va.id;

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        EXEC inf_log_write 
            @ModuleName = 'qms',
            @SubModuleName = 'QMS',
            @Functionality = 'SP_Get_QMS_Core_Main_Tree',
            @ErrorCode = 1,
            @ErrorObject = 'SP_Get_QMS_Core_Main_Tree',
            @ErrorMessage = @ErrorMessage;
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;