DROP TABLE IF EXISTS #AccessibleFiles;

SELECT DISTINCT va.*
INTO #AccessibleFiles
FROM QMSdtlsFile_Log va
WHERE 
    (
        va.NodeType = 1 AND EXISTS (
            SELECT 1
            FROM QMS_User_Folder_Access qufa WITH (NOLOCK)
            WHERE qufa.UserId = @UserId AND qufa.FolderId = va.ID
        )
    )
    OR
    (
        va.NodeType = 0 AND EXISTS (
            SELECT 1
            FROM QMS_User_Folder_Access qufa WITH (NOLOCK)
            WHERE qufa.UserId = @UserId AND qufa.FolderId = va.ParentId
        )
    );