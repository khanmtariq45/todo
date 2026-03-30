/****** Object:  StoredProcedure [qms].[J3_QMS_Get_Files] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
 
-- =============================================
-- Description: List files in the QMS
--              Supports optional filtering by folder id and date range. Pagination via OFFSET/FETCH.
--              Returns unified result set aligned with J3_QMS_FILTER_SEARCH:
--              id, filename, type, size, fileVersion, parentId, publishedOn,
--              FilePathWithoutFilename, result_priority, RowsCount.
-- =============================================
 
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
Declare @user_type nvarchar(100) = isnull((select top 1 User_Type from lib_user with (nolock) where UserId = @user_id),'');
Declare @is_admin_user bit = 1;
select * from		
	(select fl.ID ID, fl.ID DocumentID,
			LEFT(ISNULL(fl.Display_FilePath, N''),
				CASE WHEN PATINDEX(N'%/%', ISNULL(fl.Display_FilePath, N'')) = 0 THEN 0
				ELSE LEN(ISNULL(fl.Display_FilePath, N'')) - CHARINDEX(N'/', REVERSE(ISNULL(fl.Display_FilePath, N'')) + N'/')
				END) + N'/' + fl.logfileid AS Filename,
			ISNULL(fl.Actual_LogFileId, fl.logfileid) As FilenameWithoutPath,
			LEFT(ISNULL(fl.Display_FilePath, N''),
				CASE WHEN PATINDEX(N'%/%', ISNULL(fl.Display_FilePath, N'')) = 0 THEN 0
				ELSE LEN(ISNULL(fl.Display_FilePath, N'')) - CHARINDEX(N'/', REVERSE(ISNULL(fl.Display_FilePath, N'')) + N'/')
				END) AS FilePathWithoutFilename,
			CASE 
				WHEN CHARINDEX('.', REVERSE(fl.logfileid)) > 0 
					AND CHARINDEX('.', fl.logfileid) > 0
				THEN RIGHT(fl.logfileid, CHARINDEX('.', REVERSE(fl.logfileid)))
				ELSE NULL
			END AS Extension,
            CONVERT(DECIMAL(9,2),ceiling((isnull(fl.Size,0) / 1024.00) * 100) / 100) AS Size,
			fi.Version, fi.FilePath, fl.date_of_creatation CreateDate, fl.Date_of_modification as ModifyDate,fi.is_indexed Is_Indexed
            FROM QMSDtlsFile_log fl with (nolock)
            INNER JOIN QMS_FILEVERSIONINFO fi with (nolock) ON fl.ID=fi.FileID and fl.version = fi.version
            INNER JOIN ( /* to verify that file is the latest approved version */
                            select qms_fvi.fileid [file_id], max(qms_fvi.version) [version]
                            from QMS_FILEVERSIONINFO qms_fvi with (nolock) left join 
                                (
                                    select fa.qmsid as unapproved_file_id, isnull(fa.version,1) unapproved_version
                                    from QMS_FILE_APPROVAL fa with (nolock)
                                    where isnull(fa.ApprovalStatus,0) = 0
                                    group by fa.qmsid, fa.version
                                ) ua on qms_fvi.FileID = ua.unapproved_file_id and qms_fvi.version = unapproved_version
                            where ua.unapproved_file_id is null 
                            group by fileid
                        ) info on info.file_id = fl.id and info.version = fl.version
            LEFT JOIN (select distinct UserID, FolderID from QMS_User_Folder_Access with (nolock) where UserID = @user_id) folderAccess ON fl.ParentID = folderAccess.FolderID /* verify user has access */
        WHERE 
		(@folder_id IS NULL OR fl.ParentID = @folder_id)
        AND fl.Active_Status=1 AND fl.NodeType=0
		AND (@modify_date_from IS NULL OR fl.Date_Of_Modification > @modify_date_from)
		AND (@modify_date_to IS NULL OR fl.Date_Of_Modification < @modify_date_to)
		AND (@is_admin_user = 1 OR folderAccess.UserID = @user_id)
		) result
	ORDER BY
		CASE WHEN @sort_by = 'FileName' AND @sort_direction = 'asc' THEN result.FilenameWithoutPath END ASC,
		CASE WHEN @sort_by = 'FileName' AND @sort_direction = 'desc' THEN result.FilenameWithoutPath END DESC,
		CASE WHEN @sort_by = 'Size' AND @sort_direction = 'asc' THEN result.Size END ASC,
		CASE WHEN @sort_by = 'Size' AND @sort_direction = 'desc' THEN result.Size END DESC,
		CASE WHEN @sort_by = 'Version' AND @sort_direction = 'asc' THEN result.Version END ASC,
		CASE WHEN @sort_by = 'Version' AND @sort_direction = 'desc' THEN result.Version END DESC,
		result.FilenameWithoutPath ASC
	OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY
END
