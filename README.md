SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [qms].[J3_QMS_Get_Files]
(
    @folder_id int = NULL,
    @user_id int = 1,
    @modify_date_from DateTime = NULL,
    @modify_date_to DateTime = NULL,
    @skip int = 0,
    @take int = 10000,
    @sort_by varchar(100) = 'FileName',
    @sort_direction varchar(100) = 'asc'
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Determine if the user is an admin (adjust the list according to your actual admin types)
    DECLARE @user_type NVARCHAR(100) = (SELECT User_Type FROM lib_user WITH (NOLOCK) WHERE UserId = @user_id);
    DECLARE @is_admin_user BIT = CASE WHEN @user_type IN ('Admin', 'SuperAdmin') THEN 1 ELSE 0 END;

    WITH BaseData AS
    (
        SELECT
            fl.ID,
            fl.ID AS DocumentID,
            -- Build the full filename with path
            LEFT(ISNULL(fl.Display_FilePath, N''),
                CASE WHEN PATINDEX(N'%/%', ISNULL(fl.Display_FilePath, N'')) = 0 THEN 0
                ELSE LEN(ISNULL(fl.Display_FilePath, N'')) - CHARINDEX(N'/', REVERSE(ISNULL(fl.Display_FilePath, N'')) + N'/')
                END) + N'/' + fl.logfileid AS Filename,
            -- Filename without path
            ISNULL(fl.Actual_LogFileId, fl.logfileid) AS FilenameWithoutPath,
            -- Path without filename
            LEFT(ISNULL(fl.Display_FilePath, N''),
                CASE WHEN PATINDEX(N'%/%', ISNULL(fl.Display_FilePath, N'')) = 0 THEN 0
                ELSE LEN(ISNULL(fl.Display_FilePath, N'')) - CHARINDEX(N'/', REVERSE(ISNULL(fl.Display_FilePath, N'')) + N'/')
                END) AS FilePathWithoutFilename,
            -- File extension
            CASE
                WHEN CHARINDEX('.', REVERSE(fl.logfileid)) > 0
                    AND CHARINDEX('.', fl.logfileid) > 0
                THEN RIGHT(fl.logfileid, CHARINDEX('.', REVERSE(fl.logfileid)))
                ELSE NULL
            END AS Extension,
            -- Size in KB
            CONVERT(DECIMAL(9,2), CEILING((ISNULL(fl.Size, 0) / 1024.00) * 100) / 100) AS Size,
            fi.Version,
            fi.FilePath,
            fl.date_of_creatation AS CreateDate,
            fl.Date_of_modification AS ModifyDate,
            fi.is_indexed AS Is_Indexed
        FROM
            QMSDtlsFile_log fl WITH (NOLOCK)
            INNER JOIN QMS_FILEVERSIONINFO fi WITH (NOLOCK)
                ON fl.ID = fi.FileID AND fl.version = fi.version
            -- Latest approved version per file
            INNER JOIN
            (
                SELECT
                    v.FileID,
                    MAX(v.Version) AS LatestVersion
                FROM QMS_FILEVERSIONINFO v
                WHERE NOT EXISTS
                (
                    SELECT 1
                    FROM QMS_FILE_APPROVAL a
                    WHERE a.qmsid = v.FileID
                      AND a.version = v.Version
                      AND ISNULL(a.ApprovalStatus, 0) = 0
                )
                GROUP BY v.FileID
            ) latest ON fl.ID = latest.FileID AND fl.version = latest.LatestVersion
        WHERE
            fl.Active_Status = 1
            AND fl.NodeType = 0   -- 0 = file, not folder
            AND (@folder_id IS NULL OR fl.ParentID = @folder_id)
            AND (@modify_date_from IS NULL OR fl.Date_Of_Modification > @modify_date_from)
            AND (@modify_date_to IS NULL OR fl.Date_Of_Modification < @modify_date_to)
            AND
            (
                @is_admin_user = 1
                OR EXISTS
                (
                    SELECT 1
                    FROM QMS_User_Folder_Access ufa
                    WHERE ufa.UserID = @user_id
                      AND ufa.FolderID = fl.ParentID
                )
            )
    )
    SELECT
        *,
        COUNT(*) OVER() AS TotalCount   -- Provides total row count for pagination
    FROM BaseData
    ORDER BY
        CASE WHEN @sort_by = 'FileName' AND @sort_direction = 'asc'  THEN FilenameWithoutPath END ASC,
        CASE WHEN @sort_by = 'FileName' AND @sort_direction = 'desc' THEN FilenameWithoutPath END DESC,
        CASE WHEN @sort_by = 'Size'     AND @sort_direction = 'asc'  THEN Size END ASC,
        CASE WHEN @sort_by = 'Size'     AND @sort_direction = 'desc' THEN Size END DESC,
        CASE WHEN @sort_by = 'Version'  AND @sort_direction = 'asc'  THEN Version END ASC,
        CASE WHEN @sort_by = 'Version'  AND @sort_direction = 'desc' THEN Version END DESC,
        FilenameWithoutPath ASC   -- default sort
    OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY;

END
GO