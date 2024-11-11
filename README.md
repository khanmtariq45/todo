-- Create a temporary table to store the results of the CTE
CREATE TABLE #TempIDs (id INT);

-- Insert the results of the recursive CTE into the temporary table
WITH RecursiveCTE AS (
    SELECT id, parentId, Active_Status
    FROM QMSdtlsFile_Log
    WHERE Active_Status = 0
    
    UNION ALL
    
    SELECT c.id, c.parentId, c.Active_Status
    FROM QMSdtlsFile_Log c
    JOIN RecursiveCTE r ON c.parentId = r.id
    WHERE c.Active_Status = 1
)
INSERT INTO #TempIDs (id)
SELECT id FROM RecursiveCTE;

-- Count the rows in the temporary table
SELECT COUNT(id) AS TempIDCount FROM #TempIDs;

-- Select records from QMSdtlsFile_Log where id exists in #TempIDs and Active_Status is 1
SELECT * FROM QMSdtlsFile_Log
WHERE id IN (SELECT id FROM #TempIDs)
AND Active_Status = 1;

-- Clean up the temporary table
DROP TABLE #TempIDs;