IF (@SORTBY IS NULL OR @SORTBY = 'Question_No')
BEGIN
    SET @ORDERCLAUSE = '
    ORDER BY 
        dbo.fn_AdvancedAlphaNumSort(ISNULL(Level_1, '''')) COLLATE Latin1_General_BIN,
        dbo.fn_AdvancedAlphaNumSort(ISNULL(Level_2, '''')) COLLATE Latin1_General_BIN,
        dbo.fn_AdvancedAlphaNumSort(ISNULL(Level_3, '''')) COLLATE Latin1_General_BIN
    ' + @SORTORDER
END