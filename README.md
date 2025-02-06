public void OpenFileExternal(string url, string fileName)
{
    string filepath = Server.MapPath(url);
    FileInfo file = new FileInfo(filepath);
    bool IE = Request.UserAgent.IndexOf("MSIE") > -1;
    string encodedFileName = Uri.EscapeDataString(fileName).Replace("+", " ");

    if (file.Exists)
    {
        Response.ClearContent();
        if (!IE)
            Response.AddHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
        else
            Response.AddHeader("Content-Disposition", "inline; filename=\"" + fileName + "\"");

        Response.AddHeader("Content-Length", file.Length.ToString());
        HttpContext.Current.Response.AddHeader("Vary", "Accept-Encoding");
        HttpContext.Current.Response.Buffer = true;
        Response.ContentType = objQMS.GetContentTypeByExtension(file.Extension.ToLower());

        Response.TransmitFile(file.FullName);
        Response.End();
    }
}