<asp:TemplateField>
                                                            <ItemTemplate>
                                                                <asp:LinkButton ID="lnkUnassign" runat="server" Text="Un-assign" 
                                                                    OnClientClick="return confirm('Clicking \"OK\" will remove the selected folder and all sub-folders from the selected vessels. Are you sure you want to proceed?');"
                                                                    OnClick="unassign_Click"
                                                                    Visible='<%# Convert.ToString(Eval("VesselAssign")) == "1" ? true : false %>'
                                                                    onmouseover="this.style.textDecoration='underline';"
                                                                    onmouseout="this.style.textDecoration='none';"
                                                                    Style="color: blue;">
                                                                </asp:LinkButton>
                                                            </ItemTemplate>
                                                            <ItemStyle HorizontalAlign="Center" />
                                                        </asp:TemplateField>
