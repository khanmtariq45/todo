protected void UploadButton_Click(object sender, EventArgs e)
{
    try
    {
        // ... [existing code] ...

        string processedHtml = SanitizeHtml(DecodeObfuscatedEmails(html));
        processedHtml = FixEncodingArtifacts(processedHtml);
        processedHtml = processedHtml.Replace("’", "'").Replace("‘", "'").Replace("“", "\"").Replace("”", "\"");

        // Inject UTF-8 meta tag if missing
        if (!processedHtml.Contains("charset=") && processedHtml.IndexOf("<head>", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            processedHtml = processedHtml.Replace("<head>", "<head><meta charset=\"utf-8\">");
        }

        HttpContext.Current.Response.Cache.SetCacheability(HttpCacheability.NoCache);
        HttpContext.Current.Response.Cache.SetNoStore();
        HttpContext.Current.Response.Cache.SetExpires(DateTime.MinValue);
        HttpContext.Current.Response.Expires = -1;
        HttpContext.Current.Response.CacheControl = "no-cache";
        HttpContext.Current.Response.ContentType = "text/html; charset=utf-8";
        HttpContext.Current.Response.AddHeader("Content-Disposition", "attachment; filename=" + encodedFileName);

        // Write using StreamWriter for proper UTF-8 encoding
        using (var writer = new StreamWriter(HttpContext.Current.Response.OutputStream, Encoding.UTF8))
        {
            writer.Write(processedHtml);
        }

        HttpContext.Current.Response.Flush();
        HttpContext.Current.Response.Close();
        HttpContext.Current.Response.End();
    }
    catch (Exception ex)
    {
        UDFLib.WriteExceptionLog(ex);
        HttpContext.Current.Response.End();
    }
}