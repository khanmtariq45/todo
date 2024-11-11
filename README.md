-- Create a temporary table to store the results of the CTE
CREATE TABLE #TempIDs (id INT);

-- Insert the results of the recursive CTE into the temporary table
INSERT INTO #TempIDs (id)
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
SELECT count(id) FROM RecursiveCTE;
SELECT count(id) FROM #TempIDs

-- Update the QMSdtlsFile_Log table
select * from QMSdtlsFile_Log WHERE id IN (SELECT id FROM #TempIDs)
AND Active_Status = 1;

-- Clean up the temporary table
DROP TABLE #TempIDs;
