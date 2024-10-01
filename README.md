   <asp:TemplateField>
                                                            <ItemTemplate>
                                                                <asp:LinkButton ID="lnkResync" runat="server" Text="Re-sync" 
                                                                    OnClientClick="return confirm('The selected folder and all its subfolder will be re-synced to the selected vessel. Are you sure you want to proceed?');"
                                                                    OnClick="lnkResync_Click"
                                                                    Visible='<%#Convert.ToString(Eval("VesselAssign"))=="1"?true : false %>'
                                                                    Enabled='<%#Convert.ToString(Eval("VesselAssign"))=="1"?true : false %>'
                                                                    onmouseover="this.style.textDecoration='underline';"
                                                                    onmouseout="this.style.textDecoration='none';"
                                                                    Style="color: blue;"> 
                                                                </asp:LinkButton>
                                                            </ItemTemplate>
                                                            <ItemStyle HorizontalAlign="Center" />
                                                        </asp:TemplateField>






                                                        <asp:TemplateField HeaderText="Select">
                                                            <HeaderTemplate>
                                                                <asp:CheckBox ID="chkAssignAllVessel" runat="server" OnCheckedChanged="chkAssignAllVessel_CheckedChanged"
                                                                    AutoPostBack="true" />
                                                                Select
                                                            </HeaderTemplate>
                                                            <ItemTemplate>
                                                                <asp:CheckBox ID="chkVesselAssign" runat="server" Checked='<%#Convert.ToString(Eval("VesselAssign"))=="1"?true : false %>'
                                                                    ToolTip="Assign To Vessel" />
                                                                <asp:HiddenField runat="server" ID="hdnAssignedCheck" Value='<%#Convert.ToString(Eval("VesselAssign")) %>' />
                                                            </ItemTemplate>
                                                            <ItemStyle Wrap="true" HorizontalAlign="Center" Width="120px"></ItemStyle>
                                                            <HeaderStyle Wrap="true" HorizontalAlign="Center" />
                                                        </asp:TemplateField>
