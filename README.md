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

            // Step 1: Decode HTML entities (e.g., &rsquo; → ’)
            html = System.Web.HttpUtility.HtmlDecode(html);

            // Step 2: Apply regex fixes
            html = Regex.Replace(html, @"href=""file://[^""]*?(/#/.*?)""", @"href=""$1""");
            html = Regex.Replace(html, @"href=""([^""]*?)#\\?qms\?(.*?)""", @"href=""$1/#/qms?$2""");

            // Step 3: Decode obfuscated emails
            string processedHtml = DecodeObfuscatedEmails(html);

            // Step 4: Replace typographic characters with ASCII equivalents
            processedHtml = processedHtml
                .Replace("‘", "'")   // Left single quote
                .Replace("’", "'")   // Right single quote
                .Replace("“", "\"")  // Left double quote
                .Replace("”", "\"")   // Right double quote
                .Replace("–", "-")   // En dash
                .Replace("—", "-")    // Em dash
                .Replace("…", "...") // Ellipsis
                .Replace("‛", "'")    // Single high-reversed-9 quote
                .Replace("‟", "\"")   // Double high-reversed-9 quote
                .Replace("„", "\"");  // Double low-9 quote

            // Step 5: Ensure UTF-8 encoding
            byte[] htmlBytes = Encoding.UTF8.GetBytes(processedHtml);
            
            // Configure response
            Response.Cache.SetCacheability(HttpCacheability.NoCache);
            Response.Cache.SetNoStore();
            Response.Cache.SetExpires(DateTime.MinValue);
            Response.ContentType = "text/html";
            Response.AddHeader("Content-Disposition", $"attachment; filename={encodedFileName}");
            Response.OutputStream.Write(htmlBytes, 0, htmlBytes.Length);
            Response.Flush();
            Response.Close();
        }
        else
        {
            UploadStatusLabel.Text = "You did not specify a file to upload.";
        }
    }
    catch (Exception ex)
    {
        UDFLib.WriteExceptionLog(ex);
        UploadStatusLabel.Text = "An error occurred during conversion.";
        Response.End();
    }
}