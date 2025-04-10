CREATE OR ALTER PROCEDURE [qms].[SP_Get_QMS_Document_Tree] 
@UserId INT
AS
BEGIN
    -- Step 1: Identify which IDs are parents (for hasChild)
    DROP TABLE IF EXISTS #Orphans;
    SELECT DISTINCT ParentID 
    INTO #Orphans 
    FROM QMSdtlsFile_Log_demo 
    WHERE active_status = 0 OR ParentID IS NOT NULL;

    CREATE CLUSTERED INDEX CX_#Orphans ON #Orphans (ParentID);

    -- Step 2: Build recursive hierarchy with folder names and levels
    WITH FileHierarchy AS (
        -- Root level (Level 0)
        SELECT 
            ID,
            ParentID,
            logFileId,
            CAST('' AS VARCHAR(MAX)) AS FilePath,
            0 AS Level
        FROM QMSdtlsFile_Log_demo
        WHERE ParentID IS NULL

        UNION ALL

        -- Recursive step
        SELECT 
            child.ID,
            child.ParentID,
            child.logFileId,
            CAST(
                CASE 
                    WHEN parent.Level = 0 THEN '\'                          -- Level 1
                    WHEN parent.Level = 1 THEN '\' + parent.logFileId + '\' -- Level 2
                    ELSE parent.FilePath + parent.logFileId + '\'          -- Level 3+
                END AS VARCHAR(MAX)
            ) AS FilePath,
            parent.Level + 1 AS Level
        FROM QMSdtlsFile_Log_demo child
        INNER JOIN FileHierarchy parent ON child.ParentID = parent.ID
    )

    -- Step 3: Final output
    SELECT TOP 100 
        va.date_of_Creatation AS dateCreated,
        va.date_of_Modification AS dateModified,

        -- Final Path Logic
        ISNULL(
            CASE 
                WHEN fh.Level = 0 THEN ''       -- Level 0
                ELSE fh.FilePath               -- Level 1+
            END, ''
        ) AS filterPath,

        CASE 
            WHEN o.ParentID IS NOT NULL THEN 1
            ELSE 0
        END AS hasChild,

        CAST(va.ID AS VARCHAR(50)) AS id,

        CASE 
            WHEN va.nodeType = 0 THEN 1 ELSE 0
        END AS isFile,

        va.logFileId AS name,
        CAST(va.parentid AS VARCHAR(50)) AS parentId,

        CONVERT(DECIMAL(9, 2), CEILING((ISNULL(va.size, 0) / 1024.00) * 100) / 100) AS size,

        CASE 
            WHEN va.nodeType = 0 AND CHARINDEX('.', REVERSE(va.logFileId)) > 0
                THEN RIGHT(va.logFileId, CHARINDEX('.', REVERSE(va.logFileId)) - 1)
            ELSE 'Folder'
        END AS type

    FROM QMSdtlsFile_Log_demo va WITH (NOLOCK)
    LEFT OUTER JOIN #Orphans o ON o.ParentID = va.ID
    LEFT JOIN FileHierarchy fh ON va.ID = fh.ID
    WHERE va.active_status = 1
    ORDER BY va.logFileId;

    -- Cleanup
    DROP TABLE IF EXISTS #Orphans;
END