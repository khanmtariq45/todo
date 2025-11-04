protected void Page_Load(object sender, EventArgs e)
{
    RegisterAsyncTask(new PageAsyncTask(LoadDataAsync));
}

private async Task LoadDataAsync()
{
    try
    {
        Page.Header.DataBind();
        Image img = new Image();

        if (!IsPostBack)
        {
            imgReportIssue.ImageUrl = "/" + System.Configuration.ConfigurationManager.AppSettings["APP_NAME"].ToString() + "/images/close.png";
            ImageButton1.ImageUrl = "/" + System.Configuration.ConfigurationManager.AppSettings["APP_NAME"].ToString() + "/images/Cancel.png";

            j3MasterApiUrl = objCommonBLL.GetNodeApiURL("MASTER");

            if (Session["User_Uid"] != null)
            {
                ReadAndSetConfigurationKeys();
                await Set_HeaderIconsVisibility();
            }

            if (Session["CompanyCount"] != null)
            {
                CompanyCount = Convert.ToInt16(Session["CompanyCount"].ToString());
            }
        }

        // ... rest of your existing Page_Load code remains the same ...
    }
    catch (Exception ex)
    {
        UDFLib.WriteExceptionLog(ex);
    }
}