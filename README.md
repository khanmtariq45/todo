DECLARE @FolderID BIGINT = NULL;

DROP TABLE IF EXISTS #ParentFolders;

CREATE TABLE #ParentFolders (
    FOLDER_ID INT,
    PARENT_FOLDER_ID INT,
    XPATH VARCHAR(MAX),
    FOLDER_NAME VARCHAR(500),
    XNPATH VARCHAR(MAX),
    Opath VARCHAR(MAX),
    HaveChild BIT
);

-- Insert the top-level folders based on @FolderID
INSERT INTO #ParentFolders
SELECT 
    ID AS FOLDER_ID,                 
    ParentID AS PARENT_FOLDER_ID,                 
    CONVERT(VARCHAR(MAX), ID + '/') AS XPATH,                
    LogFileID AS FOLDER_NAME,                
    CONVERT(VARCHAR(MAX), LogFileID + '/') AS XNPATH,            
    FilePath + '/' AS Opath,
    0 AS HaveChild
FROM QMSDTLSFILE_LOG                 
WHERE ACTIVE_STATUS = 1 
    AND NodeType = 1 
    AND (ParentID = 0 OR (ParentID = @FolderID AND @FolderID IS NOT NULL));

-- Recursive CTE to get all child folders
WITH RecursiveFolders AS (
    SELECT 
        ID,
        ParentID,
        CONVERT(VARCHAR(MAX), ID + '/') AS XPATH,
        LogFileID AS FOLDER_NAME,
        CONVERT(VARCHAR(MAX), LogFileID + '/') AS XNPATH,
        FilePath + '/' AS Opath
    FROM QMSDTLSFILE_LOG
    WHERE ACTIVE_STATUS = 1 
        AND NodeType = 1 
        AND (ParentID = 0 OR (ParentID = @FolderID AND @FolderID IS NOT NULL))
    
    UNION ALL
    
    SELECT 
        DtlLog.ID,
        DtlLog.ParentID,
        CONVERT(VARCHAR(MAX), RecursiveFolders.XPATH + CONVERT(VARCHAR, DtlLog.ID) + '/') AS XPATH,
        DtlLog.LogFileID AS FOLDER_NAME,
        CONVERT(VARCHAR(MAX), RecursiveFolders.XNPATH + CONVERT(VARCHAR, DtlLog.LogFileID) + '/') AS XNPATH,
        DtlLog.FilePath + '/' AS Opath
    FROM QMSDTLSFILE_LOG DtlLog
    INNER JOIN RecursiveFolders ON DtlLog.ParentID = RecursiveFolders.ID
    WHERE DtlLog.ACTIVE_STATUS = 1 
        AND DtlLog.NodeType = 1
)

-- Insert all child folders into #ParentFolders
INSERT INTO #ParentFolders (FOLDER_ID, PARENT_FOLDER_ID, XPATH, FOLDER_NAME, XNPATH, Opath, HaveChild)
SELECT 
    ID,
    ParentID,
    XPATH,
    FOLDER_NAME,
    XNPATH,
    Opath,
    0
FROM RecursiveFolders;

-- Update HaveChild column
UPDATE pf
SET pf.HaveChild = 1
FROM #ParentFolders pf
JOIN #ParentFolders child ON pf.FOLDER_ID = child.PARENT_FOLDER_ID;

SELECT * FROM #ParentFolders ORDER BY FOLDER_NAME;