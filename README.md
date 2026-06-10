-- ========================================================
-- PREVIEW: Which rows will change and what they become
-- ========================================================

DECLARE @ValidExtensions TABLE (ext NVARCHAR(50) PRIMARY KEY);

-- 👇👇👇 PASTE YOUR ~100 VALID EXTENSIONS HERE (one per row, without dot) 👇👇👇
INSERT INTO @ValidExtensions VALUES 
    ('pdf'), ('doc'), ('docx'), ('xls'), ('xlsx'), ('ppt'), ('pptx'), 
    ('txt'), ('jpg'), ('jpeg'), ('png'), ('gif'), ('bmp'), ('tiff'),
    ('zip'), ('rar'), ('7z'), ('tar'), ('gz'), ('csv'), ('xlsm'),
    ('mp3'), ('mp4'), ('avi'), ('mov'), ('wmv'), ('flv'), ('mkv'),
    ('html'), ('htm'), ('php'), ('asp'), ('aspx'), ('jsp'), ('xml'),
    ('json'), ('log'), ('ini'), ('cfg'), ('conf'), ('sh'), ('bat'),
    ('exe'), ('msi'), ('dll'), ('so'), ('dmg'), ('iso'), ('img'),
    ('psd'), ('ai'), ('eps'), ('svg'), ('ttf'), ('otf'), ('woff'),
    ('sql'), ('mdb'), ('accdb'), ('db'), ('dbf'), ('bak'), ('tmp');
-- Add your remaining extensions above (up to ~100)
-- =========================================================

WITH Parsed AS (
    SELECT
        upload_file_path,
        file_type,
        NULLIF(CHARINDEX('\', REVERSE(upload_file_path)), 0) AS BackslashPosFromEnd
    FROM inf_upload
),
WithParts AS (
    SELECT
        upload_file_path,
        file_type,
        CASE 
            WHEN BackslashPosFromEnd IS NULL THEN ''                     -- no backslash
            ELSE LEFT(upload_file_path, LEN(upload_file_path) - BackslashPosFromEnd)
        END AS Directory,
        CASE 
            WHEN BackslashPosFromEnd IS NULL THEN upload_file_path
            ELSE RIGHT(upload_file_path, BackslashPosFromEnd - 1)
        END AS FileName
    FROM Parsed
),
ExtensionInfo AS (
    SELECT
        upload_file_path,
        file_type,
        Directory,
        FileName,
        -- First dot position in filename (0 if none)
        CHARINDEX('.', FileName) AS FirstDotPos,
        -- Current extension = after last dot in filename
        CASE 
            WHEN CHARINDEX('.', REVERSE(FileName)) = 0 THEN NULL
            ELSE RIGHT(FileName, CHARINDEX('.', REVERSE(FileName)) - 1)
        END AS CurrentExt
    FROM WithParts
)
SELECT
    upload_file_path AS Current_Path,
    file_type,
    CurrentExt,
    CASE WHEN CurrentExt IS NULL THEN 'NO EXTENSION'
         WHEN EXISTS (SELECT 1 FROM @ValidExtensions v WHERE v.ext = LOWER(CurrentExt)) 
             THEN 'VALID'
         ELSE 'INVALID' 
    END AS Extension_Status,
    -- New path (only shown if current extension is invalid)
    Directory + 
    CASE 
        WHEN FirstDotPos = 0 THEN FileName
        ELSE LEFT(FileName, FirstDotPos - 1)
    END 
    + '.' + file_type AS New_Path_If_Updated
FROM ExtensionInfo
WHERE 
    -- Only rows that would be updated: 
    -- (1) no extension OR (2) extension not in valid list
    CurrentExt IS NULL 
    OR NOT EXISTS (SELECT 1 FROM @ValidExtensions v WHERE v.ext = LOWER(CurrentExt))
ORDER BY upload_file_path;