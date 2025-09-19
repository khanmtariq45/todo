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

            // First, protect image content from encoding fixes
            html = ProtectImageContent(html);

            // Apply regex fixes only to non-image parts of HTML
            string pattern = @"href=""file://[^""]*?(/#/.*?)""";
            string replacement = @"href=""$1""";
            html = System.Text.RegularExpressions.Regex.Replace(html, pattern, replacement);

            string pattern2 = @"href=""([^""]*?)#\\?qms\?(.*?)""";
            string replacement2 = @"href=""$1/#/qms?$2""";
            html = System.Text.RegularExpressions.Regex.Replace(html, pattern2, replacement2);

            // Remove control characters only from text parts
            html = RemoveControlCharactersSafely(html);

            // Decode obfuscated email addresses
            string processedHtml = SanitizeHtml(DecodeObfuscatedEmails(html));
            processedHtml = FixEncodingArtifacts(processedHtml);
            
            // Restore protected image content
            processedHtml = RestoreImageContent(processedHtml);
            
            // Replace specific characters
            processedHtml = processedHtml.Replace("’", "'").Replace("‘", "'").Replace("“", "\"").Replace("”", "\"");

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

private string ProtectImageContent(string html)
{
    // Replace image tags with placeholders to protect them from encoding changes
    var imageMatches = new System.Text.RegularExpressions.Regex(@"<img[^>]+>", 
        System.Text.RegularExpressions.RegexOptions.IgnoreCase).Matches(html);
    
    var protectedHtml = html;
    for (int i = 0; i < imageMatches.Count; i++)
    {
        protectedHtml = protectedHtml.Replace(imageMatches[i].Value, $"<!-- IMAGE_PLACEHOLDER_{i} -->");
    }
    
    // Also protect base64 image data
    var base64Matches = new System.Text.RegularExpressions.Regex(@"data:image/[^;]+;base64,[^""']+", 
        System.Text.RegularExpressions.RegexOptions.IgnoreCase).Matches(html);
    
    for (int i = 0; i < base64Matches.Count; i++)
    {
        protectedHtml = protectedHtml.Replace(base64Matches[i].Value, $"<!-- BASE64_PLACEHOLDER_{i} -->");
    }
    
    return protectedHtml;
}

private string RestoreImageContent(string html)
{
    // Restore image tags
    var imageMatches = new System.Text.RegularExpressions.Regex(@"<!-- IMAGE_PLACEHOLDER_(\d+) -->", 
        System.Text.RegularExpressions.RegexOptions.IgnoreCase).Matches(html);
    
    var originalImages = new System.Text.RegularExpressions.Regex(@"<img[^>]+>", 
        System.Text.RegularExpressions.RegexOptions.IgnoreCase).Matches(html);
    
    var restoredHtml = html;
    foreach (System.Text.RegularExpressions.Match match in imageMatches)
    {
        int index = int.Parse(match.Groups[1].Value);
        if (index < originalImages.Count)
        {
            restoredHtml = restoredHtml.Replace(match.Value, originalImages[index].Value);
        }
    }
    
    // Restore base64 image data
    var base64Matches = new System.Text.RegularExpressions.Regex(@"<!-- BASE64_PLACEHOLDER_(\d+) -->", 
        System.Text.RegularExpressions.RegexOptions.IgnoreCase).Matches(html);
    
    var originalBase64 = new System.Text.RegularExpressions.Regex(@"data:image/[^;]+;base64,[^""']+", 
        System.Text.RegularExpressions.RegexOptions.IgnoreCase).Matches(html);
    
    foreach (System.Text.RegularExpressions.Match match in base64Matches)
    {
        int index = int.Parse(match.Groups[1].Value);
        if (index < originalBase64.Count)
        {
            restoredHtml = restoredHtml.Replace(match.Value, originalBase64[index].Value);
        }
    }
    
    return restoredHtml;
}

private string RemoveControlCharactersSafely(string html)
{
    // Split HTML into tags and content
    var tagRegex = new System.Text.RegularExpressions.Regex(@"<[^>]+>");
    var matches = tagRegex.Matches(html);
    
    // Store tags temporarily
    var tags = new List<string>();
    foreach (System.Text.RegularExpressions.Match match in matches)
    {
        tags.Add(match.Value);
    }
    
    // Replace tags with placeholders
    var content = tagRegex.Replace(html, "<!-- TAG -->");
    
    // Remove control characters from content only
    content = System.Text.RegularExpressions.Regex.Replace(content, @"[\x00-\x1F\x7F-\x9F\uFEFF\u200B-\u200D\u2060]", "").Trim();
    
    // Restore tags
    int tagIndex = 0;
    return System.Text.RegularExpressions.Regex.Replace(content, @"<!-- TAG -->", 
        m => tagIndex < tags.Count ? tags[tagIndex++] : "");
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