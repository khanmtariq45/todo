using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using HtmlAgilityPack;
using MimeKit;
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

        Console.WriteLine("Please enter the destination folder path for MHTML files: ");
        string destinationRootDirectory = Console.ReadLine();

        if (!Directory.Exists(destinationRootDirectory))
        {
            Directory.CreateDirectory(destinationRootDirectory);
        }

        StringBuilder logBuilder = new StringBuilder();
        string logFilePath = Path.Combine(destinationRootDirectory, "FileLogs.txt");
        string notConvertedLogFilePath = Path.Combine(destinationRootDirectory, "NotConvertedFiles.txt");

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
                ProcessFile(originalFilePath, connectionString, logBuilder, rootDirectory, destinationRootDirectory, notConvertedLogFilePath);
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

    static void ProcessFile(string originalFilePath, string connectionString, StringBuilder logBuilder, string rootDirectory, string destinationRootDirectory, string notConvertedLogFilePath)
    {
        string fileName = Path.GetFileName(originalFilePath);
        string relativePath = GetRelativePath(rootDirectory, originalFilePath);
        string destinationDirectory = Path.Combine(destinationRootDirectory, Path.GetDirectoryName(relativePath));

        if (!Directory.Exists(destinationDirectory))
        {
            Directory.CreateDirectory(destinationDirectory);
        }

        string updatedFileName = fileName;
        if (string.IsNullOrEmpty(updatedFileName))
        {
            File.AppendAllText(notConvertedLogFilePath, originalFilePath + Environment.NewLine);
            return;
        }

        // Process HTML content in chunks to handle large files
        string cleanedHtml = PreprocessHtml(originalFilePath);

        // Correct URLs
        cleanedHtml = Regex.Replace(cleanedHtml, @"href=""file://[^""]*?(/#/.*?)""", @"href=""$1""");
        cleanedHtml = Regex.Replace(cleanedHtml, @"href=""([^""]*?)#\\qms\?(.*?)""", @"href=""$1/#/qms?$2""");

        // Email Un-Protected
        cleanedHtml = DecodeObfuscatedEmails(cleanedHtml);

        // Write cleaned HTML to a temporary file
        string tempFolder = Path.Combine(destinationRootDirectory, "Temp");
        Directory.CreateDirectory(tempFolder);
        string tempHtmlFilePath = Path.Combine(tempFolder, "cleaned_temp.html");
        File.WriteAllText(tempHtmlFilePath, cleanedHtml);

        // Convert to MHTML
        string outputFilePath = Path.Combine(destinationDirectory, Path.GetFileNameWithoutExtension(updatedFileName) + (Path.GetExtension(updatedFileName).Equals(".htm", StringComparison.OrdinalIgnoreCase) ? ".mhtm" : ".mhtml"));
        ConvertToMhtml(tempHtmlFilePath, outputFilePath);

        logBuilder.AppendLine($"Processed File: {originalFilePath}, Converted: Yes, Output File: {outputFilePath}");
    }

    static void ConvertToMhtml(string htmlFilePath, string outputFilePath)
    {
        var message = new MimeMessage();
        var body = new TextPart("html")
        {
            Text = File.ReadAllText(htmlFilePath)
        };

        var multipart = new Multipart("related")
        {
            body
        };

        message.Body = multipart;

        using (var stream = File.Create(outputFilePath))
        {
            message.WriteTo(stream);
        }
    }

    static string PreprocessHtml(string filePath)
    {
        var doc = new HtmlDocument();
        using (var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read))
        {
            doc.Load(stream, Encoding.UTF8);
        }

        doc.OptionFixNestedTags = true;
        RemoveProblematicTags(doc);

        using (var writer = new StringWriter())
        {
            doc.Save(writer);
            return writer.ToString();
        }
    }

    static void RemoveProblematicTags(HtmlDocument doc)
    {
        // Example: Remove <script> tags
        var scriptNodes = doc.DocumentNode.SelectNodes("//script");
        if (scriptNodes != null)
        {
            foreach (var node in scriptNodes)
            {
                node.Remove();
            }
        }
    }

    public static string DecodeObfuscatedEmails(string htmlContent)
    {
        try
        {
            var regex = new Regex(@"<(?<tag>[a-zA-Z]+)[^>]*data-cfemail=([\""']?)(?<cfemail>[a-fA-F0-9]+)\1[^>]*>(?<innerContent>.*?)</\k<tag>>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
            var matches = regex.Matches(htmlContent);
            if (matches.Count > 0)
            {
                foreach (Match match in matches)
                {
                    string tag = match.Groups["tag"].Value;
                    string cfemail = match.Groups["cfemail"].Value;
                    string innerContent = match.Groups["innerContent"].Value;
                    if (!string.IsNullOrEmpty(cfemail))
                    {
                        string decodedEmail = DecodeEmail(cfemail);
                        string updatedTag;
                        if (tag.Equals("a", StringComparison.OrdinalIgnoreCase) || tag.Equals("span", StringComparison.OrdinalIgnoreCase))
                        {
                            updatedTag = @"<!--email_off-->" + decodedEmail + "<!--/email_off-->";
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
            return string.Empty;
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

    static string GetRelativePath(string basePath, string fullPath)
    {
        Uri baseUri = new Uri(basePath);
        Uri fullUri = new Uri(fullPath);
        return Uri.UnescapeDataString(baseUri.MakeRelativeUri(fullUri).ToString().Replace('/', Path.DirectorySeparatorChar));
    }
}