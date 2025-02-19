using System;
using System.IO;
using System.Text;
using Spire.Doc;

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
        string logFilePath = Path.Combine(destinationRootDirectory, "ConversionLog.txt");

        var files = Directory.EnumerateFiles(rootDirectory, "*.docx", SearchOption.AllDirectories);

        foreach (var originalFilePath in files)
        {
            try
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"Processing: {originalFilePath}");

                // Load the Word document
                Document document = new Document();
                document.LoadFromFile(originalFilePath);

                // Define the output file path
                string fileName = Path.GetFileNameWithoutExtension(originalFilePath);
                string outputFilePath = Path.Combine(destinationRootDirectory, $"{fileName}.mhtml");

                // Save the document as MHTML
                document.SaveToFile(outputFilePath, FileFormat.MHtml);

                // Verify if the file was created
                if (File.Exists(outputFilePath))
                {
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine($"File successfully created: {outputFilePath}");
                    logBuilder.AppendLine($"Converted: {originalFilePath} => {outputFilePath}");
                }
                else
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"File not created: {outputFilePath}");
                    logBuilder.AppendLine($"Failed to create file: {outputFilePath}");
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

        // Save logs to file
        File.WriteAllText(logFilePath, logBuilder.ToString());
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("Conversion process completed. Logs saved to " + logFilePath);
        Console.ResetColor();
        Console.WriteLine("Press any key to exit...");
        Console.ReadKey();
    }
}