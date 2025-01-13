using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using HtmlAgilityPack;
using Spire.Doc;
using System.Data.SqlClient;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Is the console app being run locally or on the server? (local/server): ");
        string environment = Console.ReadLine().Trim().ToLower();

        string connectionString = environment == "local"
            ? "data source=dev.c5owyuw64shd.ap-south-1.rds.amazonaws.com,1982;database=JIBE_Main;uid=j2;pwd=123456;max pool size=200;"
            : GetConnectionStringFromUser();

        Console.WriteLine("Please enter the folder path: ");
        string rootDirectory = Console.ReadLine();

        if (!Directory.Exists(rootDirectory))
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("Invalid directory path.");
            Console.ResetColor();
            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
            return;
        }

        StringBuilder logBuilder = new StringBuilder();
        string logFilePath = @"C:\Logs\FileLogs.txt";
        Directory.CreateDirectory(@"C:\Logs");

        HashSet<string> processedFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Get all unique .htm and .html files
        var files = Directory.EnumerateFiles(rootDirectory, "*.htm", SearchOption.AllDirectories)
                              .Union(Directory.EnumerateFiles(rootDirectory, "*.html", SearchOption.AllDirectories))
                              .Distinct(StringComparer.OrdinalIgnoreCase);

        foreach (var originalFilePath in files)
        {
            if (processedFiles.Contains(originalFilePath))
                continue;

            processedFiles.Add(originalFilePath);

            try
            {
                ProcessFile(originalFilePath, rootDirectory, connectionString, logBuilder);
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"Successfully processed: {originalFilePath}");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"Error processing file {originalFilePath}: {ex.Message}");
                logBuilder.AppendLine($"Error processing file {originalFilePath}: {ex.Message}");
            }
            finally
            {
                Console.ResetColor();
            }
        }

        File.WriteAllText(logFilePath, logBuilder.ToString());
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("Processing completed. Logs saved to " + logFilePath);
        Console.ResetColor();
        Console.WriteLine("Press any key to exit...");
        Console.ReadKey();
    }

    static string GetConnectionStringFromUser()
    {
        Console.WriteLine("Please enter the connection string for the server: ");
        return Console.ReadLine();
    }

    static void ProcessFile(string originalFilePath, string rootDirectory, string connectionString, StringBuilder logBuilder)
    {
        string fileName = Path.GetFileName(originalFilePath);
        string updatedFileName = GetFileNameFromDatabase(fileName, connectionString);

        string baseOutputDirectory = @"C:\ProcessedFiles";
        Directory.CreateDirectory(baseOutputDirectory); // Ensure the base output directory exists.

        string relativePath = GetRelativePath(rootDirectory, originalFilePath);
        string outputDirectory = Path.Combine(baseOutputDirectory, Path.GetDirectoryName(relativePath));
        Directory.CreateDirectory(outputDirectory); // Create the replicated directory structure.

        if (!string.IsNullOrEmpty(updatedFileName))
        {
            string newFilePath = Path.Combine(outputDirectory, updatedFileName + Path.GetExtension(originalFilePath));
            File.Move(originalFilePath, newFilePath);
            originalFilePath = newFilePath;
            fileName = updatedFileName + Path.GetExtension(originalFilePath);
        }

        string cleanedHtml = PreprocessHtml(originalFilePath);
        cleanedHtml = DecodeObfuscatedEmails(cleanedHtml);

        string tempHtmlFilePath = Path.Combine(outputDirectory, "cleaned_temp.html");
        File.WriteAllText(tempHtmlFilePath, cleanedHtml);

        Document document = new Document();
        document.LoadFromFile(tempHtmlFilePath);

        string outputFilePath = Path.Combine(outputDirectory, Path.GetFileNameWithoutExtension(fileName) + ".docx");
        document.SaveToFile(outputFilePath, FileFormat.Docx2013);

        logBuilder.AppendLine($"Processed File: {originalFilePath}, Converted: Yes, Output File: {outputFilePath}");
    }

    static string PreprocessHtml(string filePath)
    {
        HtmlDocument doc = new HtmlDocument();
        doc.Load(filePath);
        doc.OptionFixNestedTags = true;

        RemoveProblematicTags(doc);

        using (StringWriter writer = new StringWriter())
        {
            doc.Save(writer);
            return writer.ToString();
        }
    }

    static void RemoveProblematicTags(HtmlDocument doc)
    {
        var nodes = doc.DocumentNode.SelectNodes("//a[not(@href)]");
        if (nodes != null)
        {
            foreach (var node in nodes)
            {
                node.Remove();
            }
        }
    }

    static string DecodeObfuscatedEmails(string htmlContent)
    {
        var regex = new System.Text.RegularExpressions.Regex(
            @"<([a-zA-Z]+)[^>]*data-cfemail=""(?<cfemail>[a-fA-F0-9]+)""[^>]*>(?<content>.*?)</\1>",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        return regex.Replace(htmlContent, match =>
        {
            string cfemail = match.Groups["cfemail"].Value;
            string decodedEmail = DecodeEmail(cfemail);
            return $"<a href=\"mailto:{decodedEmail}\">{decodedEmail}</a>";
        });
    }

    static string DecodeEmail(string obfuscatedEmail)
    {
        int key = Convert.ToInt32(obfuscatedEmail.Substring(0, 2), 16);
        var email = new StringBuilder();

        for (int i = 2; i < obfuscatedEmail.Length; i += 2)
        {
            int charCode = Convert.ToInt32(obfuscatedEmail.Substring(i, 2), 16) ^ key;
            email.Append((char)charCode);
        }

        return email.ToString();
    }

    static string GetFileNameFromDatabase(string fileName, string connectionString)
    {
        string query = "SELECT LogFileID FROM qmsdtlsfile_log WHERE FilePath LIKE @fileName";
        using (var connection = new SqlConnection(connectionString))
        {
            var command = new SqlCommand(query, connection);
            command.Parameters.AddWithValue("@fileName", "%" + fileName + "%");
            connection.Open();
            return command.ExecuteScalar()?.ToString();
        }
    }

    static string GetRelativePath(string rootPath, string fullPath)
    {
        Uri rootUri = new Uri(rootPath + Path.DirectorySeparatorChar);
        Uri fullUri = new Uri(fullPath);
        return Uri.UnescapeDataString(rootUri.MakeRelativeUri(fullUri).ToString())
            .Replace('/', Path.DirectorySeparatorChar);
    }
}