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
