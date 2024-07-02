protected void btnSendToSupplier_Click(object sender, EventArgs e)
{
    try
    {
        CultureInfo prov = CultureInfo.InvariantCulture;
        string dateFormat = UDFLib.GetDateFormat();
        DateTime now = DateTime.Now;
        DateTime fromDate;

        if (string.IsNullOrWhiteSpace(txtfrom.Text))
            txtfrom.Text = now.AddDays(2).ToString(dateFormat);

        fromDate = DateTime.ParseExact(txtfrom.Text, dateFormat, prov);
        
        if (fromDate < now.Date)
        {
            ShowAlert("Quotation due date cannot be less than the current date.");
            return;
        }

        HashSet<string> suppliers = new HashSet<string>();
        bool checkboxClicked = false;
        foreach (GridItem gr in grvSupplier.Items)
        {
            string supplier = gr.Cells[2].Text;
            string port = ((UserControl_ctlDeliveryPortList)gr.FindControl("DDLPort")).SelectedValue;

            if (suppliers.Contains($"{supplier}:{port}"))
            {
                ShowAlert("Please select a different port for the same supplier!");
                return;
            }

            suppliers.Add($"{supplier}:{port}");

            CheckBox chk = (CheckBox)gr.FindControl("chkExportToExcel");
            if (chk.Checked)
                checkboxClicked = true;
        }

        if (checkboxClicked)
        {
            int isSentToSuppdt = BLL_PURC_Common.GET_Is_SentToSuppdt(Request.QueryString["Requisitioncode"]);
            if (isSentToSuppdt != 0)
            {
                ShowAlert("Requisition already sent for approval, so RFQ cannot be sent!");
                return;
            }

            string strPath = Server.MapPath(".") + "\\SendRFQ\\";
            string FilePath = Server.MapPath("~") + "\\Purchase\\ExcelFile\\";
            string QuotDueDate = fromDate.ToString(dateFormat);
            string sBuyerRemarks = txtRFQRemarks.Text.Trim();

            DataTable dtQuotationList = CreateQuotationDataTable();
            List<Supplier_API__Header> RFQheader = new List<Supplier_API__Header>();
            List<Supplier_API_RFQ_Body> suppliersRfq = new List<Supplier_API_RFQ_Body>();

            foreach (GridDataItem grv in grvSupplier.MasterTableView.Items)
            {
                CheckBox chk = (CheckBox)grv.FindControl("chkExportToExcel");
                if (chk.Checked)
                {
                    ProcessRFQForSupplier(grv, QuotDueDate, sBuyerRemarks, RFQheader, suppliersRfq, dtQuotationList);
                }
            }

            SendEmailsToSuppliers();

            if (suppliersRfq.Count > 0 && RFQheader.Count > 0)
                SendRFQtoJCDS(suppliersRfq, RFQheader);

            if (RetValQtnCode.Length > 1)
            {
                BLL_PURC_Purchase objTechService = new BLL_PURC_Purchase();
                objTechService.InsertRequisitionStageStatus(Request.QueryString["Requisitioncode"], ViewState["Vessel_Code"].ToString(), Request.QueryString["Document_Code"], "RFQ", " ", Convert.ToInt32(Session["USERID"]), dtQuotationList);
            }

            grvSupplier.Columns[1].Visible = false;
            LinkFileLoc.Text = strPath.ToString();
            ShowAlert("window.close();");
        }
        else
        {
            ShowAlert("Please select at least one supplier to send Quotation.");
            lblErrorMsg.Text = "Please select at least one supplier to send Quotation.";
        }
    }
    catch (Exception ex)
    {
        HandleException(ex);
    }
    finally
    {
        ExecutedFunctions.Clear();
    }
}

private void ShowAlert(string message)
{
    string script = $"alert('{message}');";
    ScriptManager.RegisterStartupScript(Page, Page.GetType(), "msgport", script, true);
}

private DataTable CreateQuotationDataTable()
{
    DataTable dt = new DataTable();
    dt.Columns.Add("Qtncode");
    dt.Columns.Add("amount");
    return dt;
}

private void ProcessRFQForSupplier(GridDataItem grv, string QuotDueDate, string sBuyerRemarks, List<Supplier_API__Header> RFQheader, List<Supplier_API_RFQ_Body> suppliersRfq, DataTable dtQuotationList)
{
    // Method implementation to process RFQ for a supplier
}

private void SendEmailsToSuppliers()
{
    // Method implementation to send emails to suppliers
}

private void HandleException(Exception ex)
{
    if ((ex.Message.Contains("Kill") || ex.Message.Contains("Deadlock")) && loopCounter < 3)
    {
        loopCounter++;
        btnSendToSupplier_Click(sender, e);
    }
    else
    {
        using (BLL_PURC_Purchase objTechService = new BLL_PURC_Purchase())
        {
            objTechService.InsertSupplierProperties(null, Request.QueryString["Requisitioncode"].ToString(), ViewState["Vessel_Code"].ToString(),
            Request.QueryString["Document_Code"].ToString(),
            null, RetValQtnCode, GetSessionUserID(), null, 1);
        }
        UDFLib.WriteExceptionLog(ex);
        ShowAlert($"{ex.Message} {ex.Source} {ex.StackTrace}");
    }
}