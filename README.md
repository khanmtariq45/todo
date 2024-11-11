WITH RecursiveHierarchy AS (
    -- Start from all folders (including inactive ones)
    SELECT id, parentId, active_status
    FROM QMSdtlsFile_Log

    UNION ALL

    -- Recursively get all children
    SELECT f.id, f.parentId, f.active_status
    FROM QMSdtlsFile_Log f
    INNER JOIN RecursiveHierarchy rh ON f.parentId = rh.id
)

-- Select all active items whose ancestors are inactive at any level
SELECT DISTINCT activeChild.id
FROM RecursiveHierarchy parent
JOIN RecursiveHierarchy activeChild ON activeChild.parentId = parent.id
WHERE parent.active_status = 0 order by activeChild.id;  -- Only consider inactive parents
