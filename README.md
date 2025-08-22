CREATE OR ALTER PROCEDURE [dbo].[JMS_Safety_Observation_Process_MandatoryFor]
    @FieldID INT,
    @MandatoryFor NVARCHAR(MAX),
    @Available BIT,
    @Modified_By INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Update main table only if availability changed
    UPDATE JMS_Safety_Observation_Process
    SET Available = @Available,
        Date_Of_Modification = GETDATE(),
        Modified_By = @Modified_By
    WHERE ID = @FieldID
        AND Available <> @Available;

    -- Handle empty MandatoryFor case
    IF NULLIF(LTRIM(RTRIM(@MandatoryFor)), '') IS NULL
    BEGIN
        UPDATE JMS_Safety_Observation_MandatoryFor
        SET Active_Status = 0,
            Date_Of_Modification = GETDATE(),
            Modified_By = @Modified_By
        WHERE FieldID = @FieldID;
        RETURN;
    END;

    -- Parse MandatoryFor values
    DECLARE @NewMandatoryFor TABLE (Value INT PRIMARY KEY);
    INSERT INTO @NewMandatoryFor (Value)
    SELECT TRY_CAST(Item AS INT)
    FROM dbo.SplitString(@MandatoryFor, ',')
    WHERE TRY_CAST(Item AS INT) IS NOT NULL;

    -- Reactivate existing records that are in the new list
    UPDATE m
    SET Active_Status = 1,
        Date_Of_Modification = GETDATE(),
        Modified_By = @Modified_By
    FROM JMS_Safety_Observation_MandatoryFor m
    INNER JOIN @NewMandatoryFor n ON m.MandatoryFor = n.Value
    WHERE m.FieldID = @FieldID
        AND m.Active_Status = 0;

    -- Insert new values with concurrency-safe ID generation
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @NextID INT;
        SELECT @NextID = ISNULL(MAX(ID), 0) + 1 
        FROM JMS_Safety_Observation_MandatoryFor WITH (UPDLOCK, SERIALIZABLE);

        INSERT INTO JMS_Safety_Observation_MandatoryFor (
            ID,
            FieldID,
            MandatoryFor,
            Date_Of_Creation,
            Created_By,
            Date_Of_Modification,
            Modified_By,
            Active_Status
        )
        SELECT 
            @NextID + ROW_NUMBER() OVER (ORDER BY Value),
            @FieldID,
            Value,
            GETDATE(),
            @Modified_By,
            GETDATE(),
            @Modified_By,
            1
        FROM @NewMandatoryFor n
        WHERE NOT EXISTS (
            SELECT 1 
            FROM JMS_Safety_Observation_MandatoryFor e 
            WHERE e.FieldID = @FieldID 
                AND e.MandatoryFor = n.Value
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;