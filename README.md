public void OpenFileExternal(string url, string fileName)
{
    string filepath = Server.MapPath(url);
    FileInfo file = new FileInfo(filepath);
    bool IE = Request.UserAgent.IndexOf("MSIE") > -1;

    if (file.Exists)
    {
        string fileContent = "";
        if (file.Extension == ".html" || file.Extension == ".htm")
        {
            fileContent = File.ReadAllText(filepath);
            fileContent = DecodeObfuscatedEmails(fileContent);
            fileContent = fileContent.Replace("’", "'").Replace("‘", "'").Replace("“", "\"")
                                     .Replace("”", "\"").Replace("&nbsp;", " ").Replace(" ", " ");
        }

        Response.ClearContent();
        
        string encodedFileName = Uri.EscapeDataString(fileName);
        string contentDisposition = IE 
            ? $"inline; filename=\"{encodedFileName}\"" 
            : $"attachment; filename*=UTF-8''{encodedFileName}";

        Response.AddHeader("Content-Disposition", contentDisposition);
        Response.AddHeader("Content-Length", file.Length.ToString());
        HttpContext.Current.Response.AddHeader("Vary", "Accept-Encoding");
        HttpContext.Current.Response.Buffer = true;
        Response.ContentType = objQMS.GetContentTypeByExtension(file.Extension.ToLower());

        if (file.Extension == ".html" || file.Extension == ".htm")
        {
            UDFLib.WriteExceptionLog(new Exception("Content Length: " + System.Text.Encoding.UTF8.GetByteCount(fileContent) + 
                                                   " Final Processed HTML: " + "(" + fileContent + ")"));
            Response.Write(fileContent);
        }
        else
        {
            Response.TransmitFile(file.FullName);
        }

        Response.Flush();
        HttpContext.Current.ApplicationInstance.CompleteRequest();
    }
}