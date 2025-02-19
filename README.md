using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
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
        string notConvertedLogFilePath = Path.Combine(destinationRootDirectory, "FailedConversions.txt");

        HashSet<string> processedFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var files = Directory.EnumerateFiles(rootDirectory, "*.docx", SearchOption.AllDirectories);

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
        Console.WriteLine("Conversion process completed. Logs saved to " + logFilePath);
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

        string updatedFileName = GetFileNameFromDatabase(fileName, connectionString);
        if (string.IsNullOrEmpty(updatedFileName))
        {
            updatedFileName = Path.GetFileNameWithoutExtension(fileName);
        }

        Document document = new Document();
        document.LoadFromFile(originalFilePath);

        string outputFilePath = Path.Combine(destinationDirectory, $"{updatedFileName}.mhtml");
        document.SaveToFile(outputFilePath, FileFormat.MHtml);

        logBuilder.AppendLine($"Converted: {originalFilePath} => {outputFilePath}");
    }

    static string GetFileNameFromDatabase(string fileName, string connectionString)
    {
        string cleanFileName = Path.GetFileNameWithoutExtension(fileName);
        string query = "SELECT LogFileID FROM qmsdtlsfile_log WHERE FilePath LIKE @fileName";
        using (var connection = new SqlConnection(connectionString))
        {
            var command = new SqlCommand(query, connection);
            command.Parameters.AddWithValue("@fileName", "%" + cleanFileName + "%");
            try
            {
                connection.Open();
                var result = command.ExecuteScalar();
                return result?.ToString();
            }
            catch
            {
                return null;
            }
        }
    }

    static string GetRelativePath(string basePath, string fullPath)
    {
        Uri baseUri = new Uri(basePath);
        Uri fullUri = new Uri(fullPath);
        return Uri.UnescapeDataString(baseUri.MakeRelativeUri(fullUri).ToString().Replace('/', Path.DirectorySeparatorChar));
    }
}