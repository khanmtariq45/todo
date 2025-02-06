public void OpenFileExternal(string url, string fileName)
{
    try
    {
        // Validate input
        if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(fileName))
        {
            throw new ArgumentException("URL or filename cannot be null or empty.");
        }

        // Sanitize filename to prevent security issues
        string sanitizedFileName = Path.GetFileName(fileName); // Remove any path components
        if (string.IsNullOrEmpty(sanitizedFileName))
        {
            throw new ArgumentException("Invalid filename.");
        }

        // Map the URL to the physical file path
        string filepath = Server.MapPath(url);
        FileInfo file = new FileInfo(filepath);

        // Check if the file exists
        if (!file.Exists)
        {
            throw new FileNotFoundException("File not found: " + filepath);
        }

        // Detect Internet Explorer or legacy Edge
        bool isIE = Request.UserAgent.Contains("MSIE") || Request.UserAgent.Contains("Trident/");

        // Encode filename for use in headers
        string encodedFileName = Uri.EscapeDataString(sanitizedFileName);

        // Read and process file content if it's HTML
        string fileContent = "";
        if (file.Extension == ".html" || file.Extension == ".htm")
        {
            fileContent = File.ReadAllText(filepath);
            fileContent = DecodeObfuscatedEmails(fileContent);
            fileContent = fileContent
                .Replace("’", "'")
                .Replace("‘", "'")
                .Replace("“", "\"")
                .Replace("”", "\"")
                .Replace("&nbsp;", " ")
                .Replace(" ", " ");
        }

        // Clear existing response headers and content
        Response.ClearContent();
        Response.ClearHeaders();

        // Construct Content-Disposition header
        string contentDisposition = isIE ? "inline" : "attachment";
        contentDisposition += "; filename=\"" + sanitizedFileName.Replace("\"", "\"\"") + "\"";
        contentDisposition += "; filename*=UTF-8''" + encodedFileName;

        // Set response headers
        Response.AddHeader("Content-Disposition", contentDisposition);
        Response.AddHeader("Content-Length", file.Length.ToString());
        Response.ContentType = objQMS.GetContentTypeByExtension(file.Extension.ToLower());
        HttpContext.Current.Response.AddHeader("Vary", "Accept-Encoding");
        HttpContext.Current.Response.Buffer = true;

        // Write file content to response
        if (file.Extension == ".html" || file.Extension == ".htm")
        {
            // Log processed HTML content for debugging
            UDFLib.WriteExceptionLog(new Exception("Content Length: " + System.Text.Encoding.UTF8.GetByteCount(fileContent) + " Final Processed HTML: " + "(" + fileContent + ")"));
            Response.Write(fileContent);
        }
        else
        {
            // Transmit file directly for non-HTML files
            Response.TransmitFile(file.FullName);
        }

        // End the response
        Response.End();
    }
    catch (Exception ex)
    {
        // Log the exception and return an error response
        UDFLib.WriteExceptionLog(ex);
        Response.Clear();
        Response.StatusCode = 500;
        Response.Write("An error occurred while processing your request.");
        Response.End();
    }
}