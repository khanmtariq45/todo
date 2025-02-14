drop table if exists #folder_ids
CREATE TABLE #folder_ids (folder_id INT);

WITH folder_hierarchy AS (
    SELECT 
        id, 
        parentid
    FROM qmsdtlsfile_log 
    WHERE 
        parentid = 0 
        AND nodetype = 1
    
    UNION ALL
    
    SELECT 
        f.id, 
        f.parentid
    FROM qmsdtlsfile_log f
    INNER JOIN folder_hierarchy fh 
        ON f.parentid = fh.id 
    WHERE 
        f.nodetype = 1
)
INSERT INTO #folder_ids (folder_id)
SELECT id FROM folder_hierarchy;

DECLARE @current_folder_id INT;

DECLARE folder_cursor CURSOR FOR 
SELECT folder_id FROM #folder_ids;

OPEN folder_cursor;
FETCH NEXT FROM folder_cursor INTO @current_folder_id;

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT 'Folder ID: ' + CAST(@current_folder_id AS VARCHAR(10));

    FETCH NEXT FROM folder_cursor INTO @current_folder_id;
END;

CLOSE folder_cursor;
DEALLOCATE folder_cursor;

DROP TABLE #folder_ids;
