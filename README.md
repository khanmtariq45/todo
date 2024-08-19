CREATE OR ALTER PROCEDURE [purc].[PURC_Sp_Ins_File_Attachment_info]
    @VesselCode   varchar(20),
    @ReqsCode     varchar(100),
    @SuppCode     varchar(20),
    @FileType     varchar(50),
    @FileName     varchar(150),
    @FilePath     varchar(150),
    @CreatedBy    varchar(10),
    @PortID       int,
    @CategoryID   int = 0,
    @FileUid      uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ID int;
    DECLARE @DocCode varchar(50);
    DECLARE @logMessage VARCHAR(MAX);
    DECLARE @vStepID int;
    DECLARE @param VARCHAR(MAX) = CONCAT(
        '@SuppCode=', CONVERT(varchar(20), @SuppCode),
        ',@ReqsCode=', CONVERT(varchar(100), @ReqsCode),
        ',@VesselCode=', CONVERT(varchar(20), @VesselCode),
        ',@FileType=', CONVERT(varchar(50), @FileType),
        ',@FileName=', CONVERT(varchar(150), @FileName),
        ',@FilePath=', CONVERT(varchar(150), @FilePath),
        ',@CreatedBy=', CONVERT(varchar(10), @CreatedBy),
        ',@FileUid=', CONVERT(uniqueidentifier, @FileUid),
        ',@PortID=', CONVERT(int, @PortID),
        ',@CategoryID=', CONVERT(int, @CategoryID)
    );

    SET @vStepID = 1;

    BEGIN TRY
        SET XACT_ABORT ON; -- Automatically rollback on error
        BEGIN TRAN Tr_Attachment;

        SET @vStepID = 2;
        SELECT @DocCode = DOCUMENT_CODE 
        FROM PURC_DTL_REQSN 
        WHERE REQUISITION_CODE = @ReqsCode;

        IF NOT EXISTS (
            SELECT * 
            FROM PURC_DTL_FILE_ATTACH 
            WHERE Vessel_Code = @VesselCode 
              AND Supplier_Code = @SuppCode 
              AND [File_Name] = @FileName 
              AND Requisition_Code = @ReqsCode 
              AND Active_Status = 1
        )
        BEGIN
            SET @vStepID = 3;
            SET @ID = (SELECT ISNULL(MAX(ID), 0) + 1 FROM dbo.PURC_DTL_FILE_ATTACH);
            SET @vStepID = 4;

            INSERT INTO [PURC_DTL_FILE_ATTACH] (
                [Id], [Vessel_Code], [Requisition_Code], [DOCUMENT_CODE], [Supplier_Code], 
                [File_Type], [File_Name], [File_Path], [Created_By], [Date_Of_Creatation], 
                [Active_Status], PORT_ID, CategoryID, file_upload_uid
            )
            VALUES (
                @ID, @VesselCode, @ReqsCode, @DocCode, @SuppCode, @FileType, 
                @FileName, @FilePath, @CreatedBy, GETDATE(), '1', @PortID, @CategoryID, @FileUid
            );
        END

        COMMIT TRAN Tr_Attachment; -- Commit transaction if successful

        RETURN @ID; -- Return the ID

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000);
        DECLARE @ErrorSeverity INT;
        DECLARE @ErrorState INT;

        SELECT 
            @ErrorMessage = ERROR_MESSAGE(),
            @ErrorSeverity = ERROR_SEVERITY(),
            @ErrorState = ERROR_STATE;

        IF (@@TRANCOUNT > 0)
        BEGIN
            ROLLBACK TRAN Tr_Attachment; -- Rollback transaction on error
        END

        SET @logMessage = CONCAT('Failed! StepID = ', @vStepID, ', ', @ErrorMessage, ', parameters: ', @param);
        EXEC [dbo].[inf_log_write] 'J2_PURC', NULL, 'PURC_Sp_Ins_File_Attachment_info', 0, 'Exception occurred in SP', @logMessage, 'sql', 1, 0;

        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
        RETURN -1; -- Return -1 to indicate failure
    END CATCH
END