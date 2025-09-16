/****** Object:  Function [dbo].[Alpha_Numeric_Sort]  Script Date: 01/09/2025 ******/

-- =============================================
-- Author:		Muhammad Tariq 
-- Create date: 01/09/2025
-- Description: Alphanumeric sorting function
-- =============================================

CREATE OR ALTER FUNCTION [dbo].[Alpha_Numeric_Sort] (
	@str VARCHAR(1000)
	)
RETURNS VARCHAR(4000)
AS
BEGIN
    DECLARE @result VARCHAR(4000) = ''
    DECLARE @charIndex INT = 1
    DECLARE @len INT = LEN(@str)
    DECLARE @currentSegment VARCHAR(1000) = ''
    DECLARE @currentType INT = 0 -- 0: unknown, 1: digit, 2: non-digit

    -- Loop through each character in the input string
    WHILE @charIndex <= @len
    BEGIN
        DECLARE @currentChar CHAR(1) = SUBSTRING(@str, @charIndex, 1)
        DECLARE @isDigit BIT = CASE WHEN @currentChar LIKE '[0-9]' THEN 1 ELSE 0 END

        -- Determine the type of the current segment
        IF @currentType = 0
        BEGIN
            SET @currentType = CASE WHEN @isDigit = 1 THEN 1 ELSE 2 END
            SET @currentSegment = @currentChar
        END
        ELSE IF @currentType = 1 AND @isDigit = 1
            SET @currentSegment = @currentSegment + @currentChar
        ELSE IF @currentType = 2 AND @isDigit = 0
            SET @currentSegment = @currentSegment + @currentChar
        ELSE
        BEGIN
            -- Type change: process the current segment
            IF @currentType = 1
                -- Pad numeric segment to 10 digits with leading zeros and prefix with '0' to mark it as numeric.
                -- Example: segment '12' becomes '0000000012', result: '0000000012' prefixed with '0' -> '000000000012'
                SET @result = @result + '0' + RIGHT('0000000000' + @currentSegment, 10)
            ELSE
            BEGIN
                -- Encode and pad non-numeric segment
                DECLARE @segCharIndex INT = 1
                DECLARE @segLen INT = LEN(@currentSegment)
                DECLARE @nonNumResult VARCHAR(100) = ''
                WHILE @segCharIndex <= @segLen
                BEGIN
                    DECLARE @segmentChar CHAR(1) = SUBSTRING(@currentSegment, @segCharIndex, 1)
                    IF @segmentChar COLLATE Latin1_General_BIN BETWEEN 'A' AND 'Z'
                        SET @nonNumResult = @nonNumResult + @segmentChar + '0'
                    ELSE IF @segmentChar COLLATE Latin1_General_BIN BETWEEN 'a' AND 'z'
                        SET @nonNumResult = @nonNumResult + UPPER(@segmentChar) + '1'
                    ELSE
                        SET @nonNumResult = @nonNumResult + @segmentChar + '2'
                    SET @segCharIndex = @segCharIndex + 1
                END
                -- Pad to 20 chars (each char is 2 bytes: letter+case)
                SET @result = @result + LEFT(@nonNumResult + REPLICATE(' ', 40), 40)
            END

            -- Reset current segment and type
            SET @currentSegment = @currentChar
            SET @currentType = CASE WHEN @isDigit = 1 THEN 1 ELSE 2 END
        END

        SET @charIndex = @charIndex + 1
    END

    -- Process the last segment
    IF @currentSegment <> ''
    BEGIN
        IF @currentType = 1
            -- Pad numeric segment to 10 digits with leading zeros and prefix with '0' to mark it as numeric.
            -- Example: segment '12' becomes '0000000012', result: '000000000012'
            SET @result = @result + '0' + RIGHT('0000000000' + @currentSegment, 10)
        ELSE
        BEGIN
            SET @segCharIndex = 1
            SET @segLen = LEN(@currentSegment)
            SET @nonNumResult = ''
            WHILE @segCharIndex <= @segLen
            BEGIN
                SET @segmentChar = SUBSTRING(@currentSegment, @segCharIndex, 1)
                IF @segmentChar COLLATE Latin1_General_BIN BETWEEN 'A' AND 'Z'
                    SET @nonNumResult = @nonNumResult + @segmentChar + '0'
                ELSE IF @segmentChar COLLATE Latin1_General_BIN BETWEEN 'a' AND 'z'
                    SET @nonNumResult = @nonNumResult + UPPER(@segmentChar) + '1'
                ELSE
                    SET @nonNumResult = @nonNumResult + @segmentChar + '2'
                SET @segCharIndex = @segCharIndex + 1
            END
            SET @result = @result + LEFT(@nonNumResult + REPLICATE(' ', 40), 40)
        END
    END

    RETURN @result
END
