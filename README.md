public void OpenFileExternal(string url, string fileName)
{
    try
    {
        // Validate input
        if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(fileName))
        {
            throw new ArgumentException("URL or filename cannot be null or empty.");
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
        bool isIE = Request.UserAgent.IndexOf("MSIE") > -1;

        // Preserve special characters (e.g., ..., ~) in the filename
        string encodedFileName = fileName.Replace("\"", ""); // Remove quotes to avoid breaking the header
        encodedFileName = Uri.EscapeDataString(encodedFileName).Replace("%7E", "~"); // Preserve ~

        // Read and process file content if it's HTML
        string fileContent = "";
        if (file.Extension == ".html" || file.Extension == ".htm")
        {
            fileContent = File.ReadAllText(filepath);

            // Decode obfuscated email addresses
            fileContent = DecodeObfuscatedEmails(fileContent);
            // Replace specific characters
            fileContent = fileContent
                .Replace("’", "'")
                .Replace("’", "'")
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
        contentDisposition += "; filename=\"" + encodedFileName + "\""; // Use encoded filename
        contentDisposition += "; filename*=UTF-8''" + encodedFileName; // Add UTF-8 encoded filename

        // Set response headers
        Response.AddHeader("Content-Disposition", contentDisposition);
        Response.AddHeader("Content-Length", file.Length.ToString());
        Response.ContentType = objQMS.GetContentTypeByExtension(file.Extension.ToLower());
        HttpContext.Current.Response.AddHeader("Vary", "Accept-Encoding");
        HttpContext.Current.Response.Buffer = true;

        // Write file content to response
        if (file.Extension == ".html" || file.Extension == ".htm")
        {
            UDFLib.WriteExceptionLog(new Exception("Content Length: " + System.Text.Encoding.UTF8.GetByteCount(fileContent) + " Final Processed HTML: " + "(" + fileContent + ")"));
            Response.Write(fileContent);
        }
        else
        {
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