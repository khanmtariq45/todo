using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using HtmlAgilityPack;
using MimeKit;
using System.Diagnostics;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Select conversion type:");
        Console.WriteLine("1. Convert .html / .htm to .mhtml or .mhtm");
        Console.WriteLine("2. Convert .docx to .mhtml");
        Console.Write("Enter your choice (1/2): ");
        
        string choice = Console.ReadLine().Trim();

        if (choice != "1" && choice != "2")
        {
            Console.WriteLine("Invalid choice. Exiting...");
            return;
        }

        Console.WriteLine("Please enter the folder path containing the files: ");
        string rootDirectory = Console.ReadLine();

        if (!Directory.Exists(rootDirectory))
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("Invalid directory path.");
            Console.ResetColor();
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

        IEnumerable<string> files;
        if (choice == "1")
        {
            files = Directory.EnumerateFiles(rootDirectory, "*.htm", SearchOption.AllDirectories)
                      .Union(Directory.EnumerateFiles(rootDirectory, "*.html", SearchOption.AllDirectories))
                      .Distinct(StringComparer.OrdinalIgnoreCase);
        }
        else
        {
            files = Directory.EnumerateFiles(rootDirectory, "*.docx", SearchOption.AllDirectories).Distinct(StringComparer.OrdinalIgnoreCase);
        }

        foreach (var originalFilePath in files)
        {
            if (processedFiles.Contains(originalFilePath))
                continue;

            processedFiles.Add(originalFilePath);

            try
            {
                ProcessFile(originalFilePath, logBuilder, rootDirectory, destinationRootDirectory, notConvertedLogFilePath, choice);
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
    }

    static void ProcessFile(string originalFilePath, StringBuilder logBuilder, string rootDirectory, string destinationRootDirectory, string notConvertedLogFilePath, string choice)
    {
        string fileName = Path.GetFileName(originalFilePath);
        string relativePath = GetRelativePath(rootDirectory, originalFilePath);
        string destinationDirectory = Path.Combine(destinationRootDirectory, Path.GetDirectoryName(relativePath));

        if (!Directory.Exists(destinationDirectory))
        {
            Directory.CreateDirectory(destinationDirectory);
        }

        if (choice == "2" && originalFilePath.EndsWith(".docx", StringComparison.OrdinalIgnoreCase))
        {
            string outputFilePath = Path.Combine(destinationDirectory, Path.GetFileNameWithoutExtension(originalFilePath) + ".mhtml");
            ConvertDocxToMhtml(originalFilePath, outputFilePath);
            logBuilder.AppendLine($"Processed File: {originalFilePath}, Converted: Yes, Output File: {outputFilePath}");
            return;
        }

        if (choice == "1" && (originalFilePath.EndsWith(".htm", StringComparison.OrdinalIgnoreCase) || originalFilePath.EndsWith(".html", StringComparison.OrdinalIgnoreCase)))
        {
            string cleanedHtml = PreprocessHtml(originalFilePath);
            cleanedHtml = DecodeObfuscatedEmails(cleanedHtml);

            string tempFolder = Path.Combine(destinationRootDirectory, "Temp");
            Directory.CreateDirectory(tempFolder);
            string tempHtmlFilePath = Path.Combine(tempFolder, "cleaned_temp.html");
            File.WriteAllText(tempHtmlFilePath, cleanedHtml);

            string outputMhtmlPath = Path.Combine(destinationDirectory, Path.GetFileNameWithoutExtension(fileName) + ".mhtml");
            ConvertHtmlToMhtml(tempHtmlFilePath, outputMhtmlPath);

            logBuilder.AppendLine($"Processed File: {originalFilePath}, Converted: Yes, Output File: {outputMhtmlPath}");
        }
    }

    static void ConvertDocxToMhtml(string docxFilePath, string outputFilePath)
    {
        string libreOfficePath = @"C:\Program Files\LibreOffice\program\soffice.exe";

        if (!File.Exists(libreOfficePath))
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("LibreOffice not found. Please install LibreOffice and try again.");
            Console.ResetColor();
            return;
        }

        string tempOutputDir = Path.GetDirectoryName(outputFilePath);
        string tempMhtmlPath = Path.Combine(tempOutputDir, Path.GetFileNameWithoutExtension(docxFilePath) + ".mhtml");

        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = libreOfficePath,
            Arguments = $"--headless --convert-to mhtml \"{docxFilePath}\" --outdir \"{tempOutputDir}\"",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using (Process process = new Process { StartInfo = startInfo })
        {
            process.Start();
            process.WaitForExit();
        }

        if (File.Exists(tempMhtmlPath))
        {
            File.Move(tempMhtmlPath, outputFilePath, true);
            Console.WriteLine($"Converted: {docxFilePath} -> {outputFilePath}");
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"Failed to convert {docxFilePath} to MHTML.");
            Console.ResetColor();
        }
    }

    static void ConvertHtmlToMhtml(string htmlFilePath, string outputFilePath)
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
        doc.Load(filePath, Encoding.UTF8);
        doc.OptionFixNestedTags = true;
        return doc.DocumentNode.OuterHtml;
    }

    public static string DecodeObfuscatedEmails(string htmlContent)
    {
        return htmlContent;  // No obfuscation decoding needed for now
    }

    static string GetRelativePath(string basePath, string fullPath)
    {
        Uri baseUri = new Uri(basePath);
        Uri fullUri = new Uri(fullPath);
        return Uri.UnescapeDataString(baseUri.MakeRelativeUri(fullUri).ToString().Replace('/', Path.DirectorySeparatorChar));
    }
}