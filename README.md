I want to run that [register_script_for_execution]
EXEC [inf].[register_script_for_execution] 
    'QMS', 
    'QMS_Document', 
    'DB Change 998351: EPS Prod - Demo Vessel - In EPS Manuals, search functionality is not working.', 
    'O', 
    @SQL_Script;

	in which I want a veriable @SQL_Script for below script 

CREATE OR ALTER proc qms_get_operation_history
@FileID int=0
As
BEGIN

select * into #approval_list from
 (
			  (SELECT   QMS_FileOperationInfo.User_ID, 
			  QMS_FileOperationInfo.Operation_Type, 
			  QMS_FileOperationInfo.Operation_Date, 
			  lib_user.First_Name AS First_Name, 
			  lib_user.Last_Name, 
			  (lib_user.First_Name + ' ' + lib_user.Last_Name) as UserName, 
			  QMSdtlsFile_Log.LogFileID, 
			  QMS_FileOperationInfo.Version, 
			  QMSdtlsFile_Log.ID AS DocID,
			  (null) as Approval_Level, 
			  Remarks,
			  LIB_USER.ACTIVE_STATUS as User_ACTIVE_STATUS,
			  CAST('' AS VARCHAR(MAX)) AS FilePath
				FROM         QMS_FileOperationInfo INNER JOIN
								QMSdtlsFile_Log ON QMS_FileOperationInfo.FileID = QMSdtlsFile_Log.ID INNER JOIN
								lib_user ON QMS_FileOperationInfo.User_ID = lib_user.UserID  
				WHERE     QMSdtlsFile_Log.ID =@FileID and QMS_FileOperationInfo.Active_Status=1
				)
 UNION
             ( SELECT
			 distinct  
			 Approve_By User_ID,
			 case when ApprovalStatus!=0 then 'APPROVED' else 'PENDING APPROVAL' end Operation_Type ,
             cast(Date_Of_Approval as datetime) Operation_Date, 
		     LIB_USER.First_Name AS First_Name, 
             LIB_USER.Last_Name, 
			 (LIB_USER.First_Name + ' ' + LIB_USER.Last_Name) as UserName, 
			 LogFileID
		    ,QMS_File_Approval.Version
			,QMSdtlsFile_Log.ID AS DocID 
			,case when QMS_FILE_APPROVAL.LevelID=1 then'First Approver' when QMS_FILE_APPROVAL.LevelID=2 then 'Second Approver' else 'Third Approver' end as Approval_Level, QMS_File_Approval.Remark
			,LIB_USER.ACTIVE_STATUS as User_ACTIVE_STATUS,
			CAST('' AS VARCHAR(MAX)) AS FilePath
			FROM QMS_File_Approval 
            INNER JOIN QMSdtlsFile_Log ON QMS_File_Approval.QMSID = QMSdtlsFile_Log.ID INNER JOIN
            LIB_USER on QMS_File_Approval.Approve_By=LIB_USER.UserID where QMS_File_Approval.Active_Status=1 AND QMS_File_Approval.QMSID=@FileID 
	        )
 )result
			
			Delete from #approval_list where User_ACTIVE_STATUS=0 and operation_type='PENDING APPROVAL'
			
			-- Update FilePath in the temporary table
			UPDATE al SET FilePath = qf.FilePath FROM #approval_list al
			INNER JOIN QMS_FileVersionInfo qf ON qf.fileid = al.DocID AND qf.version = al.Version AND qf.active_status = 1;

			Select * from #approval_list ORDER BY Operation_Date, [Version]
END
