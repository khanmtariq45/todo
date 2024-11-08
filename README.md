DECLARE @FoderID BIGINT = NULL;

DROP TABLE IF EXISTS #ParentFolders;
DROP TABLE IF EXISTS #subfolder;

CREATE TABLE #ParentFolders (
    FOLDER_ID INT,
    PARENT_FOLDER_ID INT,
    XPATH VARCHAR(MAX),
    FOLDER_NAME VARCHAR(500),
    XNPATH VARCHAR(MAX),
    Opath VARCHAR(MAX),
    HaveChild BIT
);

CREATE TABLE #subfolder (
    ID INT,
    ParentID INT,
    XPATH VARCHAR(MAX),
    FOLDER_NAME VARCHAR(500),
    XNPATH VARCHAR(MAX),
    Opath VARCHAR(MAX)
);

IF @FoderID IS NULL    
BEGIN          
    INSERT INTO #ParentFolders    
    SELECT      
        ID AS FOLDER_ID,                 
        ParentID AS PARENT_FOLDER_ID,                 
        CONVERT(VARCHAR(MAX), CONVERT(VARCHAR(MAX), ID) + '/') AS XPATH,                
        LogFileID AS FOLDER_NAME,                
        CONVERT(VARCHAR(MAX), CONVERT(VARCHAR(MAX), LogFileID) + '/') AS XNPATH,            
        FilePath + '/' AS Opath,
        0
    FROM QMSDTLSFILE_LOG                 
    WHERE ACTIVE_STATUS = 1 AND ParentID = 0 AND NodeType = 1;    

    INSERT INTO #subfolder    
    SELECT             
        DtlLog.ID,                 
        DtlLog.ParentID AS ParentID,                 
        CONVERT(VARCHAR(MAX), CONVERT(VARCHAR(MAX), DtlLog.ID) + '/') AS XPATH,                
        DtlLog.LogFileID AS FOLDER_NAME,                
        CONVERT(VARCHAR(MAX), CONVERT(VARCHAR(MAX), DtlLog.LogFileID) + '/') AS XNPATH,            
        DtlLog.FilePath + '/' AS Opath            
    FROM QMSDTLSFILE_LOG DtlLog            
    INNER JOIN #ParentFolders ParentList ON ParentList.FOLDER_ID = DtlLog.ParentID            
    WHERE DtlLog.ACTIVE_STATUS = 1 AND DtlLog.NodeType = 1;     
END    
ELSE    
BEGIN    
    INSERT INTO #ParentFolders    
    SELECT      
        ID AS FOLDER_ID,                 
        ParentID AS PARENT_FOLDER_ID,                 
        CONVERT(VARCHAR(MAX), CONVERT(VARCHAR(MAX), ID) + '/') AS XPATH,                
        LogFileID AS FOLDER_NAME,                
        CONVERT(VARCHAR(MAX), CONVERT(VARCHAR(MAX), LogFileID) + '/') AS XNPATH,            
        FilePath + '/' AS Opath 
    FROM QMSDTLSFILE_LOG                 
    WHERE ACTIVE_STATUS = 1 AND NodeType = 1 AND ParentID = @FoderID;    
            
    INSERT INTO #subfolder           
    SELECT            
        DtlLog.ID,                 
        DtlLog.ParentID AS ParentID,                 
        CONVERT(VARCHAR(MAX), CONVERT(VARCHAR(MAX), DtlLog.ID) + '/') AS XPATH,                
        DtlLog.LogFileID AS FOLDER_NAME,                
        CONVERT(VARCHAR(MAX), CONVERT(VARCHAR(MAX), DtlLog.LogFileID) + '/') AS XNPATH,            
        DtlLog.FilePath + '/' AS Opath            
    FROM QMSDTLSFILE_LOG DtlLog            
    INNER JOIN #ParentFolders ParentList ON ParentList.FOLDER_ID = DtlLog.ParentID            
    WHERE DtlLog.ACTIVE_STATUS = 1 AND DtlLog.NodeType = 1;    
END           

DECLARE @parentID INT, @XPATH VARCHAR(200), @FOLDER_NAME VARCHAR(200), @XNPATH VARCHAR(200), @Opath VARCHAR(200);            
DECLARE @ChildFolderID INT = 0;           

-- Create cursor to add only one 2nd level folder to subfolder list            
DECLARE ParentFolderID_Cursor CURSOR FOR                 
SELECT ID FROM #subfolder;            

DECLARE @fetch_ParentFolderIDs_Cursor INT;              
OPEN ParentFolderID_Cursor;                
FETCH NEXT FROM ParentFolderID_Cursor INTO @ChildFolderID;                 
SET @fetch_ParentFolderIDs_Cursor = @@FETCH_STATUS;                

WHILE @fetch_ParentFolderIDs_Cursor = 0                 
BEGIN            
    SELECT @parentID = ParentID, @XPATH = XPATH, @FOLDER_NAME = FOLDER_NAME, @XNPATH = XNPATH, @Opath = Opath 
    FROM #subfolder 
    WHERE ID = @ChildFolderID;            

    MERGE INTO #ParentFolders AS TARGET                 
    USING (VALUES(@ChildFolderID, @parentID, @XPATH, @FOLDER_NAME, @XNPATH, @Opath))                
    AS SOURCE (FOLDER_ID, PARENT_FOLDER_ID, XPATH, FOLDER_NAME, XNPATH, Opath)                
    ON TARGET.FOLDER_ID = SOURCE.PARENT_FOLDER_ID                  
    WHEN MATCHED THEN 
        UPDATE SET TARGET.HaveChild = 'true';  -- Removed ID_Child and FOLDER_NAME_child

    FETCH NEXT FROM ParentFolderID_Cursor INTO @ChildFolderID;             
    SET @fetch_ParentFolderIDs_Cursor = @@FETCH_STATUS;             
END                 

CLOSE ParentFolderID_Cursor;                
DEALLOCATE ParentFolderID_Cursor;             

SELECT * FROM #ParentFolders ORDER BY FOLDER_NAME;
