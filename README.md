WITH Parsed AS (
    SELECT
        upload_file_path,
        file_type,
        -- Find last backslash (position from end)
        NULLIF(CHARINDEX('\', REVERSE(upload_file_path)), 0) AS BackslashPosFromEnd
    FROM inf_upload
),
WithParts AS (
    SELECT
        upload_file_path,
        file_type,
        -- Directory part (everything before last backslash), or empty if no backslash
        CASE 
            WHEN BackslashPosFromEnd IS NULL THEN ''
            ELSE LEFT(upload_file_path, LEN(upload_file_path) - BackslashPosFromEnd)
        END AS Directory,
        -- Filename part (after last backslash), or whole string if no backslash
        CASE 
            WHEN BackslashPosFromEnd IS NULL THEN upload_file_path
            ELSE RIGHT(upload_file_path, BackslashPosFromEnd - 1)
        END AS FileName
    FROM Parsed
),
DotsCounted AS (
    SELECT
        upload_file_path,
        file_type,
        Directory,
        FileName,
        -- Count dots in the filename
        LEN(FileName) - LEN(REPLACE(FileName, '.', '')) AS DotCount,
        -- Position of first dot (0 if none)
        CHARINDEX('.', FileName) AS FirstDotPos
    FROM WithParts
)
SELECT
    upload_file_path AS Current_Path,
    file_type,
    Directory,
    FileName,
    DotCount,
    -- Build the new path
    Directory + 
    CASE 
        WHEN FirstDotPos = 0 THEN FileName   -- no dot at all
        ELSE LEFT(FileName, FirstDotPos - 1) -- remove everything after first dot (including extra dots)
    END 
    + '.' + file_type AS New_Path
FROM DotsCounted
WHERE DotCount <> 1   -- Only records that would be updated (invalid = 0 or >1 dots)
ORDER BY DotCount DESC;