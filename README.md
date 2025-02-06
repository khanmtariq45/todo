public void OpenFileExternal(string url, string fileName)
{
    string filepath = Server.MapPath(url);
    FileInfo file = new FileInfo(filepath);
    bool IE = Request.UserAgent.IndexOf("MSIE") > -1;
    
    // Encode filename for safe transmission
    string encodedFileName = Uri.EscapeDataString(fileName).Replace("+", " ");

    if (file.Exists)
    {
        Response.ClearContent();
        Response.AddHeader("Content-Length", file.Length.ToString());
        Response.ContentType = objQMS.GetContentTypeByExtension(file.Extension.ToLower());

        // Properly format Content-Disposition header
        string contentDisposition = "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedFileName;
        
        if (IE)
            contentDisposition = "inline; filename=\"" + fileName + "\"";

        Response.AddHeader("Content-Disposition", contentDisposition);
        Response.TransmitFile(file.FullName);
        Response.End();
    }
}