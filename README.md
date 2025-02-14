-- Drop the temp table if it exists
DROP TABLE IF EXISTS #folder_ids;

-- Create a temporary table to hold folder IDs
CREATE TABLE #folder_ids (folder_id INT);

-- Populate the temp table using a recursive CTE
WITH folder_hierarchy AS (
    -- Anchor member: Start with root folders (parentid = 0)
    SELECT 
        id, 
        parentid
    FROM qmsdtlsfile_log 
    WHERE 
        parentid = 0 
        AND nodetype = 1 -- Only folders
    
    UNION ALL
    
    -- Recursive member: Traverse child folders
    SELECT 
        f.id, 
        f.parentid
    FROM qmsdtlsfile_log f
    INNER JOIN folder_hierarchy fh 
        ON f.parentid = fh.id 
    WHERE 
        f.nodetype = 1 -- Only folders
)
INSERT INTO #folder_ids (folder_id)
SELECT id FROM folder_hierarchy;

-- Declare variables and cursor
DECLARE @current_folder_id INT;

DECLARE folder_cursor CURSOR FOR 
SELECT folder_id FROM #folder_ids;

-- Open the cursor and fetch the first row
OPEN folder_cursor;
FETCH NEXT FROM folder_cursor INTO @current_folder_id;

-- Loop through all rows and print folder IDs
WHILE @@FETCH_STATUS = 0
BEGIN
    -- Print the current folder ID
    PRINT 'Folder ID: ' + CAST(@current_folder_id AS VARCHAR(10));

    -- Fetch the next row
    FETCH NEXT FROM folder_cursor INTO @current_folder_id;
END;

-- Cleanup
CLOSE folder_cursor;
DEALLOCATE folder_cursor;

-- Drop the temporary table
DROP TABLE #folder_ids;