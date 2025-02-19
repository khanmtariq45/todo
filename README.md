using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Microsoft.Office.Interop.Word;

class Program
{
    static void Main(string[] args)
    {
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
        string logFilePath = Path.Combine(destinationRootDirectory, "FileLogs.txt");
        string notConvertedLogFilePath = Path.Combine(destinationRootDirectory, "NotConvertedFiles.txt");

        HashSet<string> processedFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Get all .doc and .docx files
        var files = Directory.EnumerateFiles(rootDirectory, "*.doc", SearchOption.AllDirectories)
                              .Union(Directory.EnumerateFiles(rootDirectory, "*.docx", SearchOption.AllDirectories))
                              .Distinct(StringComparer.OrdinalIgnoreCase);

        foreach (var originalFilePath in files)
        {
            if (processedFiles.Contains(originalFilePath))
                continue;

            processedFiles.Add(originalFilePath);

            try
            {
                string outputFilePath = Path.Combine(destinationRootDirectory, Path.GetFileNameWithoutExtension(originalFilePath) + ".mhtml");
                bool success = ConvertWordToMhtml(originalFilePath, outputFilePath);

                if (success)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine($"Successfully processed: {originalFilePath}");
                    logBuilder.AppendLine($"Processed File: {originalFilePath} → Converted to {outputFilePath}");
                }
                else
                {
                    File.AppendAllText(notConvertedLogFilePath, originalFilePath + Environment.NewLine);
                }
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

    static bool ConvertWordToMhtml(string inputFilePath, string outputFilePath)
    {
        Application wordApp = new Application();
        Document doc = null;

        try
        {
            doc = wordApp.Documents.Open(inputFilePath, ReadOnly: false, Visible: false);

            // Force UTF-8 encoding to prevent extra characters
            doc.WebOptions.Encoding = MsoEncoding.msoEncodingUTF8;
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
}