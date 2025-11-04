I am calling function 

bool hasCopliotAccess = await objUser.Has_UserAccessRight("copilot", "copilot_icon_sub", "view", Convert.ToString(Session["token"]));


then there 

 public async Task<bool> Has_UserAccessRight(string ModuleCode, string FunctionCode, string Action, string Token)
        {
            string methodName = "BLL_Infra_UserCredentials.Has_UserAccessRight";

            try
            {
                UDFLib.WriteLog(methodName, string.Format("Method called with parameters - ModuleCode: '{0}', FunctionCode: '{1}', Action: '{2}', Token: '{3}'", ModuleCode, FunctionCode, Action, Token));

                if (string.IsNullOrEmpty(Token) || string.IsNullOrEmpty(ModuleCode) || string.IsNullOrEmpty(FunctionCode) || string.IsNullOrEmpty(Action))
                {
                    string missingParams = string.Join(", ",
                        new string[] {
                            string.IsNullOrEmpty(Token) ? "Token" : null,
                            string.IsNullOrEmpty(ModuleCode) ? "ModuleCode" : null,
                            string.IsNullOrEmpty(FunctionCode) ? "FunctionCode" : null,
                            string.IsNullOrEmpty(Action) ? "Action" : null
                        }.Where(x => x != null).ToArray());

                    UDFLib.WriteLog(methodName, string.Format("Required parameter(s) missing: {0}. Access denied - returning false.", missingParams));
                    return false;
                }


                List<UserAccessRight> userRights = objDal.Get_UserAccessRightList(Token);

                if (userRights == null)
                {
                    UDFLib.WriteLog(methodName, "API returned null user rights list! Access denied - returning false.");
                    return false;
                }

                UDFLib.WriteLog(methodName, string.Format("Successfully retrieved {0} user access rights from API.", userRights.Count));

                UserAccessRight matchingRight = userRights.FirstOrDefault(right =>
                    string.Equals(right.Module_Code, ModuleCode, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(right.Function_Code, FunctionCode, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(right.Action, Action, StringComparison.OrdinalIgnoreCase)
                );

                if (matchingRight != null)
                {
                    UDFLib.WriteLog(methodName, string.Format("Access GRANTED! Found matching access right - User_ID: {0}, Right_Code: '{1}', Valid_On: '{2}'", matchingRight.User_ID, matchingRight.Right_Code, matchingRight.Valid_On));
                    return true;
                }
                else
                {
                    UDFLib.WriteLog(methodName, string.Format("Access DENIED! No matching access right found for ModuleCode: '{0}', FunctionCode: '{1}', Action: '{2}'", ModuleCode, FunctionCode, Action));
                    return false;
                }
            }
            catch (Exception ex)
            {
                UDFLib.WriteExceptionLog(ex);
                return false;
            }
        }



        then there is 


        public List<UserAccessRight> Get_UserAccessRightList(string Token)
        {
            string methodName = "DAL_Infra_UserCredentials.Get_UserAccessRightList";
            List<UserAccessRight> userRights = new List<UserAccessRight>();

            try
            {

                string baseUrl = DAL_Infra_Common.GetNodeApiURL("infra");
                string apiUrl = string.Concat(baseUrl, "/infra/access-rights/user-rights/get-user-access-rights");

                UDFLib.WriteLog(methodName, string.Format("Complete API URL: '{0}'", apiUrl));

                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(apiUrl);
                request.Method = "GET";
                request.ContentType = "application/json";
                request.Headers.Add("Authorization", Token);

                UDFLib.WriteLog(methodName, "HTTP request configured. Making API call...");

                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    UDFLib.WriteLog(methodName, string.Format("API call successful. Response Status: {0} ({1})", response.StatusCode, (int)response.StatusCode));

                    using (StreamReader reader = new StreamReader(response.GetResponseStream()))
                    {
                        string jsonResponse = reader.ReadToEnd();

                        if (string.IsNullOrEmpty(jsonResponse))
                        {
                            UDFLib.WriteLog(methodName, "Warning: API returned empty response!");
                            return userRights;
                        }

                        UDFLib.WriteLog(methodName, string.Format("JSON response received. Length: {0} characters", jsonResponse.Length));

                        JavaScriptSerializer serializer = new JavaScriptSerializer();
                        serializer.MaxJsonLength = Int32.MaxValue;
                        userRights = serializer.Deserialize<List<UserAccessRight>>(jsonResponse);
                    }
                }
            }
            catch (Exception ex)
            {
                UDFLib.WriteExceptionLog(ex);
                throw new Exception("Error retrieving user access rights: " + ex.Message, ex);
            }

            return userRights;
        }
