using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.Word;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Is the console app being run locally or on the server? (local/server): ");
        string environment = Console.ReadLine().Trim().ToLower();

        Console.WriteLine("Please enter the folder path containing Word files: ");
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
        string logFilePath = Path.Combine(destinationRootDirectory, "ConversionLogs.txt");
        string notConvertedLogFilePath = Path.Combine(destinationRootDirectory, "NotConvertedFiles.txt");

        HashSet<string> processedFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var wordFiles = Directory.EnumerateFiles(rootDirectory, "*.docx", SearchOption.AllDirectories)
                                 .Union(Directory.EnumerateFiles(rootDirectory, "*.doc", SearchOption.AllDirectories))
                                 .Distinct(StringComparer.OrdinalIgnoreCase);

        foreach (var originalFilePath in wordFiles)
        {
            if (processedFiles.Contains(originalFilePath))
                continue;

            processedFiles.Add(originalFilePath);

            try
            {
                ProcessFile(originalFilePath, logBuilder, rootDirectory, destinationRootDirectory, notConvertedLogFilePath);
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

    static void ProcessFile(string originalFilePath, StringBuilder logBuilder, string rootDirectory, string destinationRootDirectory, string notConvertedLogFilePath)
    {
        string fileName = Path.GetFileNameWithoutExtension(originalFilePath); // Remove extension
        string relativePath = GetRelativePath(rootDirectory, originalFilePath);
        string destinationDirectory = Path.Combine(destinationRootDirectory, Path.GetDirectoryName(relativePath));

        if (!Directory.Exists(destinationDirectory))
        {
            Directory.CreateDirectory(destinationDirectory);
        }

        string outputFilePath = Path.Combine(destinationDirectory, fileName + ".mhtml");

        bool success = ConvertWordToMhtml(originalFilePath, outputFilePath);

        if (success)
        {
            logBuilder.AppendLine($"Processed File: {originalFilePath}, Converted: Yes, Output File: {outputFilePath}");
        }
        else
        {
            File.AppendAllText(notConvertedLogFilePath, originalFilePath + Environment.NewLine);
        }
    }

    static bool ConvertWordToMhtml(string inputFilePath, string outputFilePath)
    {
        Application wordApp = new Application();
        Document doc = null;

        try
        {
            doc = wordApp.Documents.Open(inputFilePath, ReadOnly: false, Visible: false);
            doc.SaveAs2(outputFilePath, WdSaveFormat.wdFormatWebArchive);
            Console.WriteLine($"Converted: {inputFilePath} → {outputFilePath}");
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error converting {inputFilePath} to MHTML: {ex.Message}");
            return false;
        }
        finally
        {
            doc?.Close(false);
            wordApp.Quit();
            System.Runtime.InteropServices.Marshal.ReleaseComObject(doc);
            System.Runtime.InteropServices.Marshal.ReleaseComObject(wordApp);
        }
    }

    static string GetRelativePath(string basePath, string fullPath)
    {
        Uri baseUri = new Uri(basePath);
        Uri fullUri = new Uri(fullPath);
        return Uri.UnescapeDataString(baseUri.MakeRelativeUri(fullUri).ToString().Replace('/', Path.DirectorySeparatorChar));
    }
}