<asp:Panel ID="colHealthIncidenceFieldConfigView" runat="server" Visible="false">
    <table cellspacing="0" cellpadding="5" style="width:50%; float:left; min-width:400px; max-width:600px;">
        <tr>
            <td colspan="3" class="page-heading">
                <asp:LinkButton ID="lnkEditFieldConfig" runat="server" ToolTip="Edit" OnClick="lnkEditFieldConfig_Click" style="float:right;">
                    <i class="icons8-pencil" style="font-size:22px"></i>
                </asp:LinkButton>
            </td>
        </tr>
        <tr>
            <td colspan="3">
                <asp:GridView ID="GridViewFieldConfigView" runat="server" AutoGenerateColumns="false" CssClass="TFtable" 
                    style="width:100%; overflow:hidden;" BorderWidth="0px" GridLines="None">
                    <Columns>
                        <asp:TemplateField HeaderText="Field" HeaderStyle-HorizontalAlign="Left">
                            <ItemTemplate>
                                <asp:Label ID="lblFieldName" runat="server" Text='<%# Eval("Field") %>'/>
                            </ItemTemplate>
                            <ItemStyle HorizontalAlign="Left" Width="30%" Wrap="true"/>
                        </asp:TemplateField>
                        <asp:TemplateField HeaderText="Available" HeaderStyle-HorizontalAlign="Left">
                            <ItemTemplate>
                                <asp:Label ID="lblAvailable" runat="server" Text='<%# Eval("Available") %>'/>
                            </ItemTemplate>
                            <ItemStyle HorizontalAlign="Left" Width="20%" Wrap="true" />
                        </asp:TemplateField>
                        <asp:TemplateField HeaderText="Mandatory For" HeaderStyle-HorizontalAlign="Left">
                            <ItemTemplate>
                                <asp:Label ID="lblMandatoryFor" runat="server" Text='<%# Eval("Mandatory For") %>'/>
                            </ItemTemplate>
                            <ItemStyle HorizontalAlign="Left" Width="50%" Wrap="true" />
                        </asp:TemplateField>
                    </Columns>
                </asp:GridView>
            </td>
        </tr>
    </table>
</asp:Panel>

<asp:UpdatePanel ID="upnlHealthIncidenceFieldConfigEdit" runat="server" UpdateMode="Conditional" Visible="false">
    <ContentTemplate>
        <asp:Panel ID="colHealthIncidenceFieldConfigEdit" runat="server" Visible="false">
            <table cellspacing="0" cellpadding="5" style="width:50%; float:left; min-width:400px; max-width:600px;">
                <tr>
                    <td colspan="3">
                        <asp:GridView ID="GridViewFieldConfig" runat="server" AutoGenerateColumns="false" CssClass="TFtable" 
                            style="width:100%; overflow:hidden;" BorderWidth="0px" GridLines="None" OnRowDataBound="GridViewFieldConfig_RowDataBound">
                            <Columns>
                                <asp:TemplateField HeaderText="Field" HeaderStyle-HorizontalAlign="Left">
                                    <ItemTemplate>
                                        <asp:Label ID="lblFieldName" runat="server" Text='<%# Eval("Field") %>'/>
                                        <asp:HiddenField ID="hfFieldID" runat="server" Value='<%# Eval("ID") %>' />
                                    </ItemTemplate>
                                    <ItemStyle HorizontalAlign="Left" Width="30%" Wrap="true"/>
                                </asp:TemplateField>
                                <asp:TemplateField HeaderText="Available" HeaderStyle-HorizontalAlign="Left">
                                    <ItemTemplate>
                                        <asp:DropDownList ID="ddlAvailable" runat="server" CssClass="form-control" AutoPostBack="true" OnSelectedIndexChanged="ddlAvailable_SelectedIndexChanged">
                                            <asp:ListItem Text="Yes" Value="1" />
                                            <asp:ListItem Text="No" Value="0" />
                                        </asp:DropDownList>
                                    </ItemTemplate>
                                    <ItemStyle HorizontalAlign="Left" Width="20%" Wrap="true" />
                                </asp:TemplateField>
                                <asp:TemplateField HeaderText="Mandatory For" HeaderStyle-HorizontalAlign="Left">
                                    <ItemTemplate>
                                        <asp:UpdatePanel runat="server" UpdateMode="Conditional" style="width:80px">
                                            <ContentTemplate>
                                                <asp:Label ID="lblMandatoryForFieldsValue" runat="server" Text=""></asp:Label>
                                                <CustomFilter:ucfDropdown ID="ddlMultiMandatoryForFields" runat="server" UseInHeader="False" Height="100" Width="200" />
                                            </ContentTemplate>
                                        </asp:UpdatePanel>
                                    </ItemTemplate>
                                    <ItemStyle HorizontalAlign="Left" Width="50%" Wrap="true" />
                                </asp:TemplateField>
                            </Columns>
                        </asp:GridView>
                    </td>
                </tr>
                <tr>
                    <td colspan="3"></td>
                    <td class="right">
                        <asp:Button ID="btn1" runat="server" Text="Cancel" CssClass="nobutton" OnClick="btnCancelFieldConfigEdit_Click"/>
                        <asp:Button ID="btn2" runat="server" Text="Save" CssClass="bluebutton" OnClick="btnSaveFieldConfigEdit_Click" />                                                            
                    </td>
                </tr>
            </table>
        </asp:Panel>
    </ContentTemplate>
</asp:UpdatePanel>