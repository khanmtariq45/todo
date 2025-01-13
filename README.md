using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using HtmlAgilityPack;
using Spire.Doc;
using System.Data.SqlClient;
using System.Threading.Tasks;

class Program
{
    static void Main(string[] args)
    {
        // Ask if the console app is being run locally or on the server
        Console.WriteLine("Is the console app being run locally or on the server? (local/server): ");
        string environment = Console.ReadLine().Trim().ToLower();

        string connectionString;
        if (environment == "local")
        {
            connectionString = "data source=dev.c5owyuw64shd.ap-south-1.rds.amazonaws.com,1982;database=JIBE_Main;uid=j2;pwd=123456;max pool size=200;";
        }
        else
        {
            Console.WriteLine("Please enter the connection string for the server: ");
            connectionString = Console.ReadLine();
        }

        // Specify the root directory to start with
        Console.WriteLine("Please enter the folder path: ");
        string rootDirectory = Console.ReadLine();
        //@"D:\TestFileTypeConversion";

        StringBuilder logBuilder = new StringBuilder();
        string destinationFilePath = @"C:\Logs\FileLogs.txt";

        // Ensure the Logs directory exists
        Directory.CreateDirectory(@"C:\Logs");

        // Get all .htm and .html files in the directory and subdirectories
        List<string> files = Directory.GetFiles(rootDirectory, "*.htm", SearchOption.AllDirectories).ToList();
        files.AddRange(Directory.GetFiles(rootDirectory, "*.html", SearchOption.AllDirectories));

        // List of file paths to process
        string[] filePaths = files.ToArray();
        HashSet<string> processedFiles = new HashSet<string>();

        foreach (string originalFilePath in filePaths)
        {
            string filePath = originalFilePath;
            string fileName = Path.GetFileName(originalFilePath);
            string updatedFileName = null;

            try
            {
                string getfilenamewitoutExtension = GetDirectoryPath(originalFilePath);

                // Check if the file name exists in the database 
                updatedFileName = GetFileNameFromDatabase(fileName, connectionString);
                if (!string.IsNullOrEmpty(updatedFileName))
                {
                    // Rename the original file to the name fetched from the database
                    string newFilePath = Path.Combine(getfilenamewitoutExtension, updatedFileName + Path.GetExtension(originalFilePath));
                    File.Move(originalFilePath, newFilePath);
                    filePath = newFilePath;
                    fileName = updatedFileName + Path.GetExtension(originalFilePath);
                }

                // Ensure the file is not processed again
                if (processedFiles.Contains(filePath))
                {
                    continue;
                }
                processedFiles.Add(filePath);

                // Preprocess the HTML file
                string cleanedHtml = PreprocessHtml(filePath);
                cleanedHtml = DecodeObfuscatedEmails(cleanedHtml);
                string pattern = @"href=""file://[^""]*?(/#/.*?)""";
                string replacement = @"href=""$1""";
                cleanedHtml = System.Text.RegularExpressions.Regex.Replace(cleanedHtml, pattern, replacement);
                cleanedHtml = cleanedHtml.Replace("’", "'").Replace("‘", "'").Replace("“", "\"").Replace("”", "\"").Replace("  ", " ");
                string tempFolder = @"C:\Beautify HTML\";
                string tempHtmlFilePath = Path.Combine(tempFolder, "cleaned_temp.html");
                Directory.CreateDirectory(tempFolder);
                File.WriteAllText(tempHtmlFilePath, cleanedHtml);

                // Create a new Document instance
                Document document = new Document();

                // Load the cleaned HTML file
                document.LoadFromFile(tempHtmlFilePath);

                // Save the document as .docx
                string outputFilePath = Path.Combine(getfilenamewitoutExtension, Path.GetFileNameWithoutExtension(fileName) + ".docx");
                document.SaveToFile(outputFilePath, FileFormat.Docx2013);

                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"Converted {filePath} to {outputFilePath} successfully.");
                logBuilder.AppendLine($"File Name in File Explorer: {originalFilePath}");
                logBuilder.AppendLine($"File Name Fetched from DB: {updatedFileName ?? "Not Found"}");
                logBuilder.AppendLine($"Converted: Yes");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"An error occurred while processing File Name: {filePath}, Exception: {ex.Message}");
                logBuilder.AppendLine($"File Name in File Explorer: {filePath}");
                logBuilder.AppendLine($"File Name Fetched from DB: {updatedFileName ?? "Not Found"}");
                logBuilder.AppendLine($"Converted: No");
                logBuilder.AppendLine($"Exception: {ex.Message}");
            }
        }

        File.WriteAllText(destinationFilePath, logBuilder.ToString());
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("Word file created successfully.");
        Console.ReadKey();
    }

    static string GetDirectoryPath(string filePath)
    {
        return Path.GetDirectoryName(filePath);
    }

    static string GetFullPathWithoutExtension(string filePath)
    {
        string directory = Path.GetDirectoryName(filePath);
        string fileNameWithoutExtension = Path.GetFileNameWithoutExtension(filePath);
        return Path.Combine(directory, fileNameWithoutExtension);
    }

    static string PreprocessHtml(string filePath)
    {
        HtmlDocument doc = new HtmlDocument();
        try
        {
            doc.Load(filePath);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error loading HTML file: {filePath}, Exception: {ex.Message}");
            throw;
        }

        // Fix common HTML issues
        doc.OptionFixNestedTags = true;
        // Remove problematic tags
        RemoveProblematicTags(doc);

        // Return the cleaned HTML as a string
        using (StringWriter writer = new StringWriter())
        {
            doc.Save(writer);
            return writer.ToString();
        }
    }

    static void RemoveProblematicTags(HtmlDocument doc)
    {
        // Example: Remove all <a> tags that might be causing issues
        //var nodes = doc.DocumentNode.SelectNodes("//a");
        //if (nodes != null)
        //{
        //    foreach (var node in nodes)
        //    {
        //        node.ParentNode.RemoveChild(node, true);
        //    }
        //}
        //var nodes = doc.DocumentNode.SelectNodes("//a[not(@href) or contains(@href, 'problematic-url')]");
        //if (nodes != null)
        //{
        //    foreach (var node in nodes)
        //    { node.ParentNode.RemoveChild(node, true);
        //    }
        //}
    }

    public static string DecodeObfuscatedEmails(string htmlContent)
    {
        try
        {
            var oregex = new System.Text.RegularExpressions.Regex(@"<(?<tag>[a-zA-Z]+)[^>]*data-cfemail=([\""']?)(?<cfemail>[a-fA-F0-9]+)\1[^>]*>(?<innerContent>.*?)</\k<tag>>", System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline);
            var omatchings = oregex.Matches(htmlContent);
            if (omatchings.Count > 0)
            {
                foreach (System.Text.RegularExpressions.Match match in omatchings)
                {
                    string tag = match.Groups["tag"].Value;
                    string cfemail = match.Groups["cfemail"].Value;
                    string innerContent = match.Groups["innerContent"].Value;
                    if (!string.IsNullOrEmpty(cfemail))
                    {
                        string decodedEmail = DecodeEmail(cfemail);
                        string updatedTag;
                        if (tag.Equals("a", StringComparison.OrdinalIgnoreCase))
                        {
                            updatedTag = @"<a href=\\""mailto:" + decodedEmail + "\\>" + decodedEmail + "</a>";
                        }
                        else if (tag.Equals("span", StringComparison.OrdinalIgnoreCase))
                        {
                            updatedTag = decodedEmail;
                        }
                        else
                        {
                            continue;
                        }
                        htmlContent = htmlContent.Replace(match.Value, updatedTag);
                    }
                    else
                    {
                        Console.WriteLine("No obfuscated email found in the match. cfemail: " + "(" + cfemail + ") - tag: " + tag + " - innerContent: " + innerContent);
                    }
                }
            }
            return htmlContent;
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex);
            return htmlContent;
        }
    }

    public static string DecodeEmail(string obfuscatedEmail)
    {
        // Ensure the obfuscatedEmail has at least 2 characters for the key
        if (obfuscatedEmail.Length < 2)
        {
            throw new ArgumentException("Invalid obfuscated email format.");
        }

        int key = Convert.ToInt32(obfuscatedEmail.Substring(0, 2), 16);
        StringBuilder email = new StringBuilder();

        try
        {
            for (int i = 2; i < obfuscatedEmail.Length; i += 2)
            {
                // Ensure there are enough characters left for a valid substring
                if (i + 2 <= obfuscatedEmail.Length)
                {
                    int charCode = Convert.ToInt32(obfuscatedEmail.Substring(i, 2), 16) ^ key;
                    email.Append((char)charCode);
                }
                else
                {
                    Console.WriteLine("Invalid obfuscated email format.");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex);
            return string.Empty; // Return an empty string or handle the error as needed
        }
        return email.ToString();
    }

    public static string GetFileNameFromDatabase(string fileName, string connectionString)
    {
        string query = "SELECT LogFileID FROM qmsdtlsfile_log WHERE FilePath like '%" + fileName + "%'";

        using (SqlConnection connection = new SqlConnection(connectionString))
        {
            SqlCommand command = new SqlCommand(query, connection);
            command.Parameters.AddWithValue("@fileName", fileName);
            connection.Open();
            object result = command.ExecuteScalar();
            if (result != null)
            {
                return result.ToString();
            }
            else
            {
                return null;
            }
        }
    }
}
