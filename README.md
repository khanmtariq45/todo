public DataSet getDetailsgViewReadAll(int userID, string fromdate, string toDate, string ManualReadAll)
{
    try
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
    catch
    {
        throw;
    }
}

public void insertDataQmsLog(int UserID, string LOGManuals2, string LOGManuals3, string FileName, string LogDate)
{
    try
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
        obj[2].Value = LOGManuals2;
        obj[3].Value = LOGManuals3;
        obj[4].Value = LogDateText;

        SqlHelper.ExecuteNonQuery(_internalConnection, CommandType.StoredProcedure, "SP_QMSLog_InsertData", obj);
    }
    catch
    {
        throw;
    }
}

public DataSet FillManuals()
{
    try
    {
        string sqlmanual = "Select distinct logmanual1 as logmanuals1 from QMSdtlsFile_Log order by Logmanual1";
        return SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sqlmanual);
    }
    catch
    {
        throw;
    }
}

public DataSet FillUser(int userID)
{
    try
    {
        SqlParameter[] obj = new SqlParameter[]
        {                   
            new SqlParameter("@userID",SqlDbType.Int)
        };

        obj[0].Value = userID;
        return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "SP_QMSLog_UserLoad", obj);
    }
    catch
    {
        throw;
    }
}

public DataSet FillDDUserByVessel(int vesselCode)
{
    try
    {
        string sqlQueryView = "SELECT    CRW_Lib_Crew_Details.ID as userid, CRW_Lib_Crew_Details.Staff_Name + ' ' + CRW_Lib_Crew_Details.Staff_Midname + ' ' + CRW_Lib_Crew_Details.Staff_Surname AS User_name ";
        sqlQueryView += "FROM         CRW_Lib_Crew_Details INNER JOIN ";
        sqlQueryView += "                     CRW_Dtl_Crew_Voyages ON CRW_Lib_Crew_Details.Staff_Code = CRW_Dtl_Crew_Voyages.Staff_Code ";
        sqlQueryView += "WHERE     (CRW_Dtl_Crew_Voyages.Vessel_Code = " + vesselCode + ") ";
        sqlQueryView += "ORDER BY User_name";
        return SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sqlQueryView);
    }
    catch
    {
        throw;
    }
}

public DataSet FillDDUserForOffice()
{
    try
    {
        string sqlQueryView = "select User_name,UserID from Lib_User where Active_Status=1  order by User_name";
        return SqlHelper.ExecuteDataset(_internalConnection, CommandType.Text, sqlQueryView);
    }
    catch
    {
        throw;
    }
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
    try
    {
        throw new NotImplementedException();
    }
    catch
    {
        throw;
    }
}

public string Authentication(string username, string pasw)
{
    try
    {
        SqlParameter[] sqlprm = new SqlParameter[]
        {
            new SqlParameter("@username",username),
            new SqlParameter("@PASSWORD",pasw)
        };
        return SqlHelper.ExecuteScalar(_internalConnection, CommandType.StoredProcedure, "SP_QMS_Authentication", sqlprm).ToString();
    }
    catch
    {
        throw;
    }
}

public int getUserIDbyUsername(string userName)
{
    try
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
    catch
    {
        throw;
    }
}

public DataSet getUsersDetailsByUserID(string userid)
{
    try
    {
        SqlParameter[] sqlprm = new SqlParameter[]
        {
            new SqlParameter("@userid",userid)
        };
        return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "SP_QMS_UserDetailsbyId", sqlprm);
    }
    catch
    {
        throw;
    }
}

public void UpdatePwd(int username, string CurrentPwd, string NewPwd)
{
    try
    {
        SqlParameter[] sqlprm = new SqlParameter[]
        {
            new SqlParameter("@username",username),
            new SqlParameter("@CurrentPwd",CurrentPwd),
            new SqlParameter("@NewPwd",NewPwd)
        };
        SqlHelper.ExecuteScalar(_internalConnection, CommandType.StoredProcedure, "SP_QMS_ChangePassword", sqlprm);
    }
    catch
    {
        throw;
    }
}

public void insertFileLogIntoDB(string ManualName, string FileName, string filePath, int UserID, string Remarks, int NodeType)
{
    try
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
    catch
    {
        throw;
    }
}

public int getFileCountByFileID(int FileID)
{
    try
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
    catch
    {
        throw;
    }
}

public void UpdateVersionInfoOfNewFileAdd(int fileID, string GuidFileName, int UserID, string Remarks, string IsApprovalRequired="")
{
    try
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
    catch
    {
        throw;
    }
}

public DataSet getFileVersion(int fileID)
{
    try
    {
        SqlParameter[] sqlprm = new SqlParameter[]
        {
            new SqlParameter("@FileID",SqlDbType.Int)
        };

        sqlprm[0].Value = fileID;
        return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Get_FileVersion", sqlprm);
    }
    catch
    {
        throw;
    }
}

public DataSet getCheckedFileInfo(int FileID)
{
    try
    {
        SqlParameter[] sqlprm = new SqlParameter[]
        {
            new SqlParameter("@FileID",SqlDbType.Int)
        };

        sqlprm[0].Value = FileID;
        return SqlHelper.ExecuteDataset(_internalConnection, CommandType.StoredProcedure, "QMS_SP_Get_CheckedFileInfo", sqlprm);
    }
    catch
    {
        throw;
    }
}

public int getFileIDByPath(string FilePath)
{
    try
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
    catch
    {
        throw;
    }
}

public int checkFileExits(string sFileName, string sFolderPath)
{
    try
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
    catch
    {
        throw;
    }
}

public int Get_UserAccess_OnFile(int FileID, int UserID)
{
    try
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
    catch
    {
        throw;
    }
}

public void insertRecordAtCheckout(int userID, int FileID)
{
    try
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
    catch
    {
        throw;
    }
}

public void insertRecordAtCheckIN(int FileID, string FileName, int UserID, long Size, string IsApprovalRequired, string Remarks)
{
    try
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
    catch
    {
        throw;
    }
}

public DataSet getLatestFileOperationByUserID(int FileID, int UserId)
{
    try
    {
        SqlParameter[] sqlprm = new SqlParameter[]
        {
            new SqlParameter("@FileID",SqlDbType.Int),
            new SqlParameter("@userID",SqlDbType.Int)
        };

        sqlprm[0].Value = FileID;
        sqlprm[1].Value = UserId;
        return SqlHelper.ExecuteDataset