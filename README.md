/****** Object:  StoredProcedure [qms].[SP_Get_QMS_Core_Main_Tree]  Script Date: 14/07/2025 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Saeed Ahmad
-- Create date: 14/07/2025
-- Description:	It is used to get all files and folders in QMS for Teekay UI
-- =============================================
CREATE OR ALTER PROCEDURE [qms].[SP_Get_QMS_Core_Main_Tree] 
@UserId INT
AS
BEGIN
	BEGIN TRY
		SET NOCOUNT ON;
		-- Step 1: AccessibleFolders temp table
		DROP Table if exists #AccessibleFolders
		DROP Table if exists #FileHierarchy 
		CREATE TABLE #AccessibleFolders (FolderID INT PRIMARY KEY);
		INSERT INTO #AccessibleFolders (FolderID)
		SELECT DISTINCT FolderID
		FROM QMS_User_Folder_Access WITH (NOLOCK)
		WHERE UserID = @UserId;
		-- Step 2: FileHierarchy temp table
		CREATE TABLE #FileHierarchy (
			ID INT PRIMARY KEY,
			LogFileID VARCHAR(1000),
			ParentID INT,
			nodeType INT,
			folderPath VARCHAR(1000)
		);
		-- Insert root nodes
		INSERT INTO #FileHierarchy (ID, LogFileID, ParentID, nodeType, folderPath)
		SELECT f.ID,
			f.LogFileID,
			f.ParentID,
			f.nodeType,
			'/' + CAST(ISNULL(f.ID, 0) AS VARCHAR(100)) + '/'
		FROM QMSdtlsFile_Log f WITH (NOLOCK)
		WHERE f.ParentID = 0
			AND f.active_status = 1
			AND f.nodeType = 1;
		-- Step 3: Recursively insert children
		DECLARE @RowsInserted INT = 1;
		WHILE @RowsInserted > 0
		BEGIN
			INSERT INTO #FileHierarchy (ID, LogFileID, ParentID, nodeType, folderPath)
			SELECT child.ID,
				child.logFileId,
				child.ParentID,
				child.nodeType,
				parent.folderPath + CAST(ISNULL(child.ID, 0) AS VARCHAR(100)) + '/'
			FROM QMSdtlsFile_Log child WITH (NOLOCK)
			INNER JOIN #FileHierarchy parent ON child.ParentID = parent.ID
			WHERE child.active_status = 1
				AND child.nodeType = 1
				AND NOT EXISTS (SELECT 1 FROM #FileHierarchy fh WHERE fh.ID = child.ID);
			SET @RowsInserted = @@ROWCOUNT;
		END
		-- Step 4: Final Output (replace CTEs with temp tables)
		SELECT 
			CAST(va.ID AS VARCHAR(50)) AS id,
			va.logFileId AS name,
			CAST(va.parentid AS VARCHAR(50)) AS parentId,
			CASE 
				WHEN va.nodeType = 1
					AND EXISTS (
						SELECT 1
						FROM #FileHierarchy child
						WHERE child.ParentID = va.ID
							AND child.nodeType = 1
					)
					THEN 'true'
				ELSE 'false'
				END AS hasChild,
			CASE 
				WHEN va.nodeType = 1
					AND EXISTS (
						SELECT 1
						FROM QMSdtlsFile_Log child WITH (NOLOCK)
						WHERE child.ParentID = va.ID
							AND child.active_status = 1
							AND child.nodeType = 0
					)
					THEN 'true'
				ELSE 'false'
				END AS hasFile,
			ISNULL(fh.folderpath, '') AS folderPath
		FROM QMSdtlsFile_Log va WITH (NOLOCK)
		LEFT JOIN #FileHierarchy fh ON va.ID = fh.ID
		LEFT JOIN QMS_FileVersionInfo fi WITH (NOLOCK) ON va.ID = fi.FileId
			AND va.version = fi.Version
			AND va.nodeType = 1
		WHERE va.active_status = 1
			AND (
				(va.nodeType = 1
					AND EXISTS (SELECT 1 FROM #AccessibleFolders af
						WHERE af.FolderID = va.ID)
					) OR (va.nodeType = 0
					AND EXISTS (SELECT 1 FROM #AccessibleFolders af
						WHERE af.FolderID = va.ParentID)
					)
				)
			AND (
				(va.nodeType = 1
					AND EXISTS (SELECT 1 FROM #AccessibleFolders af
						WHERE af.FolderID = va.ID)
					) OR (va.nodeType = 0
					AND EXISTS (SELECT 1 FROM #AccessibleFolders af
						WHERE af.FolderID = va.ParentID)
					)
				)
			AND va.nodeType = 1			
		ORDER BY va.id
		OPTION (OPTIMIZE FOR UNKNOWN);
		DROP TABLE #AccessibleFolders;
		DROP TABLE #FileHierarchy;
	END TRY
	BEGIN CATCH
		DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
		DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
		DECLARE @ErrorState INT = ERROR_STATE();
		EXEC inf_log_write 'qms'
			,'QMS'
			,'SP_Get_QMS_Core_Main_Tree'
			,1
			,'SP_Get_QMS_Core_Main_Tree'
			,@ErrorMessage;
		RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
	END CATCH;
END;
