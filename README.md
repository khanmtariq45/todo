the characters which I want to replace from the content of html are mentioned here in FixEncodingArtifacts but still these characters are present in html content 

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
                string encodedFileName = Uri.EscapeDataString(fileName);
                var parser = new MHTMLParser(selectedFiles[0]);
                var html = parser.getHTMLText();
 
                //First Regex: Handle "file://" URLs with "/#/" pattern
                string pattern = @"href=""file://[^""]*?(/#/.*?)""";
                string replacement = @"href=""$1""";
                html = System.Text.RegularExpressions.Regex.Replace(html, pattern, replacement);
 
                // Second Regex: Fix "#\qms?" and "#qms?" to "/#/qms?"
                string pattern2 = @"href=""([^""]*?)#\\?qms\?(.*?)""";
                string replacement2 = @"href=""$1/#/qms?$2""";
                html = System.Text.RegularExpressions.Regex.Replace(html, pattern2, replacement2);       
 
                // Replace matching characters with empty string and trim the result
                html  = System.Text.RegularExpressions.Regex.Replace(html, @"[\x00-\x1F\x7F-\x9F\uFEFF\u200B-\u200D\u2060]", "").Trim();
 
 
                //html = System.Text.RegularExpressions.Regex.Replace(html, @"[^\u0000-\u007F\u00B7\u2022\u2023\u2043\u25E6\u25CB\u25CF\u25AA\u25AB\u2013\u002A]+", "");
 
                //html = html.Replace("—", "-"); // em dash
                //html = html.Replace("Â·", "·");
                //html = html.Replace("Â", "");
                //// Remove control characters and normalize whitespace
                //html = System.Text.RegularExpressions.Regex.Replace(html, @"[\u0000-\u001F\u007F]+", " ");
                //html = System.Text.RegularExpressions.Regex.Replace(html, @"\s{2,}", " ");
 
                //// Fix text-indent issues
                //html = System.Text.RegularExpressions.Regex.Replace(html, @"text-indent:-?[\d\.]+pt;", "text-indent:0pt;", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
 
                //// Replace special characters
                //html = html.Replace("—", "-"); // em dash
                //html = html.Replace("’", "'").Replace("‘", "'").Replace("“", "\"").Replace("”", "\"");
                //html = html.Replace("Â·", "·"); // Convert incorrectly encoded bullet
                //// Final cleanup: remove unwanted Unicode characters
                //html = System.Text.RegularExpressions.Regex.Replace(html, @"[^\u0000-\u007F\u00B7\u2022\u2023\u2043\u25E6\u25CB\u25CF\u25AA\u25AB\u2013\u002A]+", "");
 
 
 
                //Remove ASCII unknown characters Â â€“ •
                //cleanedHtml = System.Text.RegularExpressions.Regex.Replace(cleanedHtml, @"[^\u0000-\u007F]+", "");
                //html = System.Text.RegularExpressions.Regex.Replace(html, @"[^\u0000-\u007F\u00B7\u2022\u2023\u2043\u25E6\u25CB\u25CF\u25AA\u25AB\u2013\u002A]+", "");
 
                //// Convert non-breaking spaces and hidden formatting
                //html = html.Replace("\u00A0", " "); // Convert NBSP to normal space
 
                //html = System.Text.RegularExpressions.Regex.Replace(html, @"text-indent:-?[\d\.]+pt;", "text-indent:0pt;", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                //// Convert non-breaking spaces and hidden formatting
                //////html = html.Replace("\u00A0", " "); // Convert NBSP to normal space
                //html = System.Text.RegularExpressions.Regex.Replace(html, @"[\p{C}\p{Zs}]+", " "); // Removes control characters
                //                                                                                   //html = html.Replace("/Â/g", "");
 
 
 
                //html = html.Replace("Â", ""); // Explicitly remove Â
                //html = System.Text.RegularExpressions.Regex.Replace(html, @"text-indent:-?[\d\.]+pt;", "text-indent:0pt;", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                //html = System.Text.RegularExpressions.Regex.Replace(html, @"[\u0000-\u001F\u007F]+", " "); // Remove control characters
                //html = System.Text.RegularExpressions.Regex.Replace(html, @"\s{2,}", " "); // Normalize whitespace
                //html = html.Replace("—", "-"); // em dash
 
 
 
                //html = html.Replace("â€“", "–"); // Replace with actual en dash
                //html = html.Replace("â€”", "—"); // em dash
                //html = html.Replace("â€˜", "‘"); // left single quote
                //html = html.Replace("â€™", "’"); // right single quote
                //html = html.Replace("â€œ", "“"); // left double quote
                //html = html.Replace("â€�", "”"); // right double quote
                //html = html.Replace("Â", "");    // non-breaking space or junk
                //html = html.Replace("Â–", "-");    // non-breaking space or junk
 
 
                // Decode obfuscated email addresses
                string processedHtml = SanitizeHtml(DecodeObfuscatedEmails(html));
                processedHtml = FixEncodingArtifacts(processedHtml);
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
                HttpContext.Current.Response.AddHeader("Content-Disposition", "attachment; filename=" + encodedFileName);
                HttpContext.Current.Response.OutputStream.Write(htmlBytes, 0, htmlBytes.Length);
                HttpContext.Current.Response.Flush();
                HttpContext.Current.Response.Close();
                HttpContext.Current.Response.End();
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
            HttpContext.Current.Response.End();
        }
    }
 
    private string FixEncodingArtifacts(string html)
    {
    return html.Replace("â€“", "–")   // en dash
               .Replace("â€”", "—")   // em dash
               .Replace("â€˜", "‘")   // left single quote
               .Replace("â€™", "’")   // right single quote
               .Replace("â€œ", "“")   // left double quote
               .Replace("â€�", "”")   // right double quote
               .Replace("Â·", "·")    // bullet point
               .Replace("Â", " ")     // non-breaking space or junk
               .Replace("Ã", "");     // sometimes appears as junk
 
    }
