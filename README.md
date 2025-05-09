using System;
using System.IO;
using Microsoft.Office.Interop.Word;
using System.Runtime.InteropServices;

class FileLinkExtractor
{
    static void Main(string[] args)
    {
        string folderPath = @"C:\Your\Target\Folder"; // Replace or pass via args

        Application wordApp = new Application();
        wordApp.Visible = false;

        foreach (string file in Directory.GetFiles(folderPath, "*.*", SearchOption.AllDirectories))
        {
            if (file.EndsWith(".doc") || file.EndsWith(".docx"))
            {
                Console.WriteLine($"\nScanning File: {file}");

                Document doc = null;
                try
                {
                    object fileName = file;
                    object readOnly = true;
                    object missing = Type.Missing;

                    doc = wordApp.Documents.Open(ref fileName, ReadOnly: ref readOnly, Visible: false);

                    foreach (Hyperlink link in doc.Hyperlinks)
                    {
                        string address = link.Address;
                        if (IsFileLink(address))
                        {
                            Console.WriteLine($"  File Link: {address}");
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  [ERROR] {ex.Message}");
                }
                finally
                {
                    if (doc != null)
                    {
                        doc.Close(false);
                        Marshal.ReleaseComObject(doc);
                    }
                }
            }
        }

        wordApp.Quit();
        Marshal.ReleaseComObject(wordApp);
    }

    static bool IsFileLink(string link)
    {
        if (string.IsNullOrWhiteSpace(link)) return false;

        link = link.Trim().ToLower();

        // Filter out web and email links
        if (link.StartsWith("http://") || link.StartsWith("https://") || link.StartsWith("mailto:"))
            return false;

        // Include UNC paths, file://, and relative/absolute local paths
        return link.StartsWith("file://") ||
               link.StartsWith("\\\\") || // UNC
               Path.IsPathRooted(link);   // Local absolute
    }
}