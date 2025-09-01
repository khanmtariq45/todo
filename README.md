CREATE FUNCTION [dbo].[fn_AdvancedAlphaNumSort] (@str VARCHAR(1000))
RETURNS VARCHAR(4000)
AS
BEGIN
    DECLARE @result VARCHAR(4000) = ''
    DECLARE @i INT = 1
    DECLARE @len INT = LEN(@str)
    DECLARE @currentSegment VARCHAR(1000) = ''
    DECLARE @currentType INT = 0 -- 0: unknown, 1: digit, 2: non-digit

    WHILE @i <= @len
    BEGIN
        DECLARE @chr CHAR(1) = SUBSTRING(@str, @i, 1)
        DECLARE @isDigit BIT = CASE WHEN @chr LIKE '[0-9]' THEN 1 ELSE 0 END

        IF @currentType = 0
        BEGIN
            SET @currentType = CASE WHEN @isDigit = 1 THEN 1 ELSE 2 END
            SET @currentSegment = @chr
        END
        ELSE IF @currentType = 1 AND @isDigit = 1
            SET @currentSegment = @currentSegment + @chr
        ELSE IF @currentType = 2 AND @isDigit = 0
            SET @currentSegment = @currentSegment + @chr
        ELSE
        BEGIN
            -- Type change: process the current segment
            IF @currentType = 1
                SET @result = @result + '0' + RIGHT('0000000000' + @currentSegment, 10)
            ELSE
            BEGIN
                SET @result = @result + '1'
                DECLARE @j INT = 1
                DECLARE @segLen INT = LEN(@currentSegment)
                WHILE @j <= @segLen
                BEGIN
                    DECLARE @c CHAR(1) = SUBSTRING(@currentSegment, @j, 1)
                    IF @c = UPPER(@c) COLLATE Latin1_General_BIN
                        SET @result = @result + '0' + @c
                    ELSE
                        SET @result = @result + '1' + @c
                    SET @j = @j + 1
                END
            END

            -- Reset current segment and type
            SET @currentSegment = @chr
            SET @currentType = CASE WHEN @isDigit = 1 THEN 1 ELSE 2 END
        END

        SET @i = @i + 1
    END

    -- Process the last segment
    IF @currentSegment <> ''
    BEGIN
        IF @currentType = 1
            SET @result = @result + '0' + RIGHT('0000000000' + @currentSegment, 10)
        ELSE
        BEGIN
            SET @result = @result + '1'
            SET @j = 1
            SET @segLen = LEN(@currentSegment)
            WHILE @j <= @segLen
            BEGIN
                SET @c = SUBSTRING(@currentSegment, @j, 1)
                IF @c = UPPER(@c) COLLATE Latin1_General_BIN
                    SET @result = @result + '0' + @c
                ELSE
                    SET @result = @result + '1' + @c
                SET @j = @j + 1
            END
        END
    END

    RETURN @result
END