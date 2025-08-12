IF (@SORTBY IS NULL OR @SORTBY = 'Question_No')
		BEGIN
			SET @ORDERCLAUSE = '
			ORDER BY
				TRY_CAST(LEFT(ISNULL(Level_1, ''''), PATINDEX(''%[^0-9]%'', ISNULL(Level_1, '''') + ''a'') - 1) AS INT),
				SUBSTRING(ISNULL(Level_1, ''''), PATINDEX(''%[^0-9]%'', ISNULL(Level_1, '''') + ''a''), LEN(ISNULL(Level_1, ''''))),

				TRY_CAST(LEFT(ISNULL(Level_2, ''''), PATINDEX(''%[^0-9]%'', ISNULL(Level_2, '''') + ''a'') - 1) AS INT),
				SUBSTRING(ISNULL(Level_2, ''''), PATINDEX(''%[^0-9]%'', ISNULL(Level_2, '''') + ''a''), LEN(ISNULL(Level_2, ''''))),

				TRY_CAST(LEFT(ISNULL(Level_3, ''''), PATINDEX(''%[^0-9]%'', ISNULL(Level_3, '''') + ''a'') - 1) AS INT),
				SUBSTRING(ISNULL(Level_3, ''''), PATINDEX(''%[^0-9]%'', ISNULL(Level_3, '''') + ''a''), LEN(ISNULL(Level_3, '''')))
			'
		END
	ELSE
