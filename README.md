In my .net code first two td should be in one line next two td should be in another line


<tr id="trMandatoryCOSWPEdit" runat="server">
                            <td class="right">
                                <asp:Label ID="lblMandatoryCOSWPEdit" runat="server" Text="Analysis Mandatory for Completion?"></asp:Label>
                            </td>
                            <td>
                                <asp:DropDownList ID="ddlMandatoryCOSWP" runat="server" Width="250px" AutoPostBack="true" OnSelectedIndexChanged="ddlMandatoryCOSWP_SelectedIndexChanged">
                                    <asp:ListItem Value="1" Selected="True">Yes</asp:ListItem>
                                    <asp:ListItem Value="0">No</asp:ListItem>
                                </asp:DropDownList>
                            </td>
                            <td class="right">
                                <asp:Label ID="lblUnsafeCategoriesEdit" runat="server" Text="Unsafe categories" Visible="false"></asp:Label>
                            </td>
                            <td>
                                <CustomFilter:ucfDropdown ID="ddlUnsafeCategories" runat="server" UseInHeader="false" Width="250" Visible="false" />
                            </td>                       
                        </tr>
