CREATE OR ALTER PROCEDURE [qms].[SP_Get_QMS_Document_Tree] 
@UserId INT
AS
BEGIN
	BEGIN TRY
		SET NOCOUNT ON;

		-- Create temporary table for accessible folders
		CREATE TABLE #AccessibleFolders (FolderID INT PRIMARY KEY);
		
		INSERT INTO #AccessibleFolders
		SELECT DISTINCT FolderID
		FROM QMS_User_Folder_Access WITH (NOLOCK)
		WHERE UserID = @UserId;

		-- Create index on temp table
		CREATE INDEX IX_AccessibleFolders ON #AccessibleFolders(FolderID);

		-- Get all needed folders (accessible + their ancestors)
		WITH AllNeededFolders AS (
			SELECT FolderID AS ID FROM #AccessibleFolders
			UNION ALL
			SELECT f.ParentID
			FROM QMSdtlsFile_Log f WITH (NOLOCK)
			INNER JOIN AllNeededFolders anf ON f.ID = anf.ID
			WHERE f.ParentID != 0
			AND f.active_status = 1
		),
		DistinctNeededFolders AS (
			SELECT DISTINCT ID FROM AllNeededFolders
		)
		SELECT ID INTO #NeededFolders FROM DistinctNeededFolders;

		CREATE INDEX IX_NeededFolders ON #NeededFolders(ID);

		-- File hierarchy CTE
		WITH FileHierarchy AS (
			SELECT 
				f.ID,
				f.ParentID,
				f.logFileId,
				f.nodeType,
				CAST('\' AS VARCHAR(1000)) AS filterPath,
				0 AS LEVEL,
				CAST('Documents\' + f.logFileId + '\' AS VARCHAR(1000)) AS FullPath
			FROM QMSdtlsFile_Log f WITH (NOLOCK)
			WHERE f.ParentID = 0
				AND f.active_status = 1
				AND f.nodeType = 1
				AND EXISTS (SELECT 1 FROM #NeededFolders nf WHERE nf.ID = f.ID)
			
			UNION ALL
			
			SELECT 
				child.ID,
				child.ParentID,
				child.logFileId,
				child.nodeType,
				CAST(parent.filterPath + child.logFileId + '\' AS VARCHAR(1000)),
				parent.LEVEL + 1,
				CASE 
					WHEN child.nodeType = 1
						THEN CAST(parent.FullPath + child.logFileId + '\' AS VARCHAR(1000))
					ELSE CAST(parent.FullPath + child.logFileId AS VARCHAR(1000))
				END
			FROM QMSdtlsFile_Log child WITH (NOLOCK)
			INNER JOIN FileHierarchy parent ON child.ParentID = parent.ID
			WHERE child.active_status = 1
				AND EXISTS (SELECT 1 FROM #NeededFolders nf WHERE nf.ID = child.ID)
		)
		-- Final Output
		SELECT 
			va.date_of_Creatation AS dateCreated,
			ISNULL(fi.date_of_creatation, va.date_of_creatation) AS dateModified,
			ISNULL(fh.filterPath, '') AS filterPath,
			CASE 
				WHEN va.nodeType = 1
					AND EXISTS (
						SELECT 1
						FROM QMSdtlsFile_Log child WITH (NOLOCK)
						WHERE child.ParentID = va.ID
							AND child.active_status = 1
							AND child.nodeType = 1
						)
					THEN 1
				ELSE 0
			END AS hasChild,
			CAST(va.ID AS VARCHAR(50)) AS id,
			CASE 
				WHEN va.nodeType = 0 THEN 1
				ELSE 0
			END AS isFile,
			va.logFileId AS name,
			CAST(va.parentid AS VARCHAR(50)) AS parentId,
			CONVERT(DECIMAL(9, 2), CEILING((ISNULL(va.size, 0) / 1024.00) * 100) / 100) AS size,
			CASE 
				WHEN va.nodeType = 0
					AND CHARINDEX('.', REVERSE(va.logFileId)) > 0
					THEN RIGHT(va.logFileId, CHARINDEX('.', REVERSE(va.logFileId)) - 1)
				ELSE 'Folder'
			END AS type,
			ISNULL(fh.FullPath, '') AS fullPath,
			CASE 
				WHEN va.nodeType = 1 THEN NULL
				ELSE va.version
			END AS fileVersion
		FROM QMSdtlsFile_Log va WITH (NOLOCK)
		LEFT JOIN FileHierarchy fh ON va.ID = fh.ID
		LEFT JOIN QMS_FileVersionInfo fi WITH (NOLOCK) 
			ON va.ID = fi.FileId
			AND va.version = fi.Version
			AND va.nodeType = 0
		WHERE va.active_status = 1
			AND (
				(va.nodeType = 1 AND EXISTS (SELECT 1 FROM #AccessibleFolders af WHERE af.FolderID = va.ID))
				OR (va.nodeType = 0 AND EXISTS (SELECT 1 FROM #AccessibleFolders af WHERE af.FolderID = va.ParentID))
			)
		ORDER BY va.logfileID
		OPTION (MAXRECURSION 200, OPTIMIZE FOR UNKNOWN);

		-- Cleanup temporary tables
		DROP TABLE #AccessibleFolders;
		DROP TABLE #NeededFolders;

	END TRY
	BEGIN CATCH
		DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
		DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
		DECLARE @ErrorState INT = ERROR_STATE();

		-- Cleanup temporary tables in case of error
		IF OBJECT_ID('tempdb..#AccessibleFolders') IS NOT NULL
			DROP TABLE #AccessibleFolders;
		IF OBJECT_ID('tempdb..#NeededFolders') IS NOT NULL
			DROP TABLE #NeededFolders;

		EXEC inf_log_write 'qms', 'QMS', 'SP_Get_QMS_Document_Tree', 1, 'SP_Get_QMS_Document_Tree', @ErrorMessage;
		RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
	END CATCH;
END;