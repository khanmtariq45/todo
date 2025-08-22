CREATE OR ALTER PROCEDURE [dbo].[JMS_Safety_Observation_Process_MandatoryFor]
    @FieldID INT,
    @MandatoryFor NVARCHAR(MAX), -- Comma-separated list of MandatoryFor values
    @Available BIT,              -- Available option (1 for Yes, 0 for No)
    @Modified_By INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Update the Available column in the JMS_Safety_Observation_Process table
    IF EXISTS (
        SELECT 1
        FROM JMS_Safety_Observation_Process
        WHERE ID = @FieldID
          AND Available <> @Available
    )
    BEGIN
        UPDATE JMS_Safety_Observation_Process
        SET Available = @Available,
            Date_Of_Modification = GETDATE(),
            Modified_By = @Modified_By
        WHERE ID = @FieldID;
    END

    -- If @MandatoryFor is empty, perform a soft delete for existing records
    IF @MandatoryFor IS NULL OR LTRIM(RTRIM(@MandatoryFor)) = ''
    BEGIN
        UPDATE JMS_Safety_Observation_MandatoryFor
        SET Active_Status = 0,
            Date_Of_Modification = GETDATE(),
            Modified_By = @Modified_By
        WHERE FieldID = @FieldID;

        RETURN; -- Exit after marking records as inactive
    END

    -- Split the MandatoryFor values into a table
    DECLARE @NewMandatoryFor TABLE (Value INT);
    INSERT INTO @NewMandatoryFor (Value)
    SELECT CAST(Item AS INT) 
    FROM dbo.SplitString(@MandatoryFor, ',')
    WHERE ISNUMERIC(Item) = 1;

    -- Reactivate existing records
    UPDATE JMS_Safety_Observation_MandatoryFor
    SET Active_Status = 1,
        Date_Of_Modification = GETDATE(),
        Modified_By = @Modified_By
    WHERE FieldID = @FieldID
      AND MandatoryFor IN (SELECT Value FROM @NewMandatoryFor);

    -- Insert new MandatoryFor values that do not exist
    DECLARE @NextID INT;
    SELECT @NextID = ISNULL(MAX(ID), 0) + 1 FROM JMS_Safety_Observation_MandatoryFor;

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
    SELECT @NextID + ROW_NUMBER() OVER (ORDER BY Value), @FieldID, Value, GETDATE(), @Modified_By, GETDATE(), @Modified_By, 1
    FROM @NewMandatoryFor
    WHERE Value NOT IN (
        SELECT MandatoryFor
        FROM JMS_Safety_Observation_MandatoryFor
        WHERE FieldID = @FieldID
    );
END
