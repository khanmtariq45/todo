 protected void btnSendToSupplier_Click(object sender, EventArgs e)
    {
        try
        {

            CultureInfo prov = CultureInfo.InvariantCulture;
            if (txtfrom.Text == "") txtfrom.Text = DateTime.Now.AddDays(2).ToString(UDFLib.GetDateFormat());
            if (DateTime.ParseExact(txtfrom.Text, UDFLib.GetDateFormat(), prov) < DateTime.ParseExact(DateTime.Now.ToString(UDFLib.GetDateFormat()), UDFLib.GetDateFormat(), prov))
            {
                String msg = String.Format("alert('Quotation due date cannot be less than current date.');");
                ScriptManager.RegisterStartupScript(Page, Page.GetType(), "msgport", msg, true);

                return;
            }
                      
            RFQheader = new List<Supplier_API__Header>();
            suppliersRfq = new List<Supplier_API_RFQ_Body>();
            //check for port name if  same supplier come more than one
            int stsport = 0;
            string Email_Type = "RFQ";
            DataSet dsRFQapi = new DataSet();
            Session["Supplier"] = null;
            bool cheboxClick = false;
            foreach (GridItem gr in grvSupplier.Items)
            {
                string supplier = gr.Cells[2].Text;
                foreach (GridItem grinner in grvSupplier.Items)
                {
                    if (grinner.Cells[2].Text == supplier && gr.RowIndex != grinner.RowIndex)
                    {
                        if (((UserControl_ctlDeliveryPortList)gr.FindControl("DDLPort")).SelectedValue == ((UserControl_ctlDeliveryPortList)grinner.FindControl("DDLPort")).SelectedValue)
                        {
                            stsport = 1;
                            String msg = String.Format("alert('Please select the different port for same supplier !');");
                            ScriptManager.RegisterStartupScript(Page, Page.GetType(), "msgport", msg, true);

                            return;
                        }
                    }
                }
                CheckBox chk1 = (CheckBox)(gr.FindControl("chkExportToExcel") as CheckBox);
                if ((chk1.Checked))
                {
                    cheboxClick = true;
                }
            }           
            Int16 isSentToSuppdt = BLL_PURC_Common.GET_Is_SentToSuppdt(Request.QueryString["Requisitioncode"].ToString());
            if (isSentToSuppdt != 0)
            {
                stsport = 1;
                String msg = String.Format("alert('Requisition already send for approval so RFQ cannot be send !');");
                ScriptManager.RegisterStartupScript(Page, Page.GetType(), "msgport", msg, true);

                return;
            }
            string strPath = Server.MapPath(".") + "\\SendRFQ\\";
            string FilePath = Server.MapPath("~") + "\\Purchase\\ExcelFile\\";
            string QuotDueDate = "";
            string sBuyerRemaks = txtRFQRemarks.Text.Trim();
            if (txtfrom.Text != "")
            {
                QuotDueDate = txtfrom.Text;
            }

            if (cheboxClick == true)
            {
                if (grvSupplier.Items.Count > 0)
                {
                    DataTable dtQuotationList = new DataTable();
                    dtQuotationList.Columns.Add("Qtncode");
                    dtQuotationList.Columns.Add("amount");

                    foreach (GridDataItem grv in grvSupplier.MasterTableView.Items)
                    {
                        DataSet dsRFQ = new DataSet();
                        DataSet dsSendMailInfo = new DataSet();
                        DataTable dtQtnSupplier = new DataTable();
                        List<string> selectedItems = new List<string>();
                        
                        System.Web.UI.WebControls.CheckBox chk = (System.Web.UI.WebControls.CheckBox)(grv.FindControl("chkExportToExcel") as System.Web.UI.WebControls.CheckBox);
                        System.Web.UI.WebControls.RadioButtonList optGRowRFQType = (System.Web.UI.WebControls.RadioButtonList)(grv.FindControl("optGRowRFQType") as System.Web.UI.WebControls.RadioButtonList);
                        System.Web.UI.WebControls.DropDownList VatValue = (System.Web.UI.WebControls.DropDownList)(grv.FindControl("ddlProperty") as System.Web.UI.WebControls.DropDownList);

                        if (chk.Checked)
                        {
                            string SuppName = grv["SUPPLIER_NAME"].Text.ToString();

                            string SuppCode = grv["SUPPLIER"].Text.ToString();

                            string RowIDSuppCode = grv["RowID"].Text.Trim() + ":" + SuppCode;

                            Dictionary<string, ArrayList> dicItemRefCode = (Dictionary<string, ArrayList>)ViewState["DicItemRefCode"];
                            StringBuilder strItemsForSupplier = new StringBuilder("");
                            if (dicItemRefCode != null)
                            {
                                if (dicItemRefCode.Keys.Contains(RowIDSuppCode))
                                {
                                    ArrayList arrItemRefCode = dicItemRefCode[RowIDSuppCode];
                                    selectedItems = arrItemRefCode.OfType<string>().ToList();
                                    foreach (string sitem in arrItemRefCode)
                                    {
                                        strItemsForSupplier.Append(" select '" + sitem + "' ");
                                    }
                                }
                            }
                            using (BLL_PURC_Purchase objTechService = new BLL_PURC_Purchase())
                            {
                                string SelectedDdlPort = ((UserControl_ctlDeliveryPortList)grv.FindControl("DDLPort")).SelectedValue.ToString();

                                if (!ExecutedFunctions.Contains(RowIDSuppCode + "InsertQuotedPriceForRFQ" + SelectedDdlPort))
                                {
                                    RetValQtnCode = objTechService.InsertQuotedPriceForRFQ(SuppCode, Request.QueryString["Requisitioncode"].ToString(), ViewState["Vessel_Code"].ToString(), Request.QueryString["Document_Code"].ToString(), Session["userid"].ToString(), QuotDueDate, sBuyerRemaks, ((UserControl_ctlDeliveryPortList)grv.FindControl("DDLPort")).SelectedValue.ToString(), ((TextBox)grv.FindControl("txtDeliveryDate")).Text.Trim(), ((TextBox)grv.FindControl("txtDeliveryInstruction")).Text, strItemsForSupplier.ToString());
                                    ExecutedFunctions.Add(RowIDSuppCode + "InsertQuotedPriceForRFQ" + SelectedDdlPort);
                                    loopCounter = 0;
                                }
                                    
                                string ServerIPAdd = ConfigurationManager.AppSettings["WebQuotSite"].ToString();
                                string RFQType = optGRowRFQType.SelectedValue.ToString();

                                if (!ExecutedFunctions.Contains(RowIDSuppCode + "InsertSupplierProperties" + SelectedDdlPort))
                                {
                                    dsRFQ = objTechService.InsertSupplierProperties(SuppCode, Request.QueryString["Requisitioncode"].ToString(), ViewState["Vessel_Code"].ToString(), Request.QueryString["Document_Code"].ToString(), ((DropDownList)grv.FindControl("ddlProperty")).SelectedValue.ToString(), RetValQtnCode, GetSessionUserID(), RFQType);
                                    ExecutedFunctions.Add(RowIDSuppCode + "InsertSupplierProperties" + SelectedDdlPort);
                                    loopCounter = 0;
                                }
                                 
                                dsRFQ = objTechService.GetDataToGenerateRFQ(SuppCode, Request.QueryString["Requisitioncode"].ToString(), ViewState["Vessel_Code"].ToString(), Request.QueryString["Document_Code"].ToString(), RetValQtnCode);
                                
                                if ((dsRFQ.Tables[1].Rows != null && dsRFQ.Tables[1].Rows.Count > 0) && (selectedItems!=null && selectedItems.Count > 0))
                                {
                                    var filteredDataRows = dsRFQ.Tables[1].AsEnumerable().Where(row => selectedItems.Contains(row.Field<string>("item_ref_code"))).CopyToDataTable();
                                    if (filteredDataRows.Rows != null  && filteredDataRows.Rows.Count > 0)
                                    {
                                        dsRFQ.Tables[1].Rows.Clear();
                                        dsRFQ.Tables[1].Merge(filteredDataRows);
                                    }                          
                                }    
                                
                                //check the supplier details in lib_user and insert if not exists
                                dtQtnSupplier = objTechService.GetSupplierUserDetails(SuppCode, "S");

                                int value = Int32.Parse(RFQType);
                                if (dsRFQ.Tables[0].Rows.Count > 0)
                                {
                                    switch (value)
                                    {
                                        // Excel Based RFQ
                                        case 1:
                                            //Added  IsExcel = 1 to get the address,email,phone and fax in encrypted format.
                                            //in the following method added IsExcel  because from method email we get in encrypted form and from one method we get email,adress,phone in encrypted form

                                            int IsExcel = 1;
                                            PO_RFQ_Generate.ExceldataImport objExcelRFQ = new PO_RFQ_Generate.ExceldataImport();
                                            FileName = "RFQ_" + ViewState["Vessel_Code"].ToString() + "_" + ReplaceSpecialCharacterinFileName(Request.QueryString["Requisitioncode"].ToString()) + "_" + SuppCode + "_" + ReplaceSpecialCharacterinFileName(SuppName) + DateTime.Now.ToString("yyMMdd") + ((UserControl_ctlDeliveryPortList)grv.FindControl("DDLPort")).SelectedText.ToString() + ".xlsx";
                                            FileName = UDFLib.Remove_Special_Characters(FileName);
                                            if (dsRFQ!=null && dsRFQ.Tables[4].Rows.Count > 0)
                                            {
                                                Encrypted_DecryptedASL_Fields DecryptedFields = new Encrypted_DecryptedASL_Fields();
                                                int IsEncryptDecrypt = (int)BLL_ASL_Supplier_Encryption.IsEncryptDecrypt.IsDecrypt;
                                                DecryptedFields = GetSupplierFieldstoEncrypt(IsEncryptDecrypt, dsRFQ.Tables[4].Rows[0], IsExcel);

                                                dsRFQ.Tables[4].Rows[0]["MakerAddress"] = DecryptedFields.Address;
                                                dsRFQ.Tables[4].Rows[0]["MakerPhone"] = DecryptedFields.Phone;
                                                dsRFQ.Tables[4].Rows[0]["MakerEmail"] = DecryptedFields.Email;
                                                dsRFQ.Tables[4].Rows[0]["MakerFax"] = DecryptedFields.Fax;

                                            }
                                            if (Request.QueryString["Requisitioncode"] != null && Request.QueryString["Requisitioncode"].ToString() != "" && dsRFQ.Tables[0].Columns.Contains("REQUISITION_CODE") && dsRFQ.Tables[0].Rows[0]["REQUISITION_CODE"] != DBNull.Value && Request.QueryString["Requisitioncode"].ToString() == dsRFQ.Tables[0].Rows[0]["REQUISITION_CODE"].ToString())
                                            {
                                                string token = Session["token"].ToString();
                                                objExcelRFQ.GenerateExcelFile_Infra(dsRFQ, Request.QueryString["Requisitioncode"].ToString(), FileName, token);                                                
                                            }
                                            if (File.Exists(Server.MapPath(".") + "\\SendRFQ\\" + FileName))
                                            {
                                                objTechService.SaveAttachedFileInfo(ViewState["Vessel_Code"].ToString(), Request.QueryString["Requisitioncode"].ToString(), SuppCode, ".xlsx", FileName.Replace(".xlsx", ""), "SendRFQ/" + FileName, Session["userid"].ToString(), UDFLib.ConvertToInteger(((UserControl_ctlDeliveryPortList)grv.FindControl("DDLPort")).SelectedValue.ToString()),null);
                                            }
                                            break;
                                    }
                                }
                            }
                        }
                    }

                    // loop to send Emails to  supplier
                   int i = 0;

                    foreach (GridDataItem grv in grvSupplier.MasterTableView.Items)
                    {
                        DataSet dsRFQ = new DataSet();
                        DataSet dsSendMailInfo = new DataSet();
                        DataTable dtQtnSupplier = new DataTable();
                        System.Web.UI.WebControls.CheckBox chk = (System.Web.UI.WebControls.CheckBox)(grv.FindControl("chkExportToExcel") as System.Web.UI.WebControls.CheckBox);
                        System.Web.UI.WebControls.RadioButtonList optGRowRFQType = (System.Web.UI.WebControls.RadioButtonList)(grv.FindControl("optGRowRFQType") as System.Web.UI.WebControls.RadioButtonList);
                        System.Web.UI.WebControls.DropDownList VatValue = (System.Web.UI.WebControls.DropDownList)(grv.FindControl("ddlProperty") as System.Web.UI.WebControls.DropDownList);

                        if (chk.Checked)
                        {
                            string SuppName = grv["SUPPLIER_NAME"].Text.ToString();

                            string SuppCode = grv["SUPPLIER"].Text.ToString();

                            string RowIDSuppCode = grv["RowID"].Text.Trim() + ":" + SuppCode;

                            i++;
                            using (BLL_PURC_Purchase objTechService = new BLL_PURC_Purchase())
                            {
                                string ServerIPAdd = ConfigurationManager.AppSettings["WebQuotSite"].ToString();
                                string RFQType = optGRowRFQType.SelectedValue.ToString();
                                string Vat = VatValue.SelectedValue.ToString();
                                RetValQtnCode = objTechService.GetQuotationCodeBySupplier(SuppCode,Request.QueryString["Requisitioncode"].ToString(), ((UserControl_ctlDeliveryPortList)grv.FindControl("DDLPort")).SelectedValue.ToString());
                                dsRFQ = objTechService.GetDataToGenerateRFQ(SuppCode, Request.QueryString["Requisitioncode"].ToString(), ViewState["Vessel_Code"].ToString(), Request.QueryString["Document_Code"].ToString(), RetValQtnCode);
                                ////check the supplier details in lib_user and insert if not exists
                                dsSendMailInfo = objTechService.GetRFQsuppInfoSendEmail(SuppCode, RetValQtnCode, ViewState["Vessel_Code"].ToString(), Request.QueryString["Document_Code"].ToString(), Session["userid"].ToString(), Email_Type);

                                int value = Int32.Parse(RFQType);
                                string SelectedDdlPort = ((UserControl_ctlDeliveryPortList)grv.FindControl("DDLPort")).SelectedValue.ToString();
                                if (!ExecutedFunctions.Contains(RowIDSuppCode + "SendEmail" + SelectedDdlPort) && dsRFQ.Tables[0].Rows.Count > 0 && dsSendMailInfo.Tables[0].Rows.Count > 0)
                                {
                                    switch (value)
                                    {
                                        // Excel Based RFQ
                                        case 1:
                                            FileName = "RFQ_" + ViewState["Vessel_Code"].ToString() + "_" + ReplaceSpecialCharacterinFileName(Request.QueryString["Requisitioncode"].ToString()) + "_" + SuppCode + "_" + ReplaceSpecialCharacterinFileName(SuppName) + DateTime.Now.ToString("yyMMdd") + ((UserControl_ctlDeliveryPortList)grv.FindControl("DDLPort")).SelectedText.ToString() + ".xlsx";
                                            FileName = UDFLib.Remove_Special_Characters(FileName);
                                            if (File.Exists(Server.MapPath(".") + "\\SendRFQ\\" + FileName))
                                            {
                                                SendEmailToSupplier(dsSendMailInfo, SuppCode, ServerIPAdd, FileName, true, RFQType, true);
                                            }
                                            break;
                                        // Web Based RFQ
                                        case 2:
                                            //No Excel File will be generated because it's Web based RFQ as per satvinder sir..
                                            SendEmailToSupplier(dsSendMailInfo, SuppCode, ServerIPAdd, "", true, RFQType, true);
                                            break;
                                        // API Supplier
                                        case 3:
                                            Select_Supplier_API(dsRFQ, SuppCode, Vat);
                                            SendEmailToSupplier(dsSendMailInfo, SuppCode, ServerIPAdd, "", true, RFQType, true);
                                            break;

                                    }
                                    ExecutedFunctions.Add(RowIDSuppCode + "SendEmail" + SelectedDdlPort);
                                    loopCounter = 0;
                                }
                                else
                                {
                                    if (dsRFQ.Tables[0].Rows.Count == 0)
                                      throw new Exception("No items Record found (GetDataToGenerateRFQ) for :" + SuppName + "(" + SuppCode + ") - Req_no : " + Request.QueryString["Requisitioncode"].ToString() + " - Vessel : " + ViewState["Vessel_Code"].ToString() + " - Doc_code : " + Request.QueryString["Document_Code"].ToString() + "- Quot_code : " + RetValQtnCode + "");
                                    else if (dsSendMailInfo.Tables[0].Rows.Count == 0)
                                      throw new Exception("No items Record found (GetRFQsuppInfoSendEmail) for :" + SuppName + "(" + SuppCode + ") - Quot_code : " + RetValQtnCode + " - Vessel : " + ViewState["Vessel_Code"].ToString() + " - Doc_code : " + Request.QueryString["Document_Code"].ToString() + "- User_Id : " + Session["userid"].ToString() + "- Email_type : " + Email_Type + "");
                                    else
                                      throw new Exception("No items Record found for :" + SuppName+"("+ SuppCode + ")");
                                }
                            }
                        }
                    }

                    if (suppliersRfq.Count > 0 && RFQheader.Count > 0)
                    {
                        SendRFQtoJCDS(suppliersRfq, RFQheader);
                    }
                   
                    if (RetValQtnCode.Length > 1)
                    {
                        BLL_PURC_Purchase objTechService = new BLL_PURC_Purchase();
                        objTechService.InsertRequisitionStageStatus(Request.QueryString["Requisitioncode"].ToString(), ViewState["Vessel_Code"].ToString(), Request.QueryString["Document_Code"].ToString(), "RFQ", " ", Convert.ToInt32(Session["USERID"]), dtQuotationList);
                    }
                    grvSupplier.Columns[1].Visible = false;
                    LinkFileLoc.Text = strPath.ToString();
                    String msg = String.Format("window.close();");
                    ScriptManager.RegisterStartupScript(Page, Page.GetType(), "msg", msg, true);
                }
                else
                {
                    lblErrorMsg.Text = "There is no data for supplier.";
                }
            }
            else
            {
                String msg = String.Format("alert('Please select atleast one supplier to send Quotation.');");
                ScriptManager.RegisterStartupScript(Page, Page.GetType(), "msg", msg, true);
                lblErrorMsg.Text = "Please select atleast one supplier to send Quotation.";
            }
        }

        catch (Exception ex)
        {
            if ((ex.Message.Contains("Kill") || ex.Message.Contains("Deadlock")) && loopCounter < 3)
            {
                loopCounter++;
                btnSendToSupplier_Click(sender, e);
            }
            using (BLL_PURC_Purchase objTechService = new BLL_PURC_Purchase())
            {
                objTechService.InsertSupplierProperties(null, Request.QueryString["Requisitioncode"].ToString(), ViewState["Vessel_Code"].ToString(),
                Request.QueryString["Document_Code"].ToString(),
                null, RetValQtnCode, GetSessionUserID(), null, 1);
            }
            UDFLib.WriteExceptionLog(ex);
            String msg = String.Format("alert('" + ex.Message + ex.Source + ex.StackTrace + "');");
            ScriptManager.RegisterStartupScript(Page, Page.GetType(), "msg", msg, true);
        }
        finally
        {
            ExecutedFunctions.Clear();

        }
    }
