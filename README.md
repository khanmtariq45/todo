protected void UploadButton_Click(object sender, EventArgs e)
{
    try
    {
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

            string fileName = Path.GetFileNameWithoutExtension(selectedFiles[0].FileName) + ".html";
            string encodedFileName = Uri.EscapeDataString(fileName);

            var parser = new MHTMLParser(selectedFiles[0]);
            var html = parser.getHTMLText();

            // **1. Fix "file://" links**
            html = Regex.Replace(html, @"href=""file://[^""]*?(/#/.*?)""", @"href=""$1""");

            // **2. Fix broken "#qms?" links**
            html = Regex.Replace(html, @"href=""([^""]*?)#\\?qms\?(.*?)""", @"href=""$1/#/qms?$2""");

            // **3. Remove MS Office-specific styles**
            html = Regex.Replace(html, @"mso-[^:]+:[^;]+;", "", RegexOptions.IgnoreCase);

            // **4. Fix broken `<a>` tags (common issue with MHT parsing)**
            html = Regex.Replace(html, @"<a\s+[^>]*>", match =>
            {
                string fixedTag = match.Value.Replace("rdana", "Verdana"); // Fix broken font names
                return fixedTag;
            }, RegexOptions.IgnoreCase);

            // **5. Remove empty `<span>` tags**
            html = Regex.Replace(html, @"<span[^>]*>\s*</span>", "", RegexOptions.IgnoreCase);

            // **6. Decode obfuscated email addresses**
            string processedHtml = DecodeObfuscatedEmails(html);

            // **7. Replace non-standard characters**
            processedHtml = processedHtml
                .Replace("’", "'")
                .Replace("‘", "'")
                .Replace("“", "\"")
                .Replace("”", "\"");

            // **8. Convert HTML to bytes and send as a response**
            byte[] htmlBytes = Encoding.UTF8.GetBytes(processedHtml);
            HttpContext.Current.Response.Clear();
            HttpContext.Current.Response.Cache.SetCacheability(HttpCacheability.NoCache);
            HttpContext.Current.Response.Cache.SetNoStore();
            HttpContext.Current.Response.Cache.SetExpires(DateTime.MinValue);
            HttpContext.Current.Response.Expires = -1;
            HttpContext.Current.Response.ContentType = "text/html";
            HttpContext.Current.Response.AddHeader("Content-Disposition", "attachment; filename=" + encodedFileName);
            HttpContext.Current.Response.OutputStream.Write(htmlBytes, 0, htmlBytes.Length);
            HttpContext.Current.Response.Flush();
            HttpContext.Current.Response.Close();
            HttpContext.Current.Response.End();
        }
        else
        {
            UploadStatusLabel.Text = "You did not specify a file to upload.";
        }
    }
    catch (Exception ex)
    {
        UDFLib.WriteExceptionLog(ex);
        HttpContext.Current.Response.End();
    }
}