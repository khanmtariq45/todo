public void OpenFileExternal(string url, string fileName)
{
    string filepath = Server.MapPath(url);
    FileInfo file = new FileInfo(filepath);

    if (file.Exists)
    {
        string fileContent = "";
        if (file.Extension == ".html" || file.Extension == ".htm")
        {
            fileContent = File.ReadAllText(filepath);

            // Decode obfuscated email addresses
            fileContent = DecodeObfuscatedEmails(fileContent);
            // Replace specific characters
            fileContent = fileContent.Replace("’", "'").Replace("‘", "'").Replace("“", "\"").Replace("”", "\"").Replace("&nbsp;", " ").Replace(" ", " "); // Non-breaking space;               
        }

        Response.ClearContent();

        // Sanitize the filename for older browsers
        string sanitizedFileName = SanitizeFileName(fileName);

        // Set Content-Disposition header
        string contentDisposition = $"attachment; filename=\"{sanitizedFileName}\"; filename*=UTF-8''{Uri.EscapeDataString(fileName)}";
        Response.AddHeader("Content-Disposition", contentDisposition);

        Response.AddHeader("Content-Length", file.Length.ToString());
        HttpContext.Current.Response.AddHeader("Vary", "Accept-Encoding");
        HttpContext.Current.Response.Buffer = true;
        Response.ContentType = objQMS.GetContentTypeByExtension(file.Extension.ToLower());

        if (file.Extension == ".html" || file.Extension == ".htm")
        {
            UDFLib.WriteExceptionLog(new Exception("Content Length: " + System.Text.Encoding.UTF8.GetByteCount(fileContent) + " Final Processed HTML: " + "(" + fileContent + ")"));
            Response.Write(fileContent);
        }
        else
        {
            Response.TransmitFile(file.FullName);
        }

        Response.End();
    }
}

// Helper method to sanitize filenames for older browsers
private string SanitizeFileName(string fileName)
{
    // Replace invalid characters with underscores
    char[] invalidChars = Path.GetInvalidFileNameChars();
    foreach (char invalidChar in invalidChars)
    {
        fileName = fileName.Replace(invalidChar, '_');
    }

    // Ensure the filename is not empty
    if (string.IsNullOrEmpty(fileName))
    {
        fileName = "file";
    }

    return fileName;
}