IF (@SORTBY IS NULL OR @SORTBY = 'Question_No')
BEGIN
    SET @ORDERCLAUSE = '
    ORDER BY
        -- First, sort by leading zeros (treat "01.01.02" before "1.1.1")
        CASE 
            WHEN ISNULL(Level_1, '') LIKE '0%' THEN 0 
            WHEN ISNUMERIC(ISNULL(Level_1, '')) = 1 THEN 1 
            ELSE 2 
        END,
        
        -- Numeric part of Level_1 (for proper numeric ordering)
        TRY_CAST(LEFT(ISNULL(Level_1, ''), PATINDEX(''%[^0-9]%'', ISNULL(Level_1, '''') + ''a'') - 1) AS INT),
        -- Alphanumeric part of Level_1 (for letters/decimals)
        SUBSTRING(ISNULL(Level_1, ''''), PATINDEX(''%[^0-9]%'', ISNULL(Level_1, '''') + ''a''), LEN(ISNULL(Level_1, ''''))),

        -- Repeat for Level_2
        CASE 
            WHEN ISNULL(Level_2, '') LIKE '0%' THEN 0 
            WHEN ISNUMERIC(ISNULL(Level_2, '')) = 1 THEN 1 
            ELSE 2 
        END,
        TRY_CAST(LEFT(ISNULL(Level_2, ''''), PATINDEX(''%[^0-9]%'', ISNULL(Level_2, '''') + ''a'') - 1) AS INT),
        SUBSTRING(ISNULL(Level_2, ''''), PATINDEX(''%[^0-9]%'', ISNULL(Level_2, '''') + ''a''), LEN(ISNULL(Level_2, ''''))),

        -- Repeat for Level_3
        CASE 
            WHEN ISNULL(Level_3, '') LIKE '0%' THEN 0 
            WHEN ISNUMERIC(ISNULL(Level_3, '')) = 1 THEN 1 
            ELSE 2 
        END,
        TRY_CAST(LEFT(ISNULL(Level_3, ''''), PATINDEX(''%[^0-9]%'', ISNULL(Level_3, '''') + ''a'') - 1) AS INT),
        SUBSTRING(ISNULL(Level_3, ''''), PATINDEX(''%[^0-9]%'', ISNULL(Level_3, '''') + ''a''), LEN(ISNULL(Level_3, ''''))),

        -- Handle standalone letters/numbers (B, D, 2, 3, etc.)
        CASE 
            WHEN ISNUMERIC(ISNULL(Level_1, '')) = 1 THEN TRY_CAST(ISNULL(Level_1, '') AS INT)
            ELSE ASCII(UPPER(ISNULL(Level_1, '')))
        END
    '
END
ELSE