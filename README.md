I have one SP which is giving me timeout error please improve it in a such a way that its functionality is not disturbed 

CREATE OR ALTER PROCEDURE [qms].[SP_Get_QMS_Document_Tree] 
@UserId INT
AS
BEGIN
	BEGIN TRY
		SET NOCOUNT ON;

		-- First, get all accessible folders for the user to filter early
		WITH AccessibleFolders
		AS (
			SELECT DISTINCT FolderID
			FROM QMS_User_Folder_Access WITH (NOLOCK)
			WHERE UserID = @UserId
			) 
            ,FileHierarchy AS (
			-- Level 0 (root) - we just use \ for root
			SELECT f.ID
				,f.ParentID
				,f.logFileId
				,f.nodeType
				,CAST('\ ' AS VARCHAR(1000)) AS filterPath
				,0 AS LEVEL
				,CAST('Documents\' + f.logFileId + '\' AS VARCHAR(1000)) AS FullPath
			FROM QMSdtlsFile_Log f WITH (NOLOCK)
			WHERE f.ParentID = 0
				AND f.active_status = 1
			
			UNION ALL
			
			-- Children (skip root logFileId and append their own logFileId and \)
			SELECT child.ID
				,child.ParentID
				,child.logFileId
				,child.nodeType
				,CAST(parent.filterPath + child.logFileId + '\' AS VARCHAR(1000)) AS filterPath
				,parent.LEVEL + 1 AS LEVEL
				,CASE 
					WHEN child.nodeType = 1
						THEN CAST(parent.FullPath + child.logFileId + '\' AS VARCHAR(1000))
					ELSE CAST(parent.FullPath + child.logFileId AS VARCHAR(1000))
					END AS FullPath
			FROM QMSdtlsFile_Log child WITH (NOLOCK)
			INNER JOIN FileHierarchy parent ON child.ParentID = parent.ID
			WHERE child.active_status = 1
			)
		-- Final Output
		SELECT va.date_of_Creatation AS dateCreated
			,ISNULL(fi.date_of_creatation, va.date_of_creatation) AS dateModified
			,ISNULL(fh.filterPath, '') AS filterPath
			,CASE 
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
				END AS hasChild
			,CAST(va.ID AS VARCHAR(50)) AS id
			,CASE 
				WHEN va.nodeType = 0 THEN 1
				ELSE 0
				END AS isFile
			,va.logFileId AS name
			,CAST(va.parentid AS VARCHAR(50)) AS parentId
			,CONVERT(DECIMAL(9, 2), CEILING((ISNULL(va.size, 0) / 1024.00) * 100) / 100) AS size
			,CASE 
				WHEN va.nodeType = 0
					AND CHARINDEX('.', REVERSE(va.logFileId)) > 0
					THEN RIGHT(va.logFileId, CHARINDEX('.', REVERSE(va.logFileId)) - 1)
				ELSE 'Folder'
				END AS type
			,ISNULL(fh.FullPath, '') AS fullPath
			,CASE 
				WHEN va.nodeType = 1 THEN NULL
				ELSE va.version
				END AS fileVersion
		FROM QMSdtlsFile_Log va WITH (NOLOCK)
		LEFT JOIN FileHierarchy fh ON va.ID = fh.ID
		LEFT JOIN QMS_FileVersionInfo fi WITH (NOLOCK) ON va.ID = fi.FileId
			AND va.version = fi.Version
			AND va.nodeType = 0
		WHERE va.active_status = 1
			AND (
				(va.nodeType = 1
					AND EXISTS (SELECT 1 FROM AccessibleFolders af
						WHERE af.FolderID = va.ID)
					) OR (va.nodeType = 0
					AND EXISTS (SELECT 1 FROM AccessibleFolders af
						WHERE af.FolderID = va.ParentID)
					)
				)
		ORDER BY va.logfileID
		OPTION (MAXRECURSION 200,OPTIMIZE FOR UNKNOWN);
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



while indexes are 


TableName	IndexName	ColumnName	is_primary_key	is_unique	IndexType
QMSdtlsFile_Log	PK_QMSdtlsFile_Log	ID	1	1	CLUSTERED
QMSdtlsFile_Log	QMSdtlsFile_Log_ActiveStatus_NodeType_Idx	ID	0	0	NONCLUSTERED
QMSdtlsFile_Log	QMSdtlsFile_Log_ActiveStatus_NodeType_Idx	LogFileID	0	0	NONCLUSTERED
QMSdtlsFile_Log	QMSdtlsFile_Log_ActiveStatus_NodeType_Idx	FilePath	0	0	NONCLUSTERED
QMSdtlsFile_Log	QMSdtlsFile_Log_ActiveStatus_NodeType_Idx	Version	0	0	NONCLUSTERED
QMSdtlsFile_Log	QMSdtlsFile_Log_ActiveStatus_NodeType_Idx	ParentID	0	0	NONCLUSTERED
QMSdtlsFile_Log	QMSdtlsFile_Log_ActiveStatus_NodeType_Idx	Active_Status	0	0	NONCLUSTERED
QMSdtlsFile_Log	QMSdtlsFile_Log_ActiveStatus_NodeType_Idx	NodeType	0	0	NONCLUSTERED
QMSdtlsFile_Log	QMSdtlsFile_Log_ParentID_IDX	ParentID	0	0	NONCLUSTERED
QMSdtlsFile_Log	QMSdtlsFile_Log_ParentID_IDX	Active_Status	0	0	NONCLUSTERED
QMSdtlsFile_Log	QMSdtlsFile_Log_ParentID_IDX	NodeType	0	0	NONCLUSTERED
QMSdtlsFile_Log	QMSdtlsFile_Log_VersionIDActive_idx	Version	0	0	NONCLUSTERED
QMSdtlsFile_Log	QMSdtlsFile_Log_VersionIDActive_idx	ID	0	0	NONCLUSTERED
QMSdtlsFile_Log	QMSdtlsFile_Log_VersionIDActive_idx	Active_Status	0	0	NONCLUSTERED
