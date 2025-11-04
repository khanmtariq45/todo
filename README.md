make this function as async

private void Set_HeaderIconsVisibility()

using System;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Web.Security;
using SMS.Business.Infrastructure;
using SMS.Properties;
using System.Configuration;
using System.Web.UI.HtmlControls;
using System.Data;

public partial class SiteMaster : System.Web.UI.MasterPage
{
    UserAccess objUA = new UserAccess();

    BLL_Infra_UserCredentials objUser = new BLL_Infra_UserCredentials();
    BLL_Infra_MenuManagement objDAL = new BLL_Infra_MenuManagement();
    BLL_Infra_Common objCommonBLL = new BLL_Infra_Common();

    public const string alertNotificationKeyConfigKey = "alert-notification-api-interval-seconds";
    public const string subscriptionPaymentConfigKey = "subscription_payment_overdue";

    #region props
    public int SubscriptionPaymentOverDueKeyValue
    {
        get
        {
            if (!string.IsNullOrEmpty(hfSubscriptionPaymentOverDueKeyValue.Value))
            {
                return int.Parse(hfSubscriptionPaymentOverDueKeyValue.Value);
            }
            return 0;
        }
        set { hfSubscriptionPaymentOverDueKeyValue.Value = value.ToString(); }
    }
    public int AlertNotificationApiIntervalSecondsKeyValue
    {
        get
        {
            if (!string.IsNullOrEmpty(hfAlertNotificationApiIntervalSecondsKeyValue.Value))
            {
                return int.Parse(hfAlertNotificationApiIntervalSecondsKeyValue.Value);
            }

            return 60;
        }
        set { hfAlertNotificationApiIntervalSecondsKeyValue.Value = value.ToString(); }
    }

    public int SlfUserData
    {
        get
        {
            if (!string.IsNullOrEmpty(hfSlfUserData.Value))
            {
                return int.Parse(hfSlfUserData.Value);
            }
            return 0;
        }
        set { hfSlfUserData.Value = value.ToString(); }
    }

    public int CompanyCount
    {
        get
        {
            if (!string.IsNullOrEmpty(hfCompanyCount.Value))
            {
                return int.Parse(hfCompanyCount.Value);
            }
            return 0;
        }
        set { hfCompanyCount.Value = value.ToString(); }
    }

    public string j3MasterApiUrl
    {
        get { return hfj3MasterApiUrl.Value; }
        set { hfj3MasterApiUrl.Value = value; }
    }
    #endregion
    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            Page.Header.DataBind(); //Used to resolve the javascript file references in master page <Head>.
            Image img = new Image();

            if (!IsPostBack)
            {
                imgReportIssue.ImageUrl = "/" + System.Configuration.ConfigurationManager.AppSettings["APP_NAME"].ToString() + "/images/close.png";
                ImageButton1.ImageUrl = "/" + System.Configuration.ConfigurationManager.AppSettings["APP_NAME"].ToString() + "/images/Cancel.png";

                j3MasterApiUrl = objCommonBLL.GetNodeApiURL("MASTER");

                if (Session["User_Uid"] != null)
                {
                    ReadAndSetConfigurationKeys();

                    Set_HeaderIconsVisibility();
                }

                if (Session["CompanyCount"] != null)
                {
                    CompanyCount = Convert.ToInt16(Session["CompanyCount"].ToString());
                }
            }


            // Function to load logo during login page and  after successfull login of user.
            LoginView loginview1 = (LoginView)(Page.Master as SiteMaster).FindControl("HeadLoginView");

            if (loginview1 != null)
            {
                img = (Image)loginview1.FindControl("Image2");
                if (Session["File_Path"] != null)
                {
                    if (Session["File_Path"].ToString() != "")
                    {
                        img.ImageUrl = @"~//Images/" + Session["File_Path"].ToString();
                    }
                    else
                    {
                        if (img != null)
                        {
                            img.Visible = false;
                        }
                    }
                }
                else if (CompanyCount > 1)
                {
                    imglogo1.Visible = false;
                }
                else
                {
                    imglogo1.ImageUrl = "~/Images/company_logo.jpg";
                }
            }
            //Hide/Show menu and logo on the basis the of J1Token session variable, which will be set when J2 requests pages which belongs to J1.        
            divHeader.Visible = true;
            divBreadcrumb.Visible = true;
            //for walkme
            hdfUserDetailsForWalkme.Value = Convert.ToString(Session["UserDetailsForWalkme"]);
            string APP_NAME = ConfigurationManager.AppSettings["APP_NAME"].ToString();
            DynamicLink.Href = "/" + APP_NAME + "/Styles/" + Convert.ToString(Session["USERSTYLE"]);
            string JsModalpopup = "/" + APP_NAME + "/Scripts/ReportIssuePopup.js";
            Literal scriptModalpopup = new Literal();
            scriptModalpopup.Text = string.Format(@"<script src=""{0}"" type=""text/javascript""></script>", JsModalpopup);
            Page.Header.Controls.Add(scriptModalpopup);
            var scriptManager = ScriptManager.GetCurrent(Page);
            if (scriptManager == null) return;
            scriptManager.Scripts.Add(new ScriptReference { Path = "~/Scripts/html2canvas.js" });
            var scriptManager1 = ScriptManager.GetCurrent(Page);
            if (scriptManager1 == null) return;
            scriptManager1.Scripts.Add(new ScriptReference { Path = "~/Scripts/HelpFile.js" });
            //for walkme
            string walkmescript = string.Format("GetValueForWalkMe();");
            ScriptManager.RegisterStartupScript(Page, Page.GetType(), "walkmescript", walkmescript, true);
            hdfuserDefaultTheme.Value = Convert.ToString(Session["USERSTYLE"]);
            UserAccessValidation();
            AssignSPMModuleID();
            //Added a check for Supplier and Travel Agent to hide the Change password link in header.
            HyperLink link = HeadLoginView.FindControl("HyperLink1") as HyperLink;
            if (HeadLoginView.FindControl("HyperLink1") != null && Session["UTYPE"] != null)
            {
                if (Session["UTYPE"].ToString().Trim().ToUpper() == "SUPPLIER".ToUpper())
                    link.Visible = false;
                else if (Session["UTYPE"].ToString().Trim().ToUpper() == "TRAVEL AGENT".ToUpper())
                    link.Visible = false;
                else
                    link.Visible = true;
            }
            if (Session["USERID"] != null)      //Make JiBe logo to be a link to the main dashboard
            {
                hlinkDashboard.NavigateUrl = UDFLib.GetDefaultHomePage();
                if (HeadLoginView.FindControl("imgDownArrow") != null)
                {
                    Label lbl = HeadLoginView.FindControl("imgDownArrow") as Label;
                    lbl.Visible = true;
                }
            }
            if (Session["User_DateFormat"] != null)
            {
                hdnDateFromatMasterPage.Value = Session["User_DateFormat"].ToString();
            }
        }
        catch (Exception ex)
        {
            UDFLib.WriteExceptionLog(ex);
        }
    }

    private int GetSessionUserID()
    {
        if (Session["USERID"] != null)
            return int.Parse(Session["USERID"].ToString());
        else
            return 0;
    }

    private void Set_HeaderIconsVisibility()
    {
        Image1.Visible = true;
        imglogo1.Visible = true;
        LoginView1.Visible = true;

        HtmlControl divSlf = (HtmlControl)HeadLoginView.FindControl("dvslficon");
        HtmlControl divCalender = (HtmlControl)HeadLoginView.FindControl("dvcalender");
        HtmlControl divNotification = (HtmlControl)HeadLoginView.FindControl("dvnotification");
        HtmlControl divCopilot = (HtmlControl)HeadLoginView.FindControl("dvcopilot");

        bool showSlfIcon = false, showCalendarIcon = false, showNotificationsIcon = false, showCopilotIcon = false;
        INFRA_Enum.settingType slfOption;

        DataTable dt = objDAL.Get_HeaderIconsVisibility();

        foreach (DataRow dtRow in dt.Rows)
        {
            slfOption = (INFRA_Enum.settingType)Enum.Parse(typeof(INFRA_Enum.settingType), dtRow[0].ToString(), true);

            switch (slfOption)
            {
                case INFRA_Enum.settingType.slf_icon_visibility:
                    showSlfIcon = dtRow[1].ToString() == "1";
                    break;
                case INFRA_Enum.settingType.cal_icon_visibility:
                    showCalendarIcon = dtRow[1].ToString() == "1";
                    break;
                case INFRA_Enum.settingType.notification_icon_visibility:
                    showNotificationsIcon = dtRow[1].ToString() == "1";

                    if (!showNotificationsIcon)
                    {
                        AlertNotificationApiIntervalSecondsKeyValue = -1;
                    }
                    break;

                case INFRA_Enum.settingType.copilot_icon_visibility:
                    int userId = GetSessionUserID();
                    bool hasCopliotAccess = objUser.Has_UserAccessRight("copilot", "copilot_icon_sub", "view", Convert.ToString(Session["token"]));
                    showCopilotIcon = dtRow[1].ToString() == "1" && hasCopliotAccess;
                    break;
                default:
                    break;
            }
        }

        divSlf.Visible = showSlfIcon;
        divCalender.Visible = showCalendarIcon;
        divNotification.Visible = showNotificationsIcon;
        divCopilot.Visible = showCopilotIcon;

        Set_SLF(divSlf);
    }

    private void Set_SLF(HtmlControl divSlf)
    {
        DataTable dtSLFFilterData = objDAL.slfFilterData(Convert.ToString(Session["User_Uid"]));
        if (dtSLFFilterData != null && dtSLFFilterData.Rows.Count > 0)
        {
            SlfUserData = Convert.ToInt32((dtSLFFilterData.Rows[0]).ItemArray[0]);

            HtmlControl cancel = (HtmlControl)HeadLoginView.FindControl("cross");
            if (SlfUserData != 0)
            {
                divSlf.Style.Add("background-color", "#FFACB5");
                divSlf.Style.Add("border-radius", "50%");
                cancel.Style.Add("visibility", "visible");
            }
            else
            {
                divSlf.Style.Add("background-color", "none");
                cancel.Style.Add("visibility", "hidden");
                ScriptManager.RegisterStartupScript(Page, Page.GetType(), "text", "disableCross();", true);
            }
        }
    }

    private void ReadAndSetConfigurationKeys()
    {
        DataTable dtAlertNotificationConfig = UDFLib.get_key_value_config(alertNotificationKeyConfigKey);
        DataTable dtsubscriptionPaymentConfig = UDFLib.get_key_value_config(subscriptionPaymentConfigKey);

        AlertNotificationApiIntervalSecondsKeyValue = dtAlertNotificationConfig != null && dtAlertNotificationConfig.Rows.Count > 0 ?
            int.Parse(dtAlertNotificationConfig.Rows[0][1].ToString()) : 60;
        SubscriptionPaymentOverDueKeyValue = dtsubscriptionPaymentConfig != null && dtsubscriptionPaymentConfig.Rows.Count > 0 ?
            int.Parse(dtsubscriptionPaymentConfig.Rows[0][1].ToString()) : 0;
    }
    protected void UserAccessValidation()
    {
        try
        {
            int CurrentUserID = GetSessionUserID();
            if (CurrentUserID > 0)
            {
                //string PageURL = UDFLib.GetPageURL(Request.Path.ToUpper());
                string PageURL = "";
                if (HttpContext.Current.Request.Url.ToString().Contains("menuid"))
                {
                    PageURL = UDFLib.GetPageURL(Request.Url.PathAndQuery.ToString().ToUpper());

                }
                else
                {
                    PageURL = PageURL = UDFLib.GetPageURL(Request.Path.ToUpper());

                }


                objUA = objUser.Get_UserAccessForPage(CurrentUserID, PageURL);
                if (objUA.View == 0 && objUA.Menu_Code > 0)
                    Response.Redirect("~/default.aspx?msgid=1");
            }
        }
        catch (Exception ex)
        {
            UDFLib.WriteExceptionLog(ex);
        }
    }

    protected void AssignSPMModuleID()
    {
        try
        {

            // Get the Absolute path of the url
            System.IO.FileInfo oInfo = new System.IO.FileInfo(System.Web.HttpContext.Current.Request.Url.AbsolutePath);
            //if (uc_Report_Issue!=null)
            //{
            //    // Get the Page Name
            //    SqlDataReader dr = BLL_Infra_Common.Get_SPM_Module_ID(oInfo.Name);
            //    uc_Report_Issue.ModuleID = "13";
            //    if (dr.HasRows)
            //    {
            //        dr.Read();
            //        string ModuleID = dr["SPM_Module_ID"].ToString();
            //        //Assign the module ID into the Feeb back button.
            //        /* if there is ModuleID is Empty it means there is no  value of  SPM_Module_ID  coloumn in Lib_Menu table
            //            In this case Feedback would be record under 'COMMON' module ID = 13  under SPM bug traker. 
            //         */
            //        if (ModuleID != "")
            //            uc_Report_Issue.ModuleID = ModuleID;
            //        else
            //            uc_Report_Issue.ModuleID = "13";
            //    }
            //}
        }
        catch (Exception ex)
        {
            UDFLib.WriteExceptionLog(ex);
        }

    }

    protected void LogoutMe(object sender, EventArgs e)
    {
        try
        {
            if (Session["USERID"] != null)
            {
                BLL_Infra_UserCredentials objBLL = new BLL_Infra_UserCredentials();
                try
                {
                    objBLL.End_Session(int.Parse(Session["USERID"].ToString()));
                }
                catch { }
                finally { objBLL = null; }
            }
            FormsAuthentication.SignOut();
            Session.RemoveAll();
            Session.Abandon();
        }
        catch (Exception ex)
        {
            UDFLib.WriteExceptionLog(ex);
        }
    }

    protected void ScriptManager1_AsyncPostBackError(object sender, AsyncPostBackErrorEventArgs e)
    {
        try
        {
            string js = "alert('" + e.Exception.Message + "');";
            ScriptManager.RegisterStartupScript(this, this.GetType(), "masterpageexpmsg", js, true);
        }
        catch (Exception ex)
        {
            UDFLib.WriteExceptionLog(ex);
        }
    }
    protected void filterClear_Click(object sender, EventArgs e)
    {
        try
        {
            objCommonBLL.Clear_Slf_filter(Session["token"].ToString(), "Infra");
            Response.Redirect(Request.RawUrl);
        }
        catch (Exception ex)
        {
            throw ex;
        }
    }
}
public class Filter
{
    public Boolean clearFilters { get; set; }
}
