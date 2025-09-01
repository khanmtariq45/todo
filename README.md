CREATE FUNCTION [dbo].[fn_AdvancedAlphaNumSort] (@str VARCHAR(1000))
RETURNS VARCHAR(1000)
AS
BEGIN
    DECLARE @result VARCHAR(1000) = ''
    DECLARE @i INT = 1
    DECLARE @len INT = LEN(@str)
    DECLARE @num VARCHAR(100) = ''
    DECLARE @chr CHAR(1)

    WHILE @i <= @len
    BEGIN
        SET @chr = SUBSTRING(@str, @i, 1)
        IF @chr LIKE '[0-9]'
        BEGIN
            SET @num = @num + @chr
        END
        ELSE
        BEGIN
            IF @num <> ''
            BEGIN
                SET @result = @result + RIGHT('0000000000' + @num, 10)
                SET @num = ''
            END
            -- Handle letters: uppercase first, then lowercase
            IF @chr = LOWER(@chr) COLLATE Latin1_General_BIN
                SET @result = @result + '1' + @chr  -- Lowercase
            ELSE
                SET @result = @result + '0' + @chr  -- Uppercase
        END
        SET @i = @i + 1
    END

    IF @num <> ''
        SET @result = @result + RIGHT('0000000000' + @num, 10)

    RETURN @result
END