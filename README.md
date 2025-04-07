 public DataSet getDetailsgViewReadAll(int userID, string fromdate, string toDate, string ManualReadAll)
        {
            SqlParameter[] obj = new SqlParameter[]
            {                   
                new SqlParameter("@ID",SqlDbType.Int), 
                new SqlParameter("@TDate",SqlDbType.VarChar), 
                new SqlParameter("@FDate",SqlDbType.VarChar), 
                new SqlParameter("@vManual",SqlDbType.VarChar) 

                
            };


            obj[0].Value = userID;
            obj[1].Value = toDate;
            obj[2].Value = fromdate;
            obj[3].Value = ManualReadAll;


            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "SP_QMS_File_ReadAll", obj);
        }

        public void insertDataQmsLog(int UserID, string LOGManuals2, string LOGManuals3, string FileName, string LogDate)
        {
            
            DateTime LogDateText = DateTime.Parse(LogDate, iFormatProvider, System.Globalization.DateTimeStyles.NoCurrentDateDefault);

            SqlParameter[] obj = new SqlParameter[]
            {                   
                new SqlParameter("@UserID",SqlDbType.Int), 
                new SqlParameter("@FileName",SqlDbType.VarChar,200), 
                new SqlParameter("@LOGManuals2",SqlDbType.VarChar,500), 
                new SqlParameter("@LOGManuals3",SqlDbType.VarChar,500), 
                new SqlParameter("@LogDate",SqlDbType.DateTime) 
            };

            obj[0].Value = UserID;
            obj[1].Value = FileName;
            //obj[2].Value = M1;
            obj[2].Value = LOGManuals2;
            obj[3].Value = LOGManuals3;
            obj[4].Value = LogDateText;

            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "SP_QMSLog_InsertData", obj);
        }

        public DataSet FillManuals()
        {
            string sqlmanual = "Select distinct logmanual1 as logmanuals1 from QMSdtlsFile_Log order by Logmanual1";
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sqlmanual);
        }

        public DataSet FillUser(int userID)
        {

            SqlParameter[] obj = new SqlParameter[]
            {                   
                new SqlParameter("@userID",SqlDbType.Int)
            };

            obj[0].Value = userID;
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "SP_QMSLog_UserLoad", obj);

        }

        public DataSet FillDDUserByVessel(int vesselCode)
        {
            string sqlQueryView = "SELECT    CRW_Lib_Crew_Details.ID as userid, CRW_Lib_Crew_Details.Staff_Name + ' ' + CRW_Lib_Crew_Details.Staff_Midname + ' ' + CRW_Lib_Crew_Details.Staff_Surname AS User_name ";
            sqlQueryView += "FROM         CRW_Lib_Crew_Details INNER JOIN ";
            sqlQueryView += "                     CRW_Dtl_Crew_Voyages ON CRW_Lib_Crew_Details.Staff_Code = CRW_Dtl_Crew_Voyages.Staff_Code ";
            sqlQueryView += "WHERE     (CRW_Dtl_Crew_Voyages.Vessel_Code = " + vesselCode + ") ";
            sqlQueryView += "ORDER BY User_name";
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sqlQueryView);
        }

        public DataSet FillDDUserForOffice()
        {
            string sqlQueryView = "select User_name,UserID from Lib_User where Active_Status=1  order by User_name";
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sqlQueryView);
        }

        public string MessageName
        {
            get { return this._messagename; }
            set { this._messagename = value; }
        }

        public long MessageCode
        {
            get { return this._messagecode; }
        }

        public string ConnectionString
        {
            get { return this._constring; }
            set { this._constring = value; }
        }

        internal void insertDataQmsLog(string userID, string path, string fileName, DateTime date1)
        {
            throw new NotImplementedException();
        }

        public string Authentication(string username, string pasw)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                       {
                                           new SqlParameter("@username",username),
                                           new SqlParameter("@PASSWORD",pasw)
                                       };
            return SqlHelper.ExecuteScalar(_internalConnection, CommandType.StoredProcedure, "SP_QMS_Authentication", sqlprm).ToString();
        }

        public int getUserIDbyUsername(string userName)
        {
            SqlParameter[] obj = new SqlParameter[]
        {
            new SqlParameter ("@UserName",SqlDbType.VarChar,200),
            new SqlParameter("@UserID",SqlDbType.Int)
         };

            obj[0].Value = userName;
            obj[1].Direction = ParameterDirection.ReturnValue;
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "SP_QMS_getUserIDbyUsername", obj);
            return Convert.ToInt32(obj[1].Value);
        }

        public DataSet getUsersDetailsByUserID(string userid)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                       {
                                           new SqlParameter("@userid",userid)
                                       };
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "SP_QMS_UserDetailsbyId", sqlprm);
        }

        public void UpdatePwd(int username, string CurrentPwd, string NewPwd)
        {
            //string paswrd = DES_Encrypt_Decrypt.Encrypt(PWd);
            //string Npaswrd = DES_Encrypt_Decrypt.Encrypt(NewPwd);
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@username",username),
                                          new SqlParameter("@CurrentPwd",CurrentPwd),
                                          new SqlParameter("@NewPwd",NewPwd)
                                        };
            SqlHelper.ExecuteScalar(_internalConnection, CommandType.StoredProcedure, "SP_QMS_ChangePassword", sqlprm);
        }

        public void insertFileLogIntoDB(string ManualName, string FileName, string filePath, int UserID, string Remarks, int NodeType)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@ManualName",ManualName),
                                          new SqlParameter("@FileName",FileName),
                                          new SqlParameter("@filePath",filePath),
                                          new SqlParameter("@UserID",UserID),
                                           new SqlParameter("@Remarks",Remarks),
                                             new SqlParameter("@NodeType",NodeType)
                                        };
            SqlHelper.ExecuteScalar(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Insert_FileLogIntoDB", sqlprm);
        }

        public int getFileCountByFileID(int FileID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FileID",SqlDbType.Int),
                                           new SqlParameter("@FileCount",SqlDbType.Int)
                                        };

            sqlprm[0].Value = FileID;
            sqlprm[1].Direction = ParameterDirection.ReturnValue;
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Get_FileCountByFileID", sqlprm);
            return Convert.ToInt32(sqlprm[1].Value);
        }

        public void UpdateVersionInfoOfNewFileAdd(int fileID, string GuidFileName, int UserID, string Remarks, string IsApprovalRequired="")
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@fileID",fileID),
                                          new SqlParameter("@GuidFileName",GuidFileName),
                                          new SqlParameter("@UserID",UserID),
                                           new SqlParameter("@Remarks",Remarks),
                                           new SqlParameter("@IsApprovalRequired",IsApprovalRequired),

                                        };
            SqlHelper.ExecuteScalar(_internalConnection, CommandType.StoredProcedure, "QMS_SP_UpdateVersionInfoOfNewFileAdd", sqlprm);
        }

        public DataSet getFileVersion(int fileID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FileID",SqlDbType.Int)
                                        };

            sqlprm[0].Value = fileID;
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Get_FileVersion", sqlprm);
        }

        public DataSet getCheckedFileInfo(int FileID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FileID",SqlDbType.Int)
                                        };

            sqlprm[0].Value = FileID;
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Get_CheckedFileInfo", sqlprm);
        }

        public int getFileIDByPath(string FilePath)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FilePath",FilePath),
                                          new SqlParameter("@FileID",SqlDbType.Int)
                                        };

            sqlprm[1].Direction = ParameterDirection.ReturnValue;

            SqlHelper.ExecuteScalar(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Get_FileIDByPath", sqlprm);
            return Convert.ToInt32(sqlprm[1].Value);
           
        }

        public int  checkFileExits(string sFileName, string sFolderPath)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FileName",sFileName),
                                          new SqlParameter("@FolderPath",sFolderPath),
                                          new SqlParameter("@DocID",SqlDbType.Int)
                                        };
            
            sqlprm[2].Direction = ParameterDirection.ReturnValue;
            
            SqlHelper.ExecuteScalar(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Check_FileExists", sqlprm);
            return Convert.ToInt32(sqlprm[2].Value);
        }

        public int Get_UserAccess_OnFile(int FileID, int UserID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {                                          
                                          new SqlParameter("@FileID",FileID),
                                          new SqlParameter("@UserID",UserID),
                                          new SqlParameter("return",SqlDbType.Int)
                                        };

            sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;

            SqlHelper.ExecuteScalar(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Get_UserAccess_OnFile", sqlprm);
            return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);
        }

        public void insertRecordAtCheckout(int userID, int FileID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@userID",SqlDbType.Int),
                                          new SqlParameter("@FileID",SqlDbType.Int)
                                        };

            sqlprm[0].Value = userID;
            sqlprm[1].Value = FileID;
            SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Insert_RecordAtCheckout", sqlprm);

        }

        public void insertRecordAtCheckIN(int FileID, string FileName, int UserID, long Size, string IsApprovalRequired, string Remarks )
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                            new SqlParameter("@FileID",SqlDbType.Int),
                                            new SqlParameter("@FileName",SqlDbType.Text),
                                            new SqlParameter("@UserID",SqlDbType.Int),
                                            new SqlParameter("@Size",SqlDbType.Int),
                                            new SqlParameter("@IsApprovalRequired",SqlDbType.Text),
                                            new SqlParameter("@Remarks",SqlDbType.Text)
                                        };

            sqlprm[0].Value = FileID;
            sqlprm[1].Value = FileName;
            sqlprm[2].Value = UserID;
            sqlprm[3].Value = Size;
            sqlprm[4].Value = IsApprovalRequired;
            sqlprm[5].Value = Remarks;
            SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Insert_RecordAtCheckIN", sqlprm);

        }

        public DataSet getLatestFileOperationByUserID(int FileID, int UserId)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FileID",SqlDbType.Int),
                                           new SqlParameter("@userID",SqlDbType.Int)

                                        };

            sqlprm[0].Value = FileID;
            sqlprm[1].Value = UserId;
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Get_LatestFileOperationByUserID", sqlprm);

        }

        public DataSet fileInfoAtTreeBind(string FileName)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FileName",SqlDbType.VarChar,1000)

                                        };

            sqlprm[0].Value = FileName;
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "SP_QMS_fileInfoAtTreeBind", sqlprm);

        }

        public DataSet getFileDetailsByID(int DocID,int versionid)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@DocID",SqlDbType.Int),
                                           new SqlParameter("@VerNo",SqlDbType.Int)
                                        };

            sqlprm[0].Value = DocID;
            sqlprm[1].Value = versionid;
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_GET_FileDetails", sqlprm);
        }

        public DataSet GetLastestFileInfoByID(int FileID)
        {
            string sqlQuery = @"SELECT     QMSdtlsFile_Log.ID, QMSdtlsFile_Log.LogFileID, 
                                        QMSdtlsFile_Log.Date_Of_Creatation,
                                        tblCreatedBy.First_Name + ' ' + tblCreatedBy.Last_Name AS  Created_User,
                                        LastOpp.Operation_Date, LastOpp.Operation_Type, 
                                        lib_user.First_Name + ' ' + lib_user.Last_Name as Opp_User			
                            FROM         lib_user AS tblCreatedBy RIGHT OUTER JOIN
                                                  QMSdtlsFile_Log ON tblCreatedBy.UserID = QMSdtlsFile_Log.Created_By LEFT OUTER JOIN
                                                      (SELECT     ID, FileID, Operation_Date, User_ID, Operation_Type
                                                        FROM          QMS_FileOperationInfo AS QMS_FileOperationInfo_3
                                                        WHERE      (ID =
                                                                                   (SELECT     MAX(ID) AS ID
                                                                                     FROM          QMS_FileOperationInfo AS QMS_FileOperationInfo_2
                                                                                     WHERE      (FileID = " + FileID + ")))) AS LastOpp INNER JOIN";
            sqlQuery += " lib_user ON LastOpp.User_ID = lib_user.UserID ON QMSdtlsFile_Log.ID = LastOpp.FileID";
            sqlQuery += "    WHERE     (QMSdtlsFile_Log.ID = " + FileID + ")";
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sqlQuery);
        }

        public DataSet GetLastestApprovedFileInfoByID(int FileID)
        {
            string sqlQuery = @"SELECT top 1 LogFileId, fv.FilePath from QMS_FileVersionInfo fv 
            inner join qmsdtlsfile_log fl on fl.ID=fv.FileID 
            where NOT EXISTS(
            select 1 from qms_file_approval where QMSID=fv.FileID and fv.Version=Version 
            and Active_Status=1 
            and (ApprovalStatus=0 or ApprovalStatus is null)) 
            and fv.FileId=@DocID
            and fv.active_status = 1
            ORDER BY fv.Version DESC";
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@DocID",SqlDbType.Int) 
                                        };
            sqlprm[0].Value = FileID;
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sqlQuery, sqlprm);
        }

        public DataSet GetOprationDetailsByID(int FileID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FileID",SqlDbType.Int),
                                        };
            sqlprm[0].Value = FileID;
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "qms_get_operation_history", sqlprm);
        }

        public string getMachineNameByPath(string FolderPath)
        {
            return Convert.ToString(SqlHelper.ExecuteScalar(_internalConnection, CommandType.Text, "select distinct FilePath from QMSdtlsFile_Log where FilePath like  '%" + FolderPath + "%' "));
        }

        public int getMaxVersionFromParentTable(int fileID)
        {
            return Convert.ToInt32(SqlHelper.ExecuteScalar(_internalConnection, CommandType.Text, "select Version from QMSdtlsFile_Log where ID=" + fileID));
        }

        public int insertRecordAtFolderCreation(string LogFileID, string LogManuals, string FolderPath, int NodeType)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                            new SqlParameter("@LogFileID",LogFileID),
                                            new SqlParameter("@logManuals",LogManuals),
                                            new SqlParameter("@FolderPath",FolderPath),
                                            new SqlParameter("@NodeType",NodeType),
                                            new SqlParameter("return",SqlDbType.Int)
                                        };

            
            sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Insert_RecordAtFolderCreation", sqlprm);
            return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);

        }
        public int Insert_Dept_Folder_Access_DL(int FolderID, DataTable DepartmentIds, int UserID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FolderID",FolderID),
                                          new SqlParameter("@DeptID",DepartmentIds),
                                          new SqlParameter("@Created_By",UserID),
                                          new SqlParameter("return",SqlDbType.Int)
                                        };

            sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Insert_Dept_Folder_Access", sqlprm);
            return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);
        }
        public int Insert_User_Folder_Access_DL(int FolderID, int UserID, int CreatedBy)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FolderID",FolderID),
                                          new SqlParameter("@UserID",UserID),
                                          new SqlParameter("@Created_By",CreatedBy),
                                          new SqlParameter("return",SqlDbType.Int)
                                        };

            sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Insert_User_Folder_Access", sqlprm);
            return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);
        }
        public void Delete_Dept_Folder_Access_DL(int FolderID, int DeptID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FolderID",FolderID),
                                          new SqlParameter("@DeptID",DeptID)
                                        };
            
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Delete_Dept_Folder_Access", sqlprm);            
        }
        public void Delete_User_Folder_Access_DL(int FolderID, int UserID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FolderID",FolderID),
                                          new SqlParameter("@UserID",UserID)
                                        };

            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Delete_User_Folder_Access", sqlprm);
        }
        
        public DataSet getFileIDByDocInfo(string DocumentName)
        {
            string queryText = @"SELECT     QMSdtlsFile_Log.ID, QMSdtlsFile_Log.FilePath, v.version
            FROM         QMSdtlsFile_Log LEFT OUTER JOIN
                                      (SELECT     FileID, MAX(Version) AS version
                                        FROM          QMS_FileVersionInfo
                                        GROUP BY FileID) AS v ON QMSdtlsFile_Log.ID = v.FileID
            WHERE     (QMSdtlsFile_Log.LogFileID = '" + DocumentName + "')";
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, queryText);
        }

        public void AddNewUser(string Fname, string Lname, string Mname, string User, string Pwd, string Email, int AccessLevel)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        { new SqlParameter("@Fname",Fname),
                                          new SqlParameter("@Lname",Lname),
                                          new SqlParameter("@Mname",Mname),
                                          new SqlParameter("@Username",User),
                                          new SqlParameter("@Pwd",Pwd),
                                          new SqlParameter("@Email",Email),
                                          new SqlParameter("@AccessLevel",AccessLevel),
                                         };

            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "SP_QMS_AddNewUser", sqlprm);
        }

        public DataSet AccessLevel()
        {
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Get_AccessLevel");
        }

        public DataSet UserDetails()
        {
            string queryText = @" SELECT     lib_user.Active_Status, lib_user.UserID, lib_user.First_Name AS FirstName, 
                                  lib_user.Middle_Name AS MiddleName, lib_user.Last_Name AS Lastname, lib_user.MailId, lib_user.Role, 
                                  al.accesslevel, lib_user.AccessLevel AS AccessLevel_id, lib_user.ManagerID, (mgr.First_Name + ' ' + mgr.Last_Name) as  Mgr
            FROM         lib_user LEFT OUTER JOIN
                                  lib_user AS MGR ON lib_user.ManagerID = MGR.UserID LEFT OUTER JOIN
                                      (SELECT     a.ID AS level_id, a.Name AS accesslevel
                                        FROM          QMS_SystemParameters AS a INNER JOIN
                                                               QMS_SystemParameters AS b ON a.Prarent_Code = b.ID
                                        WHERE      (UPPER(b.Name) = 'ACCESSLEVEL')) AS al ON lib_user.AccessLevel = al.level_id 
            WHERE     (lib_user.Active_Status = 1) ";

            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, queryText);
        }

        public DataSet getUserDetailsByID(int userID)
        {
            string queryText = @"SELECT     UserID, UserName, First_Name, Last_Name, Middle_Name, MailId, Role, Password, AccessLevel
                    FROM         lib_user
                    WHERE     (UserID = " + userID + ") ";
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, queryText);
        }

        public void UpdateUserInfo(int USERID, string FirstName, string LastName, string MiddleName, string userName, string password, string Email, int accessLevel)
        {
            SqlParameter[] obj = new SqlParameter[]
             {
                 new SqlParameter("@userID", SqlDbType.Int),
                 new SqlParameter("@FirstName", SqlDbType.VarChar,200),
                 new SqlParameter("@LastName", SqlDbType.VarChar,200),
                 new SqlParameter("@MiddleName", SqlDbType.VarChar,200),
                 new SqlParameter("@userName", SqlDbType.VarChar,200),
                 new SqlParameter("@password", SqlDbType.VarChar,200),
                 new SqlParameter("@MailId",SqlDbType.VarChar,100),
                 new SqlParameter("@AccessLevelID", SqlDbType.Int)
             };

            obj[0].Value = USERID;
            obj[1].Value = FirstName;
            obj[2].Value = LastName;
            obj[3].Value = MiddleName;
            obj[4].Value = userName;
            obj[5].Value = password;
            obj[6].Value = Email;
            obj[7].Value = accessLevel;

            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "SP_QMS_UpdateUserInfo", obj);
        }

        public void DeleteUserByID(int USERID)
        {
            //SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, "UPDATE  lib_user  set Active_Status=0 where UserID=" + USERID);
        }

        public void RenameFolder(string ExistingFolderPath, string NewFolderPath, string NewDocName)
        {
            string queryText = "update QMSdtlsFile_Log  set LogFileID='" + NewDocName + "', LogDate=getdate(),FilePath='" + NewFolderPath + "' where FilePath= '" + ExistingFolderPath + "'";
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, queryText);

            queryText = "update QMSdtlsFile_Log  set FilePath=(select replace(FilePath,'" + ExistingFolderPath + "','" + NewFolderPath + "')) where FilePath like '" + ExistingFolderPath + "%' AND LogFileID!='" + NewDocName + "'";
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, queryText);

        }
        /// <summary>
        /// This Function Update New Folder Name with Old Folder Name
        /// </summary>
        /// <param name="ExistingFolderPath">Old Folder Path to replaced with new folder path</param>
        /// <param name="NewFolderPath">New Folder Path to be update in place of old path</param>
        /// <param name="NewDocName">Name Of The Folder</param>
        /// <param name="FolderID">ID Of The Folder</param>
        public void RenameFolder(string ExistingFolderPath, string NewFolderPath, string NewDocName, int FolderID)
        {
            string sql = @"DECLARE @PkCondition VARCHAR(400), @Id INT, @Today DATETIME = GETDATE()

            UPDATE QMSdtlsFile_Log  
            SET LogFileID = @NewFolderName, LogDate = @Today, FilePath = @NewFolderPath
            WHERE ID = @FolderId AND Active_Status = 1

            SET @PkCondition = 'ID=''' + CAST(@FolderId AS VARCHAR) + ''' AND Active_Status=1'
            EXEC [sync].[sync_records_by_condition] 'QMSdtlsFile_Log', 0, @PkCondition

            DECLARE @FetchIdsCursor INT           
            DECLARE IdsCursor CURSOR FOR
            SELECT ID 
            FROM QMSdtlsFile_Log
            WHERE Active_Status = 1 AND FilePath LIKE @ExistingFolderPath + '%' AND LogFileID != @NewFolderName

            OPEN IdsCursor          
            FETCH NEXT FROM IdsCursor INTO @Id  
            SET @FetchIdsCursor = @@FETCH_STATUS          
            WHILE @FetchIdsCursor = 0           
            BEGIN
	            UPDATE QMSdtlsFile_Log
	            SET LOGManual1 = @NewFolderPath, LOGManual2 = @NewFolderPath, LogDate = @Today, 
	            FilePath = (SELECT REPLACE(FilePath, @ExistingFolderPath, @NewFolderPath))
	            WHERE ID = @Id

	            UPDATE QMS_FileVersionInfo
	            SET FilePath = (SELECT REPLACE(FilePath, @ExistingFolderPath, @NewFolderPath))
	            WHERE Active_Status = 1 and FileId = @Id

	            -- sync to all vessels
	            SET @PkCondition = 'ID=''' + CAST(@ID AS VARCHAR) + ''''
                EXEC [sync].[sync_records_by_condition] 'QMSdtlsFile_Log', 0, @PkCondition

	            SET @PkCondition = 'FileID=''' + CAST(@ID AS VARCHAR) + ''' AND Active_Status=1'
                EXEC [sync].[sync_records_by_condition] 'QMS_FileVersionInfo', 0, @PkCondition

	            FETCH NEXT FROM IdsCursor INTO @Id           
	            SET @FetchIdsCursor = @@FETCH_STATUS  
            END  
            CLOSE IdsCursor          
            DEALLOCATE IdsCursor";

            var sqlParams = new SqlParameter[]
            {
                new SqlParameter("@ExistingFolderPath",ExistingFolderPath),
                new SqlParameter("@NewFolderPath", NewFolderPath),
                new SqlParameter("@NewFolderName", NewDocName),
                new SqlParameter("@FolderId", FolderID)
            };

            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, sql, sqlParams);
        }
               
        public void DeleteFolder(string ExistingFolderPathArr)
        {
            string queryText = @"delete from  QMSdtlsFile_Log FilePath='" + ExistingFolderPathArr + "' ";
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, queryText);
        }

        public DataSet QMS_Get_SchTree(int UserID, int dir, string PageLink)
        {
            SqlParameter[] obj = new SqlParameter[]
            {                   
                new SqlParameter("@UserID",UserID),
                new SqlParameter("@DirID",dir),
                 new SqlParameter("@PageLink",PageLink)     
            };
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Get_QMS_Folder", obj);
        }

        public DataSet QMS_Assignment_Info(int UserID, int dir, string PageLink)
        {
            SqlParameter[] obj = new SqlParameter[]
            {                   
                new SqlParameter("@UserID",UserID),
                new SqlParameter("@DirID",dir),
                 new SqlParameter("@PageLink",PageLink)     
            };
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_Vessel_Assigment_Info", obj);
        }

        public DataSet getFolderAsync(int UserID, int dir, string PageLink)
        {
            SqlParameter[] obj = new SqlParameter[]
            {                   
                new SqlParameter("@UserID",UserID),
                new SqlParameter("@Dir",dir),
                 new SqlParameter("@PageLink",PageLink)     
            };
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Get_FolderAsync", obj);
        }

        public int CreateNewFolder(string NewFolderName, int ParentFolderID, DataTable FolderAccessUserList, int UserID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                            new SqlParameter("@NewFolderName",NewFolderName),
                                            new SqlParameter("@ParentFolderID",ParentFolderID),
                                            new SqlParameter("@FolderAccessUserList",FolderAccessUserList),
                                            new SqlParameter("@UserID",UserID),
                                            new SqlParameter("return",SqlDbType.Int)
                                        };
            sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;
            sqlprm[2].SqlDbType = SqlDbType.Structured;

            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "QMS_SP_CreateNewFolder", sqlprm);
            return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);

        }

        public int Add_NewDocument_DL(int ParentFolderID, string FileName, string filePath, int UserID, string Remarks, long Size)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                            new SqlParameter("@ParentFolderID",ParentFolderID),
                                            new SqlParameter("@FileName",FileName),
                                            new SqlParameter("@filePath",filePath),
                                            new SqlParameter("@UserID",UserID),
                                            new SqlParameter("@Remarks",Remarks),
                                             new SqlParameter("@Size",Size),
                                            new SqlParameter("return",SqlDbType.Int)
                                        };
            sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Insert_NewDocument", sqlprm);
            return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);

        }

        public DataTable QMS_Files_Approval_Search(string searchtext, int Approval_Status, int? Approved_By, string sortby, int? sortdirection, int? pagenumber, int? pagesize, ref int isfetchcount)
        {

            System.Data.SqlClient.SqlParameter[] obj = new System.Data.SqlClient.SqlParameter[] 
            { 
                   new System.Data.SqlClient.SqlParameter("@SerchText", searchtext),
                   new System.Data.SqlClient.SqlParameter("@Approval_Status", Approval_Status),
                   new System.Data.SqlClient.SqlParameter("@Approved_By", Approved_By),

                   new System.Data.SqlClient.SqlParameter("@SORTBY",sortby), 
                   new System.Data.SqlClient.SqlParameter("@SORTDIRECTION",sortdirection), 
                   new System.Data.SqlClient.SqlParameter("@PAGENUMBER",pagenumber),
                   new System.Data.SqlClient.SqlParameter("@PAGESIZE",pagesize),
                   new System.Data.SqlClient.SqlParameter("@ISFETCHCOUNT",isfetchcount),
                    
            };
            obj[obj.Length - 1].Direction = ParameterDirection.InputOutput;
            System.Data.DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Files_Approval_Search", obj);
            isfetchcount = Convert.ToInt32(obj[obj.Length - 1].Value);
            return ds.Tables[0];


        }
        public DataTable QMS_Check_FileApprovalExists(int? FileID, int? Approver_ID,  int? Approval_Status, string sortby, int? sortdirection, int? pagenumber, int? pagesize, ref int isfetchcount)
        {
            System.Data.SqlClient.SqlParameter[] obj = new System.Data.SqlClient.SqlParameter[] 
                                        {
                                            new System.Data.SqlClient.SqlParameter("@File_ID",FileID),
                                            new System.Data.SqlClient.SqlParameter("@Approved_By",Approver_ID),
                                            new System.Data.SqlClient.SqlParameter("@Approval_Status",Approval_Status),
                                            new System.Data.SqlClient.SqlParameter("@SORTBY",sortby), 
                                            new System.Data.SqlClient.SqlParameter("@SORTDIRECTION",sortdirection), 
                                            new System.Data.SqlClient.SqlParameter("@PAGENUMBER",pagenumber),
                                            new System.Data.SqlClient.SqlParameter("@PAGESIZE",pagesize),
                                            new System.Data.SqlClient.SqlParameter("@ISFETCHCOUNT",isfetchcount),
                                        };

            obj[obj.Length - 1].Direction = ParameterDirection.InputOutput;
            System.Data.DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_Check_FileApprovalExists", obj);
            isfetchcount = Convert.ToInt32(obj[obj.Length - 1].Value);
            return ds.Tables[0];
            //System.Data.DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "JIT_DMS_Check_FileApprovalExists", sqlprm);
            //return ds.Tables[0];

        }
        public DataTable QMS_Files_Approval_List(int ID)
        {

            System.Data.SqlClient.SqlParameter[] obj = new System.Data.SqlClient.SqlParameter[] 
            { 
                   new System.Data.SqlClient.SqlParameter("@ID", ID),
            };
            System.Data.DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Files_Approval_List", obj);
         return ds.Tables[0];
        }


        public int QMS_Files_Approved(int QMSID, int Approve_By, string Remark, int Created_by, int Version)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                            new SqlParameter("@QMSID",QMSID),
                                            new SqlParameter("@Approve_By",Approve_By),
                                            new SqlParameter("@Remark",Remark),
                                            new SqlParameter("@Created_by",Created_by),
                                            new SqlParameter("@Version",Version),
                                            new SqlParameter("return",SqlDbType.Int)
                                        };
            sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "QMS_SP_File_Approved", sqlprm);
            return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);

        }

        public DataTable Get_FileName(string Path, string FileName)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                            new SqlParameter("@Path",Path),
                                            new SqlParameter("@FileName",FileName),
                                        };
            System.Data.DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_GET_FileName", sqlprm);
            return ds.Tables[0];

        }
        public DataTable getFileIDByFullPath(string FilePath)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FilePath",FilePath),
                                          
                                        };


            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Get_FileIDByFullPath", sqlprm).Tables[0];
        }
        public DataTable GET_FolderApproverList(int FolderID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                            new SqlParameter("@FolderID",FolderID),
                                           
                                        };
            System.Data.DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_GET_FolderApproverList", sqlprm);
            return ds.Tables[0];

        }
        public void UpdateDMSApprovarList(int FolderID, DataTable FolderApprovalLevel, int UserID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                            new SqlParameter("@FolderID",FolderID),
                                            new SqlParameter("@FolderApprovalLevel",FolderApprovalLevel),
                                            new SqlParameter("@UserID",UserID),
                                            
                                        };

            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "QMS_UpdateApprovarList", sqlprm);

        }
        public DataTable Delete_DMSFile_Folder(int ID, int UserID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                            new SqlParameter("@ID",ID),
                                            new SqlParameter("@UserID",UserID),
                                            
                                        };

            var ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_Delete_File_Folder", sqlprm);
            return ds.Tables[0];
        }

        public DataSet getDocumentReadListbyDocument_ID_DL(int DocID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@DocID",SqlDbType.Int)                                         
                                        };

            sqlprm[0].Value = DocID;
            //sqlprm[1].Value = versionid;
            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_GET_ReadDocument", sqlprm);
          
        }
        public DataTable QMS_SP_Files_SyncApproval_Search(string searchtext, int Approval_Status, int? Approved_By, string sortby, int? sortdirection, int? pagenumber, int? pagesize, int DownloadRequired, ref int isfetchcount)
        {

            System.Data.SqlClient.SqlParameter[] obj = new System.Data.SqlClient.SqlParameter[] 
            { 
                   new System.Data.SqlClient.SqlParameter("@SerchText", searchtext),
                   new System.Data.SqlClient.SqlParameter("@Approval_Status", Approval_Status),
                   new System.Data.SqlClient.SqlParameter("@Approved_By", Approved_By),

                   new System.Data.SqlClient.SqlParameter("@SORTBY",sortby), 
                   new System.Data.SqlClient.SqlParameter("@SORTDIRECTION",sortdirection), 
                   new System.Data.SqlClient.SqlParameter("@PAGENUMBER",pagenumber),
                   new System.Data.SqlClient.SqlParameter("@PAGESIZE",pagesize),
                    new System.Data.SqlClient.SqlParameter("@DownloadRequired",DownloadRequired),
                   new System.Data.SqlClient.SqlParameter("@ISFETCHCOUNT",isfetchcount),
                    
            };
            obj[obj.Length - 1].Direction = ParameterDirection.InputOutput;
            System.Data.DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Files_SyncApproval_Search", obj);
            isfetchcount = Convert.ToInt32(obj[obj.Length - 1].Value);
            return ds.Tables[0];


        }
        public DataTable QMS_SP_Files_SyncApproval_Search(string searchtext, int Approval_Status, int? Approved_By, string sortby, int? sortdirection, int? pagenumber, int? pagesize, int DownloadRequired,DataTable SizeRange, ref int isfetchcount)
        {

            System.Data.SqlClient.SqlParameter[] obj = new System.Data.SqlClient.SqlParameter[] 
            { 
                   new System.Data.SqlClient.SqlParameter("@SerchText", searchtext),
                   new System.Data.SqlClient.SqlParameter("@Approval_Status", Approval_Status),
                   new System.Data.SqlClient.SqlParameter("@Approved_By", Approved_By),

                   new System.Data.SqlClient.SqlParameter("@SORTBY",sortby), 
                   new System.Data.SqlClient.SqlParameter("@SORTDIRECTION",sortdirection), 
                   new System.Data.SqlClient.SqlParameter("@PAGENUMBER",pagenumber),
                   new System.Data.SqlClient.SqlParameter("@PAGESIZE",pagesize),
                    new System.Data.SqlClient.SqlParameter("@DownloadRequired",DownloadRequired),
                     new System.Data.SqlClient.SqlParameter("@SizeRange",SizeRange),
                   new System.Data.SqlClient.SqlParameter("@ISFETCHCOUNT",isfetchcount),
                    
            };
            obj[obj.Length - 1].Direction = ParameterDirection.InputOutput;
            System.Data.DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Files_SyncApproval_Search", obj);
            isfetchcount = Convert.ToInt32(obj[obj.Length - 1].Value);
            return ds.Tables[0];


        }
     
        public int QMS_SP_File_Sync(int QMSID, int Approve_By, string Remark, int Created_by, int Version)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                            new SqlParameter("@QMSID",QMSID),
                                            new SqlParameter("@Approve_By",Approve_By),
                                            new SqlParameter("@Remark",Remark),
                                            new SqlParameter("@Created_by",Created_by),
                                            new SqlParameter("@Version",Version),
                                            new SqlParameter("return",SqlDbType.Int)
                                        };
            sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "QMS_File_Sync_ByVessel", sqlprm);
            return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);

        }
        /// <summary>
        /// Overloaded file sync method
        /// </summary>
        /// <param name="SyncData"></param>
        /// <returns></returns>
        public int QMS_SP_File_Sync(DataTable SyncData)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                            new SqlParameter("@FileDetails",SyncData),
                                            new SqlParameter("return",SqlDbType.Int)
                                        };
            sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "qms_sync_all_file", sqlprm);
            return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);

        }

        public int QMS_SP_Check_File_Sync(DataTable dtfile)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                            new SqlParameter("@FileIDs",dtfile),
                                            new SqlParameter("return",SqlDbType.Int)
                                        };
            sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "QMS_VesselAssignment_Check_For_Sync", sqlprm);
            return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);

        }

        public DataSet QMS_Get_VesselSchInfo(int DocId, int companyID, int FleetID, int VesselTypeID, int VesselID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@DocId",DocId),
                                           new SqlParameter("@UserCompanyID",companyID),
                                            new SqlParameter("@FleetID",FleetID),
                                             new SqlParameter("@VesselTypeID",VesselTypeID),
                                              new SqlParameter("@VesselID",VesselID)
                                        };

            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_Get_VesselSchInfo", sqlprm);

        }

        public int QMS_Insert_AssignDocToVessel(DataTable FolderID, DataTable VesselID, int UserID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FolderIDS",FolderID),
                                           new SqlParameter("@VesselIDS",VesselID),
                                            new SqlParameter("@UserID",UserID),
                                             new SqlParameter("return",SqlDbType.Int)
                                        };
            sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;
            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "QMS_Vessel_Assignment", sqlprm);
            return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);

        }

        public DataSet QMS_Get_Vessel_List_Info(int DocId,int? FleetID,int? VesselTypeID,int? VesselID,int CompanyId)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@DocID",DocId),
                                           new SqlParameter("@FleetID",FleetID),
                                            new SqlParameter("@VesselTypeID",VesselTypeID),
                                             new SqlParameter("@VesselID",VesselID),
                                             new SqlParameter("@CompanyId",CompanyId)
                                            
                                        };

            return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_Get_Vessel_List", sqlprm);

        }
      
        public int QMS_Check_Assign(DataTable dtFolderID, DataTable dtVessel)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FolderIDS",dtFolderID),
                                          new SqlParameter("@VesselIDS",dtVessel),
                                          new SqlParameter("return",SqlDbType.Int)
                                            
                                        };
            sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;
            SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_Check_VesselAssignment", sqlprm);
            return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);
        

        }

        public int QMS_Create_AssignToVessel(DataTable FolderID, DataTable VesselID, int UserID)
        {
            try
            {
                SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FolderIDS",FolderID),
                                           new SqlParameter("@VesselIDS",VesselID),
                                            new SqlParameter("@UserID",UserID),
                                             new SqlParameter("return",SqlDbType.Int)
                                            
                                        };

                sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;
                SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_File_Keep_Assignment", sqlprm);
                return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public int QMS_Resync_AssignDocToVessel(DataTable FolderID, DataTable VesselID, int UserID)
        {
            try
            {
                SqlParameter[] sqlprm = new SqlParameter[]
                                            {
                                              new SqlParameter("@FolderIDS",FolderID),
                                               new SqlParameter("@VesselIDS",VesselID),
                                                new SqlParameter("@UserID",UserID),
                                                new SqlParameter("return",SqlDbType.Int)
                                            
                                            };

                sqlprm[sqlprm.Length - 1].Direction = ParameterDirection.ReturnValue;
                SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_Resync_Assignment", sqlprm);
                return Convert.ToInt32(sqlprm[sqlprm.Length - 1].Value);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public int QMS_SaveAssignQueue(bool DeletePrevAssign, bool AutoSync, DataTable FolderID, DataTable VesselID, int UserID)
        {
            try
            {
                SqlParameter[] sqlParams = new SqlParameter[]
                                            {
                                             new SqlParameter("@DeletePreviousAssignments", DeletePrevAssign),
                                             new SqlParameter("@AutoSync", AutoSync),
                                             new SqlParameter("@FolderIDS",FolderID),
                                             new SqlParameter("@VesselIDS",VesselID),
                                             new SqlParameter("@UserID",UserID),
                                             new SqlParameter("return",SqlDbType.Int) { Direction  = ParameterDirection.ReturnValue}

                                            };

                SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SaveAssignment_Queue", sqlParams);

                return Convert.ToInt32(sqlParams[sqlParams.Length - 1].Value);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public int QMS_RemoveAssignment(DataTable FolderID, DataTable VesselID, int UserID)
        {
            try
            {
                SqlParameter[] sqlParams = new SqlParameter[]
                                            {
                                             new SqlParameter("@FolderIDS",FolderID),
                                             new SqlParameter("@VesselIDS",VesselID),
                                             new SqlParameter("@UserID",UserID),
                                             new SqlParameter("return",SqlDbType.Int) { Direction  = ParameterDirection.ReturnValue}

                                            };

                 SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_Remove_Assignments", sqlParams);

                return Convert.ToInt32(sqlParams[sqlParams.Length - 1].Value);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public DataSet QMS_getFileDetails(DataTable dtFilePath, int UserID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                          new SqlParameter("@FilePaths",dtFilePath),
                                          new SqlParameter("@UserID",UserID),
                                        };
            DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "qms_get_filedetails", sqlprm);
            return ds;


        }
        /// <summary>
        /// Pass file path of all matched file and filter based on user-folder access
        /// For Admin user,it should get all matched files irrespective of user-folder access
        /// </summary>
        /// <param name="dtFilePath"></param>
        /// <param name="UserID"></param>
        /// <param name="IsAdminUser"></param>
        /// <returns></returns>
        public DataSet GetMatchedData(DataTable dtFilePath, int UserID, bool IsAdminUser)
        {
            try
            {
                StringBuilder query = new StringBuilder();
                query.Append("BEGIN\n declare @tblFilePath Table(FilePath varchar(500))");
                StringBuilder FilePathList = new StringBuilder();
                if (dtFilePath.Rows.Count > 0)
                {
                    for (int i = 0; i < dtFilePath.Rows.Count; i++)
                    {
                        DataRow row = dtFilePath.Rows[i];
                        if (i == 0 || (i + 1) % 1000 == 0)
                        {
                            FilePathList.Append(" insert into @tblFilePath (FilePath) values ('" + row["FilePath"].ToString().Replace("'", "''") + "')\n");
                        }
                        else
                        {
                            FilePathList.Append(",('" + row["FilePath"].ToString().Replace("'", "''") + "')\n");
                        }
                    }
                    query.Append(FilePathList.ToString());
                }

                query.Append("\nDeclare @UserID int=" + UserID);
                if (IsAdminUser)
                {
                    query.Append(" select qmslog.ParentID,qmslog.ID,qmslog.FilePath,qmslog.LogFileID,qmslog.Version");
                    query.Append(" from QMSdtlsFile_Log qmslog");
                    query.Append(" inner join @tblFilePath temp on temp.FilePath = qmslog.filepath");
                    query.Append(" WHERE qmslog.Active_Status = 1 and qmslog.NodeType = 0");
                }
                else
                {
                    query.Append(" select qmslog.ParentID,qmslog.ID,qmslog.FilePath,qmslog.LogFileID,qmslog.Version");
                    query.Append(" from QMSdtlsFile_Log qmslog");
                    query.Append(" join QMS_User_Folder_Access folderAccess");
                    query.Append(" on qmslog.ParentID = folderAccess.FolderID");
                    query.Append(" inner join @tblFilePath temp on temp.FilePath = qmslog.filepath");
                    query.Append(" WHERE qmslog.Active_Status = 1 and qmslog.NodeType = 0 and folderAccess.USERID = @UserID");
                }

                query.Append(" \nEND");
                return SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, query.ToString());
                 
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return null;
            }
        }
     
        public void Mark_Qms_Record_Synced(int currentUserId)
        {
            string sqlUpdateQmsRecords;
                SqlParameter[] sqlprm = new SqlParameter[]
                 {
                new SqlParameter("@currentUserId", currentUserId) };
                sqlUpdateQmsRecords = @"
                DECLARE @tabmtable LIB_PID              
                INSERT INTO @tabmtable VALUES (0)
                INSERT INTO @tabmtable VALUES (1)
                INSERT INTO @tabmtable VALUES (2)
                INSERT INTO @tabmtable VALUES (3)
                INSERT INTO @tabmtable VALUES (4)
                INSERT INTO @tabmtable VALUES (5)

                Declare  @tmpData as table  
                (    
	                ID INT,
                    LogFileID varchar(2000),
                    LOGManual1 varchar(4000),
                    FilePath varchar(4000),
                    LOGManual2 varchar(4000),
                    Version int,
                    NodeType int,
                    LogDate datetime,
                    SendToOffice char(1),
                    DwdReq int,
                    Size varchar(8000),
                    SyncID int,
                    ROWNUM varchar(8000)
                )

                INSERT INTO @tmpData(ID, LogFileID, LOGManual1, FilePath, LOGManual2, Version, NodeType, LogDate, SendToOffice, DwdReq, Size, SyncID, ROWNUM)   	
                EXEC QMS_SP_Files_SyncApproval_Search NULL, 0, NULL, NULL, NULL, 1, 100000, 1, @tabmtable, 0     

                UPDATE fl
                SET fl.SendToOffice = 'Y', fl.Modified_By = @currentUserId, fl.Date_Of_Modification = GETDATE()
                FROM QMSdtlsFile_Log fl
                where EXISTS(select 1 from @tmpData td where td.ID = fl.ID)";

                SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sqlUpdateQmsRecords, sqlprm);

        }

        //Added by sumit 14102020
        public DataTable GET_FolderDepartment(int FolderID)
        {
            SqlParameter[] sqlprm = new SqlParameter[]
                                        {
                                            new SqlParameter("@FolderID",FolderID),
                                        };
            System.Data.DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Get_Dept_Folder_Access", sqlprm);
            return ds.Tables[0];

        }

        public DataTable GetEncryptionKeys()
        {
            string query = "select [key], value from inf_lib_configuration" +
                " where [key] in ('nonSensitiveDataInitializationVector', 'nonSensitiveDataEncryptionKey') " +
                " and module_group='qms' and active_status=1";

            DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text,
               query);

            return ds.Tables[0];
        }

        public bool IsInterlinkingEnabled()
        {
            string query = "select [value] from inf_lib_configuration where [key] ='qms_interlinking' and active_status = 1";

            var res = SqlHelper.ExecuteScalar(_internalConnection, CommandType.Text,
               query);
            return res != null && res.ToString() == "1";
        }

        #region QMS-AUTO-SYNC

        public void SaveFileVesselSyncLedger(int vesselAssignmentId, char source, char status, int fileVersion)
        {
            try
            {
                string sqlQuery = @"DECLARE @Today datetime = GETDATE()
                            MERGE qms_file_vessel_sync_ledger AS TARGET
                            USING (VALUES(@VesselAssignmentId, @Source, @Status, @FileVersion)) AS SOURCE(vesselAssignmentId, [source], [status], [File_Version])
                            ON (TARGET.vessel_assignment_id = SOURCE.vesselAssignmentId)
                            WHEN MATCHED
                            THEN UPDATE 
                            SET TARGET.date_of_modification = @Today, TARGET.[source] = @Source, TARGET.[status] = @Status, TARGET.[File_Version] = @FileVersion,
                            TARGET.retry_count = 0, TARGET.verification_request_retry_count = 0, 
                            TARGET.metadata_sync_verified = NULL, TARGET.file_sync_verified = NULL
                            WHEN NOT MATCHED
                            THEN INSERT (vessel_assignment_id, date_of_creation, [source], [status], [File_Version])
                            VALUES(SOURCE.vesselAssignmentId, @Today, SOURCE.[source], SOURCE.[status], SOURCE.[File_Version]);";

                SqlParameter[] objParams = new SqlParameter[]
                {
                new SqlParameter("@VesselAssignmentId", SqlDbType.Int) { Value = vesselAssignmentId },
                new SqlParameter("@Source", SqlDbType.Char) { Value = source},
                new SqlParameter("@Status", SqlDbType.Char) { Value = status },
                new SqlParameter("@FileVersion", SqlDbType.Int) { Value = fileVersion },
                };
                objParams[0].Value = vesselAssignmentId;
                objParams[1].Value = source;

                SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, sqlQuery, objParams);

            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public DataSet getAssignmentIdsByDocId(int fileId)
        {
            try
            {
                string sqlQueryView = "Select ID, FileVersion from QMS_DTL_Vessel_Assignment where Document_ID = @fileId AND active_status = 1";
                SqlParameter[] objParams = new SqlParameter[]
                {
                     new SqlParameter("@fileId", SqlDbType.Int),
                   };
                objParams[0].Value = fileId;

                return SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sqlQueryView, objParams);

            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public DataTable GetRecordsFromLedger(int batchSize, int thresholdVesselAssignmentId)
        {
            try
            {
                const string sql = @"declare @BackoffPeriod int;
                                   declare @max_retries int, @verification_request_max_retries int;
                                   select top 1 @BackoffPeriod = ISNULL([value], 24)
                                   from inf_lib_configuration
                                   where[key] = 'qms_sync_to_vessel_max_delay_in_hours'
                                   select top 1 @max_retries = ISNULL([value], 10)
                                   from inf_lib_configuration
                                   where[key] = 'qms_sync_to_vessel_max_retries'
                                   select top 1 @verification_request_max_retries = ISNULL([value], 10)
                                    from inf_lib_configuration
                                    where[key] = 'qms_verification_request_max_retries'

                                    declare @threshold_backoff_time datetime = DATEADD(HOUR, -@BackoffPeriod, GETDATE());
                                    WITH PreFilter AS
                                    (
                                        SELECT
                                            assignment_request_uid,
                                            vessel_assignment_id,
                                            verification_request_retry_count,
                                            retry_count,
                                            last_sync_time,
                                            [status],
											qa.Vessel_ID,
											qa.Document_ID,
											qa.FileVersion as assignment_file_version,
											file_version
											FROM qms_file_vessel_sync_ledger ql with (nolock)
											inner join QMS_DTL_Vessel_Assignment qa
												on ql.vessel_assignment_id = qa.id
												and qa.active_status = 1
                                            where ql.vessel_assignment_id > @threshold_vessel_assignment_id
                                                AND  (ql.[status] = 'p' OR ql.[status] = 'w' or qa.FileVersion != file_version
                                                        OR (ql.[status] = 's'
                                                            AND ql.last_sync_time < @threshold_backoff_time
                                                            AND (ql.verification_request_last_sent_date IS NULL
                                                                    OR ql.verification_request_last_sent_date < @threshold_backoff_time))
                                                                    OR (ql.[status] in('f', 'r')
                                                            AND ql.retry_count < @max_retries
                                                            AND ql.verification_request_retry_count < @verification_request_max_retries))
                                    )
                                    SELECT TOP {0}
                                        ql.Vessel_ID,
                                        assignment_request_uid,
                                        ql.Document_ID,
                                        vessel_assignment_id,
                                        [status],
                                        last_sync_time,
                                        retry_count,
                                        verification_request_retry_count,
                                        ql.file_version,
                                        ql.assignment_file_version,
                                        Replace(RIGHT(qf.FilePath, (CHARINDEX('/',REVERSE(qf.FilePath ),1))),'/', '') as fileName,
                                        qf.FilePath as filePath
                                    from PreFilter ql
                                    inner join QMS_FileVersionInfo qf
                                        on qf.fileid = ql.document_id
                                        and qf.active_status = 1
                                        and qf.Version = ql.assignment_file_version
                                    inner join lib_vessels lv
                                        on ql.vessel_id = lv.vessel_id
                                        and lv.active_status = 1
                                        and lv.installation = 1
                                    ORDER BY vessel_assignment_id";

                var commandParameters = new SqlParameter[]
                {
                new SqlParameter("@threshold_vessel_assignment_id", thresholdVesselAssignmentId)
                };

                DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text,
                    string.Format(CultureInfo.InvariantCulture, sql, batchSize),
                    commandParameters);

                return ds.Tables[0];
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public bool updateQmsLedgerRecordStatus(int vesselAssigmentId, char status, int version)
        {
            try
            {
                string sql = @"declare @Today datetime = GETDATE();
                            update qms_file_vessel_sync_ledger set status = @Status, date_of_modification = @Today
                            where vessel_assignment_id = @VesselAssigmentId and file_version=@Version";

                var sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@VesselAssigmentId",vesselAssigmentId),
                    new SqlParameter("@Status",status),
                    new SqlParameter("@Version",version)
                };

                return SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, sql, sqlParams) > 0;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public bool updateQmsLedgerRecordSyncInfo(int vesselAssigmentId, char status, bool resetCount, int version)
        {
            try
            {
                string sql = string.Format(@"declare @Today datetime = GETDATE();
                            update qms_file_vessel_sync_ledger set status = @Status, last_sync_time = @Today, 
                            date_of_modification = @Today, 
                            retry_count = {0}
                            where vessel_assignment_id = @VesselAssigmentId and file_version=@Version", 
                            resetCount? "0": "retry_count + 1");

                var sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@VesselAssigmentId",vesselAssigmentId),
                    new SqlParameter("@Status",status),
                    new SqlParameter("@Version",version)
                };

                return SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, sql, sqlParams) > 0;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public bool updateQmsLedgerVerificationRequestDetails(Tuple<int, int>[] vesselAssigmentIdVersions, bool promoteRetry)
        {
            try
            {
                string sql = @"declare @Today datetime = GETDATE();
                            update qms_file_vessel_sync_ledger 
                            set verification_request_retry_count = verification_request_retry_count + 1, 
                            retry_count = {0},
                            date_of_modification = @Today, verification_request_last_sent_date = @Today
                            where ";

                for (int assignmentVerionIndex = 0; assignmentVerionIndex < vesselAssigmentIdVersions.Length; assignmentVerionIndex++)
                {
                    if (assignmentVerionIndex != 0)
                    {
                        sql += " or ";
                    }
                    sql += " (vessel_assignment_id = " + vesselAssigmentIdVersions[assignmentVerionIndex].Item1 + " and file_version = " + vesselAssigmentIdVersions[assignmentVerionIndex].Item2 + ") ";
                }

                return SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, string.Format(sql, promoteRetry? "retry_count + 1": "retry_count")) > 0;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public bool SyncQmsLedgerRecordToVessel(int fileId, int vesselId, int version, int createdBy = 1)
        {
            try
            {
                SqlParameter[] sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@QMSID",SqlDbType.Int) { Value =  fileId},
                    new SqlParameter("@Approve_By",SqlDbType.Int) { Value = createdBy },
                    new SqlParameter("@Remark",SqlDbType.VarChar,4000) { Value = DBNull.Value },
                    new SqlParameter("@Created_by",SqlDbType.Int) { Value = createdBy },
                    new SqlParameter("@Version",SqlDbType.Int) { Value = version },
                    new SqlParameter("@SyncMetadata",SqlDbType.Bit) { Value = true },
                    new SqlParameter("@SyncAttachments",SqlDbType.Bit) { Value = true },
                    new SqlParameter("@VesselIdToBeSynced",SqlDbType.Int) { Value = vesselId },
                    new SqlParameter("return",SqlDbType.Int)
                };

                sqlParams[sqlParams.Length - 1].Direction = ParameterDirection.ReturnValue;

                SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "[dbo].[QMS_File_Sync_ByVessel3]", sqlParams);

                return Convert.ToInt32(sqlParams[sqlParams.Length - 1].Value) > 0;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public bool DeleteFileHistoryDuplicates(int fileId, int vesselId, int version, bool resetSyncId = false)
        {
            try
            {
                string sql = @"
                ;WITH IDList AS (
                        SELECT
                            id
                        FROM
                            QMS_sync_history
                        WHERE
                            active_status = 1
                            AND VesselID = @VesselId
                            AND FileID = @FileId
                            AND FileVersion = @FileVersion
                        ORDER BY
                            ISNULL(syncid,
                                2147483647)
                            DESC,
                            id DESC OFFSET 1 ROW
                    ) DELETE FROM IDList
                ";

                if(resetSyncId)
                {
                    sql += @" update QMS_sync_history 
                            set syncid = NULL 
                            where active_status = 1 and VesselID = @VesselId AND FileID = @FileId AND FileVersion = @FileVersion";
                }

                var sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@VesselId",vesselId),
                    new SqlParameter("@FileId",fileId),
                    new SqlParameter("@FileVersion",version)
                };

                return SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, sql, sqlParams) > 0;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public bool IsSentToVessel(int fileId, int vesselId, int version)
        {
            try
            {
                string sql = @"select top 1 1
                        from QMS_sync_history with (nolock)
                        where active_status = 1 and VesselID = @VesselId AND FileID = @FileId AND FileVersion = @FileVersion and syncid is not null";

                var sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@VesselId",vesselId),
                    new SqlParameter("@FileId",fileId),
                    new SqlParameter("@FileVersion",version)
                };

                var ret = SqlHelper.ExecuteScalar(_internalConnection, CommandType.Text, sql, sqlParams);

                return ret != null && (int)ret == 1;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public string GetVesselSatelliteCommunicationType(int vesselId, string fieldName)
        {
            try
            {
                string sql = @"select top 1 FieldValue
                            from VesselInfo_VesselfieldDtl dtl
                            inner join Lib_VesselInfo_VesselField lib on lib.FieldID = dtl.FieldID and lib.FieldName = @FieldName and lib.Active_Status = 1
                            where dtl.Vessel_ID = @VesselId and dtl.Active_Status = 1";

                SqlParameter[] sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@FieldName",SqlDbType.VarChar) { Value = fieldName},
                    new SqlParameter("@VesselId",SqlDbType.Int) { Value = vesselId}
                };

                var ret = SqlHelper.ExecuteScalar(_internalConnection, CommandType.Text, sql, sqlParams);

                return ret != null? ret.ToString(): string.Empty;

            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public DataTable getConfigDetails()
        {
            string sql = @"SELECT [key], value 
                        from inf_lib_configuration 
                        where module_code = 'quality' and module_group = 'qms-auto-sync' and active_status = 1";

            DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sql);

            return ds.Tables[0];
        }

        public void SyncFileMetaDataFromLedger(int id, int vesselId)
        {
            SqlParameter[] sqlParams = new SqlParameter[]
            {
                new SqlParameter("@TableName",SqlDbType.VarChar, 250) { Value = "QMSdtlsFile_Log"},
                new SqlParameter("@PKCondition",SqlDbType.VarChar, 1000) { Value = string.Format("ID = '{0}'", id)},
                new SqlParameter("@Vessel_ID",SqlDbType.Int) { Value = vesselId}
            };

            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "[SYNC_SP_DataSynch_MultiPK_DataLog]", sqlParams);
        }

        public void SyncFilesFromLedger(string fileName, int vesselId)
        {
            SqlParameter[] sqlParams = new SqlParameter[]
            {
                new SqlParameter("@Attachment_Path",SqlDbType.NVarChar, 255) { Value = fileName},
                new SqlParameter("@Vessel_ID",SqlDbType.Int) { Value = vesselId}
            };

            SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "[SYNC_INS_DataLog_Attachments]", sqlParams);
        }

        public DataTable GetPendingVesselAssignmentRequests(int batchSize)
        {
            try
            {
                const string sql = 
                    @"select TOP {0} [uid], created_by, delete_previous_assignments, auto_sync_files, [status]
                      from qms_vessel_assignment_request
                      where status = 'p' 
                      order by date_of_creation";

                DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, 
                    String.Format(CultureInfo.InvariantCulture, sql, batchSize));
                return ds.Tables[0];
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public DataTable getPendingAssignments(string requestUid)
        {
            try
            {
                string sql = @"select v.vessel_uid, lv.Vessel_ID, f.folder_id, v.assigned_folder_uid, v.[status], v.retry_count, f.previous_assignments_deleted
                        from qms_assignment_request_vessel v
                        inner join qms_assignment_request_folder f on v.assigned_folder_uid = f.[uid]
                        inner join lib_vessels lv on v.vessel_uid = lv.uid and lv.active_status = 1
                        where v.[status] = 'p' and request_uid = @RequestUid";

                SqlParameter[] sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@RequestUid", requestUid)
                };

                DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sql, sqlParams);
                return ds.Tables[0];
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public DataTable Check_FileApprovalStatus(int levelId, int parentFolderID)
        {
            string sqlQueryView = "select qmsid as fileID from [QMS_FILE_APPROVAL] where Parent_ID = " + parentFolderID;
            sqlQueryView += " and LevelID = " + levelId + " and Active_Status = 1 and ApprovalStatus = 1 ";
            System.Data.DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sqlQueryView);
            return ds.Tables[0];
        }

        public DataTable GetAssignedVesselFolderAssignmentRequests(string folderAssignmentUid, int folderId)
        {
            try
            {
                string sql = @"select qarv.vessel_uid, lv.vessel_id, qarv.[status], qarv.retry_count, dva.ID as vessel_assignment_id, 
                            dva.Document_ID as file_id, fl.size, fl.Version, fl.FilePath
                            from qms_assignment_request_vessel qarv
                            inner join lib_vessels lv on lv.[uid] = qarv.vessel_uid and lv.active_status = 1
                            inner join QMSdtlsFile_Log fl on fl.ParentId = @FolderId and fl.NodeType = 0 and fl.active_status = 1
                            inner join QMS_DTL_Vessel_Assignment dva on dva.Document_ID = fl.ID and dva.Vessel_ID = lv.vessel_id and dva.active_status = 1 and dva.FileVersion=fl.Version
                            where qarv.assigned_folder_uid = @FolderAssignmentUid and qarv.[status] in ('a', 'r')";

                SqlParameter[] sqlParams = new SqlParameter[]
               {
                    new SqlParameter("@FolderAssignmentUid", folderAssignmentUid),
                    new SqlParameter("@FolderId",SqlDbType.Int) { Value = folderId}
               };

                DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sql, sqlParams);

                return ds.Tables[0];

            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public DataTable GetQmsFileAssignments(int fileId)
        {
            try
            {
                string sql = @"SELECT va.Vessel_ID, va.FileVersion, fl.FilePath FROM QMS_DTL_Vessel_Assignment va with (nolock)
                            INNER JOIN QMSdtlsFile_Log fl ON va.Document_ID=fl.ID AND va.FileVersion=fl.Version
                            WHERE va.Document_ID=@FileId AND va.Active_Status=1";
                SqlParameter[] sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@FileId", fileId)
                };

                DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sql, sqlParams);

                return ds.Tables[0];
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public bool UpdatePreviousAssignmentsDeletedStatus(string folderAssigmnetUid)
        {
            try
            {
                string sql = @"declare @Today datetime = GETDATE() 
                            update qms_assignment_request_folder 
                            set previous_assignments_deleted = 1, date_of_modification = @Today
                            where uid = @FolderAssignmentUid";

                SqlParameter[] sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@FolderAssignmentUid", folderAssigmnetUid)
                };

                return SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, sql, sqlParams) > 0;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public bool InsertIntoSyncLedger(int vesselAssignId, string requestUid, char status, char source, int fileVersion)
        {
            try
            {
                string sql = @"DECLARE @Today datetime = GETDATE()
                            MERGE qms_file_vessel_sync_ledger AS TARGET
                            USING (VALUES(@VesselAssignmentId, @Status, @RequestUid, @Source, @FileVersion)) 
                            AS SOURCE(vesselAssignmentId, [status], assignment_request_uid, [source], [File_Version]) 
                            ON (TARGET.vessel_assignment_id = SOURCE.vesselAssignmentId)
                            WHEN MATCHED
                            THEN UPDATE
                            SET TARGET.date_of_modification = @Today, TARGET.[source] = @Source, TARGET.[status] = SOURCE.[status], TARGET.[File_Version] = SOURCE.[File_Version],
                                TARGET.retry_count = 0, TARGET.verification_request_retry_count = 0,
                                TARGET.metadata_sync_verified = NULL, TARGET.file_sync_verified = NULL,
                                TARGET.last_sync_time = NULL, TARGET.verification_request_last_sent_date = NULL, TARGET.last_error_message = NULL
                            WHEN NOT MATCHED
                            THEN INSERT (vessel_assignment_id, date_of_creation, [status], assignment_request_uid, [source], [File_Version])
                            VALUES(SOURCE.vesselAssignmentId, @Today, SOURCE.[status], SOURCE.assignment_request_uid, SOURCE.[source], SOURCE.[File_Version]);";

                SqlParameter[] sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@VesselAssignmentId", SqlDbType.Int) { Value = vesselAssignId},
                    new SqlParameter("@Status", SqlDbType.Char) { Value = status},
                    new SqlParameter("@RequestUid", requestUid),
                    new SqlParameter("@Source", SqlDbType.Char) { Value = source},
                    new SqlParameter("@FileVersion", SqlDbType.Int) { Value = fileVersion},
                };

                if(string.IsNullOrEmpty(requestUid))
                {
                    sqlParams[2].Value = DBNull.Value;
                }

                return SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, sql, sqlParams) > 0;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public bool UpdateFolderVesselAssignmentSuccessStatus(string folderAssigmnetUid)
        {
            try
            {
                string sql = @"declare @Today datetime = GETDATE()
                        
                            update qms_assignment_request_vessel 
                            set status = 'a', date_of_modification = @Today
                            where assigned_folder_uid = @FolderAssignmentUid";

                SqlParameter[] sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@FolderAssignmentUid", folderAssigmnetUid)
                };

                return SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, sql, sqlParams) > 0;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public bool UpdateFolderVesselAssignmentFailStatus(string folderAssigmnetUid)
        {
            try
            {
                string sql = @"declare @Today datetime = GETDATE(), @RetryStatus char(1) = 'r', @FailStatus char(1) = 'f'
                            declare @MaxRetries int = 0
                        
                            select top 1 @MaxRetries = ISNULL([value], 5)
                            from inf_lib_configuration 
                            where module_code = 'quality' and module_group = 'qms-auto-sync' and [key] = 'qms_folder_vessel_assigment_max_retries'

                            update qms_assignment_request_vessel
                            set [status] = case when retry_count < @MaxRetries then @RetryStatus else @FailStatus end, date_of_modification = @Today, 
                            retry_count = case when retry_count < @MaxRetries then retry_count + 1 else retry_count end
                            where assigned_folder_uid = @FolderAssignmentUid";

                SqlParameter[] sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@FolderAssignmentUid", folderAssigmnetUid)
                };

                return SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, sql, sqlParams) > 0;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public bool UpdateAssignmentRequestStatus(string requestUid, char status)
        {
            try
            {
                string sql = @"declare @Today datetime = GETDATE()
                        
                            update qms_vessel_assignment_request 
                            set status = @Status, date_of_modification = @Today
                            where uid = @FolderAssignmentUid";

                SqlParameter[] sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@FolderAssignmentUid", requestUid),
                    new SqlParameter("@Status",SqlDbType.Char) { Value = status}
                };

                return SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, sql, sqlParams) > 0;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public bool UpdateAssignmentRequestStatusForCompletedRequests()
        {
            try
            {
            string sql = @"declare @max_retries int, @verification_request_max_retries int;

                        select top 1 @max_retries = ISNULL([value], 10)
                        from inf_lib_configuration with (nolock)
                        where[key] = 'qms_sync_to_vessel_max_retries'

                        select top 1 @verification_request_max_retries = ISNULL([value], 10)
                        from inf_lib_configuration with (nolock)
                        where[key] = 'qms_verification_request_max_retries'

                        update qms_vessel_assignment_request
                        set [status] = 'c', date_of_modification = GETDATE()
                        where [uid] in (
                        select req.[uid]
                        from qms_vessel_assignment_request req with (nolock) left join
                        qms_file_vessel_sync_ledger ldg  on req.[uid] = ldg.assignment_request_uid 
                        and (ldg.[status] in ('p','s') or (ldg.[status] in('f', 'r') and ldg.retry_count < @max_retries and 
                        ldg.verification_request_retry_count < @verification_request_max_retries))
                        where req.[status] = 'w'
                        group by req.[uid]
                        having count (ldg.vessel_assignment_id) = 0)";

            return SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.Text, sql) > 0;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public DataTable QMS_getVesselIDs(string assignedFolderUid)
        {
            string sqlQueryView = "select vessel_id as VesselID from qms_assignment_request_vessel v";
            sqlQueryView += " inner join lib_vessels lv on v.vessel_uid = lv.uid";
            sqlQueryView += " where assigned_folder_uid = '" + assignedFolderUid + "'";
            System.Data.DataSet ds = SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sqlQueryView);
            return ds.Tables[0];
        }

        public void SyncVerificationRequestToVessel(string query, int vesselId)
        {
            try
            {
                SqlParameter[] sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@TableName",SqlDbType.VarChar, 250) { Value = DBNull.Value},
                    new SqlParameter("@PKID",SqlDbType.VarChar, 250) { Value = DBNull.Value},
                    new SqlParameter("@PKValue",SqlDbType.VarChar, 250) { Value = DBNull.Value},
                    new SqlParameter("@Vessel_ID",SqlDbType.Int) { Value = vesselId},
                    new SqlParameter("@SQL_UPDATE",SqlDbType.VarChar, 8000) { Value = query }
                };

                SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "[SYNC_SP_DataSynchronizer_DataLog]", sqlParams);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public bool CheckDataLogRecordsProcessed(int fileId, string fileName, int vesselId)
        {
            try
            {
                string sql = @"DECLARE @VesselCode varchar(10);
                        select @VesselCode=sync_vessel_code from lib_vessels with (nolock) where Vessel_ID=@VesselId

                        DECLARE @IsProcessed bit = 1;
                        if exists (select 1 from DATA_LOG with (nolock) where Table_NAME='qmsdtlsfile_log' and PK_FieldVALUE=@FileId
                                            and Vessel_code=@VesselCode)
                        begin
                        SET @IsProcessed=0;
                        end else
                        begin
                        if exists (select 1 from DATA_LOG with (nolock) where Table_NAME='ATTACHMENT' and TableFIELD_NAME_VALUE=@FileName
                        and Vessel_code=@VesselCode)
                        begin
                        SET @IsProcessed=0;
                        end
                        end;
                        SELECT @IsProcessed;";

                SqlParameter[] sqlParams = new SqlParameter[]
                {
                    new SqlParameter("@FileId", SqlDbType.Int) { Value = fileId },
                    new SqlParameter("@FileName",SqlDbType.VarChar, 255) { Value = fileName},
                    new SqlParameter("@VesselId",SqlDbType.Int) { Value = vesselId }
                };

                return (bool)SqlHelper.ExecuteScalar(_internalConnection, CommandType.Text, sql, sqlParams);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        #endregion
    }
}
