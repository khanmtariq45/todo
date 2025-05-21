
I want all folders having access one more thing if va.nodetype is 0 then check either it parentid which obviously do that 
have access for that user please modify below accordingly
DROP TABLE IF EXISTS #AccessibleFiles;
    SELECT va.*
    INTO #AccessibleFiles
    FROM QMSdtlsFile_Log va
    INNER JOIN (
		SELECT DISTINCT FolderId
		FROM QMS_User_Folder_Access WITH (NOLOCK)
		WHERE userid = @UserId and va.nodeType = 1
		) qufa ON va.ID = qufa.FolderID
