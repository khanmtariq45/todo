-- Step 1: Create a temporary table to hold folder IDs
CREATE TABLE #folder_ids (folder_id INT);

-- Step 2: Populate the temp table using a recursive CTE
WITH RECURSIVE folder_hierarchy AS (
    SELECT 
        id, 
        parentid
    FROM qmsdtlsfile 
    WHERE 
        id = 0 
        AND nodetype = 1 -- Root folder
    
    UNION ALL
    
    SELECT 
        f.id, 
        f.parentid
    FROM qmsdtlsfile f
    INNER JOIN folder_hierarchy fh 
        ON f.parentid = fh.id 
    WHERE 
        f.nodetype = 1 -- Only folders
)
INSERT INTO #folder_ids (folder_id)
SELECT id FROM folder_hierarchy;

-- Step 3: Declare variables and cursor
DECLARE @current_folder_id INT;

DECLARE folder_cursor CURSOR FOR 
SELECT folder_id FROM #folder_ids;

-- Step 4: Open the cursor and fetch the first row
OPEN folder_cursor;
FETCH NEXT FROM folder_cursor INTO @current_folder_id;

-- Step 5: Loop through all rows and print folder IDs
WHILE @@FETCH_STATUS = 0
BEGIN
    -- Print the current folder ID
    PRINT 'Folder ID: ' + CAST(@current_folder_id AS VARCHAR(10));

    -- Fetch the next row
    FETCH NEXT FROM folder_cursor INTO @current_folder_id;
END;

-- Step 6: Cleanup
CLOSE folder_cursor;
DEALLOCATE folder_cursor;

-- Step 7: Drop the temporary table
DROP TABLE #folder_ids;