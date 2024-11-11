-- First, deactivate all descendants of inactive folders
WITH RecursiveCTE AS (
    SELECT id, parentId, active
    FROM QMSdtlsFile_Log
    WHERE active = 0 -- Start with inactive parents
    
    UNION ALL
    
    SELECT c.id, c.parentId, c.active
    FROM QMSdtlsFile_Log c
    JOIN RecursiveCTE r ON c.parentId = r.id
)
UPDATE QMSdtlsFile_Log
SET active = 0
WHERE id IN (SELECT id FROM RecursiveCTE);