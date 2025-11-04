private async Task Set_HeaderIconsVisibility()
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

    DataTable dt = await Task.Run(() => objDAL.Get_HeaderIconsVisibility());

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
                bool hasCopliotAccess = await objUser.Has_UserAccessRight("copilot", "copilot_icon_sub", "view", Convert.ToString(Session["token"]));
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

    await Set_SLF(divSlf);
}

private async Task Set_SLF(HtmlControl divSlf)
{
    DataTable dtSLFFilterData = await Task.Run(() => objDAL.slfFilterData(Convert.ToString(Session["User_Uid"])));
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