protected void UploadButton_Click(object sender, EventArgs e)
    {
        try
        {
            bool IE = Request.UserAgent.IndexOf("MSIE") > -1;
            HttpFileCollection selectedFiles = Request.Files;
            UploadStatusLabel.Text = "";
            if (selectedFiles.Count > 0)
            {
                var ext = Path.GetExtension(selectedFiles[0].FileName).ToLowerInvariant();
                if (ext != ".mht" && ext != ".mhtml")
                {
                    UploadStatusLabel.Text = "Only .mht and .mhtml files are allowed";
                    return;
                }
                BLL_QMS_Document objQMS = new BLL_QMS_Document();

                string fileName = Path.GetFileNameWithoutExtension(selectedFiles[0].FileName) + ".html";
                var parser = new MHTMLParser(selectedFiles[0]);
                var html = parser.getHTMLText();
                string pattern = @"href=""file://[^""]*?(/#/.*?)""";
                string replacement = @"href=""$1""";
                html = System.Text.RegularExpressions.Regex.Replace(html, pattern, replacement);

                // Decode obfuscated email addresses
                string processedHtml = DecodeObfuscatedEmails(html);
                // Replace specific characters
                processedHtml = processedHtml.Replace("’", "'").Replace("‘", "'").Replace("“", "\"").Replace("”", "\""); // Non-breaking space;
                // Convert the processed HTML to bytes 
                byte[] htmlBytes = Encoding.UTF8.GetBytes(processedHtml);
                //HttpContext.Current.Response.Clear();
                //HttpContext.Current.Response.ClearHeaders();
                //HttpContext.Current.Response.ClearContent();
                //HttpContext.Current.Response.Buffer = true;
                HttpContext.Current.Response.Cache.SetCacheability(HttpCacheability.NoCache);
                HttpContext.Current.Response.Cache.SetNoStore();
                HttpContext.Current.Response.Cache.SetExpires(DateTime.MinValue);
                HttpContext.Current.Response.Expires = -1;
                HttpContext.Current.Response.CacheControl = "no-cache";
                HttpContext.Current.Response.ContentType = "text/html";
                //HttpContext.Current.Response.AddHeader("Vary", "Accept-Encoding");
                //if (!IE)
                //{
                    HttpContext.Current.Response.AddHeader("Content-Disposition", "attachment; filename=" + fileName);
                //}
                //else
                //{
                //    HttpContext.Current.Response.AddHeader("Content-Disposition", "inline; filename=" + fileName);
                //}

                //processedHtml = File.ReadAllText(@"C:\Users\HarisHassanPKDev\Downloads\Email Protected File\new 2802.html");
                //Response.AddHeader("Content-Length", processedHtml.Length.ToString());
                //UDFLib.WriteExceptionLog(new Exception("Content Length: " + Encoding.UTF8.GetByteCount(processedHtml) + " Before Write Processed HTML: " + "(" + processedHtml + ")"));
                //HttpContext.Current.Response.Write(processedHtml);
                //HttpContext.Current.Response.AddHeader("Content-Length", htmlBytes.Length.ToString());
                HttpContext.Current.Response.OutputStream.Write(htmlBytes, 0, htmlBytes.Length);
                HttpContext.Current.Response.Flush();
                HttpContext.Current.Response.Close();
            }
            else
            {
                // Notify the user that a file was not uploaded.
                UploadStatusLabel.Text = "You did not specify a file to upload.";
            }
        }
        catch (Exception ex)
        {
            UDFLib.WriteExceptionLog(ex);
        }
        finally
        {
            try
            {
                HttpContext.Current.Response.End();
            }
            catch 
            {
              
            }        
        }
    }

    public string DecodeObfuscatedEmails(string htmlContent)
    {
        try
        {
            var oregex = new System.Text.RegularExpressions.Regex(@"<(?<tag>[a-zA-Z]+)[^>]*data-cfemail=([\""']?)(?<cfemail>[a-fA-F0-9]+)\1[^>]*>(?<innerContent>.*?)</\k<tag>>", System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline);
            var omatchings = oregex.Matches(htmlContent);
            UDFLib.WriteExceptionInfLog(new Exception("Started Processing HTML Content:" + htmlContent), QMSEnums.QmsModuleCode.QMS.ToString());
            if (omatchings.Count > 0)
            {
                UDFLib.WriteExceptionInfLog(new Exception("Found " + omatchings.Count.ToString() + " Regex Matching Instances."), QMSEnums.QmsModuleCode.QMS.ToString());
                foreach (System.Text.RegularExpressions.Match match in omatchings)
                {
                    string tag = match.Groups["tag"].Value;
                    string cfemail = match.Groups["cfemail"].Value;
                    string innerContent = match.Groups["innerContent"].Value;
                    if (!string.IsNullOrEmpty(cfemail))
                    {
                        string decodedEmail = DecodeEmail(cfemail);
                        string updatedTag;
                        if (tag.Equals("a", StringComparison.OrdinalIgnoreCase))
                        {
                            updatedTag = @"<a href=\\""mailto:" + decodedEmail + "\\>" + decodedEmail + "</a>";
                        }
                        else if (tag.Equals("span", StringComparison.OrdinalIgnoreCase))
                        {
                            updatedTag = @"<!--email_off-->" + decodedEmail + "<!--/email_off-->";
                        }
                        else
                        {
                            continue;
                        }
                        UDFLib.WriteExceptionInfLog(new Exception("Replacing: " + match.Value + " With " + updatedTag), QMSEnums.QmsModuleCode.QMS.ToString());
                        htmlContent = htmlContent.Replace(match.Value, updatedTag);
                    }
                    else
                    {
                        UDFLib.WriteExceptionLog(new Exception("No obfuscated email found in the match. cfemail: " + "(" + cfemail + ") - tag: " + tag + " - innerContent: " + innerContent));
                    }
                }
                UDFLib.WriteExceptionInfLog(new Exception("Content Length: " + Encoding.UTF8.GetByteCount(htmlContent) + " Completed Processing HTML Content:" + htmlContent), QMSEnums.QmsModuleCode.QMS.ToString());
            }
            else
            {
                UDFLib.WriteExceptionInfLog(new Exception("No match found using REGEX:" + oregex), QMSEnums.QmsModuleCode.QMS.ToString());
            }
            return htmlContent;
        }
        catch (Exception ex)
        {
            UDFLib.WriteExceptionLog(ex);
            return htmlContent;
        }
    }

    public string DecodeEmail(string obfuscatedEmail)
    {
        // Ensure the obfuscatedEmail has at least 2 characters for the key
        if (obfuscatedEmail.Length < 2)
        {
            throw new ArgumentException("Invalid obfuscated email format.");
        }

        int key = Convert.ToInt32(obfuscatedEmail.Substring(0, 2), 16);
        StringBuilder email = new StringBuilder();

        try
        {
            for (int i = 2; i < obfuscatedEmail.Length; i += 2)
            {
                // Ensure there are enough characters left for a valid substring
                if (i + 2 <= obfuscatedEmail.Length)
                {
                    int charCode = Convert.ToInt32(obfuscatedEmail.Substring(i, 2), 16) ^ key;
                    email.Append((char)charCode);
                }
                else
                {
                    UDFLib.WriteExceptionLog(new ArgumentException("Invalid obfuscated email format."));
                }
            }
        }
        catch (Exception ex)
        {
            UDFLib.WriteExceptionLog(ex);
            return string.Empty; // Return an empty string or handle the error as needed
        }
        return email.ToString();
    }
