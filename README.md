when I am uploading any file which is not .mht or mhtml it is showing me blanck screen which I don't want  

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
                HttpContext.Current.Response.Cache.SetCacheability(HttpCacheability.NoCache);
                HttpContext.Current.Response.Cache.SetNoStore();
                HttpContext.Current.Response.Cache.SetExpires(DateTime.MinValue);
                HttpContext.Current.Response.Expires = -1;
                HttpContext.Current.Response.CacheControl = "no-cache";
                HttpContext.Current.Response.ContentType = "text/html";
                HttpContext.Current.Response.AddHeader("Content-Disposition", "attachment; filename=" + fileName);
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
