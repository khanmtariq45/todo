ORDER BY
    -- For Level_1: Letters first, then numbers
    CASE 
        WHEN Level_1 IS NOT NULL AND Level_1 != '' THEN
            CASE WHEN ISNUMERIC(Level_1) = 1 THEN 
                CONCAT('Z', RIGHT('0000000000' + Level_1, 10)) -- Numbers after letters
            ELSE 
                CONCAT('A', 
                       CASE WHEN ASCII(Level_1) BETWEEN 65 AND 90 THEN 
                            CHAR(ASCII(Level_1) * 2) -- Uppercase
                       ELSE 
                            CHAR(ASCII(UPPER(Level_1)) * 2 + 1) -- Lowercase
                       END,
                       Level_1 -- Full string for secondary sorting
                )
            END
        ELSE 'ZZZ' -- Handle NULLs last
    END,
    
    -- Repeat same pattern for Level_2 and Level_3
    CASE 
        WHEN Level_2 IS NOT NULL AND Level_2 != '' THEN
            CASE WHEN ISNUMERIC(Level_2) = 1 THEN 
                CONCAT('Z', RIGHT('0000000000' + Level_2, 10))
            ELSE 
                CONCAT('A', 
                       CASE WHEN ASCII(Level_2) BETWEEN 65 AND 90 THEN 
                            CHAR(ASCII(Level_2) * 2)
                       ELSE 
                            CHAR(ASCII(UPPER(Level_2)) * 2 + 1)
                       END,
                       Level_2
                )
            END
        ELSE 'ZZZ'
    END,
    
    CASE 
        WHEN Level_3 IS NOT NULL AND Level_3 != '' THEN
            CASE WHEN ISNUMERIC(Level_3) = 1 THEN 
                CONCAT('Z', RIGHT('0000000000' + Level_3, 10))
            ELSE 
                CONCAT('A', 
                       CASE WHEN ASCII(Level_3) BETWEEN 65 AND 90 THEN 
                            CHAR(ASCII(Level_3) * 2)
                       ELSE 
                            CHAR(ASCII(UPPER(Level_3)) * 2 + 1)
                       END,
                       Level_3
                )
            END
        ELSE 'ZZZ'
    END