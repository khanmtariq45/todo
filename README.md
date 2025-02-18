is it okay or need any updation ? 


using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using PuppeteerSharp;

class Program
{
    static async Task Main()
    {
        Console.WriteLine("Choose conversion type:");
        Console.WriteLine("1. HTML/HTM to MHTML");
        Console.WriteLine("2. Word/DOC/DOCX to MHTML");
        Console.Write("Enter choice (1/2): ");
        string choice = Console.ReadLine();

        Console.WriteLine("Enter source file path:");
        string sourceFile = Console.ReadLine();

        if (!File.Exists(sourceFile))
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("Error: File not found.");
            Console.ResetColor();
            return;
        }

        string destinationFile = Path.ChangeExtension(sourceFile, ".mhtml");

        try
        {
            if (choice == "1")
            {
                await ConvertHtmlToMhtml(sourceFile, destinationFile);
            }
            else if (choice == "2")
            {
                ConvertWordToMhtml(sourceFile, destinationFile);
            }
            else
            {
                Console.WriteLine("Invalid choice.");
                return;
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"✅ Conversion successful: {destinationFile}");
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"❌ Conversion failed: {ex.Message}");
        }
        finally
        {
            Console.ResetColor();
        }
    }

    /// <summary>
    /// Converts HTML/HTM to MHTML while preserving images, links, videos, and special characters.
    /// Uses Puppeteer-Sharp for full browser rendering.
    /// </summary>
    static async Task ConvertHtmlToMhtml(string htmlPath, string outputPath)
    {
        Console.WriteLine("Initializing browser...");
        await new BrowserFetcher().DownloadAsync(BrowserFetcher.DefaultRevision);

        using var browser = await Puppeteer.LaunchAsync(new LaunchOptions { Headless = true });
        using var page = await browser.NewPageAsync();

        Console.WriteLine($"Processing: {htmlPath}");
        string content = await File.ReadAllTextAsync(htmlPath);
        await page.SetContentAsync(content);

        var mhtml = await page.EvaluateFunctionAsync<string>("() => document.documentElement.outerHTML");
        await File.WriteAllTextAsync(outputPath, mhtml);
    }

    /// <summary>
    /// Converts Word DOC/DOCX to MHTML using LibreOffice CLI.
    /// </summary>
    static void ConvertWordToMhtml(string wordPath, string outputPath)
    {
        string libreOfficePath = GetLibreOfficePath();
        if (string.IsNullOrEmpty(libreOfficePath))
        {
            throw new Exception("LibreOffice not found. Please install it from https://www.libreoffice.org/download/");
        }

        Console.WriteLine($"Processing: {wordPath}");

        string args = $"--headless --convert-to mhtml \"{wordPath}\" --outdir \"{Path.GetDirectoryName(outputPath)}\"";

        var process = new Process()
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = libreOfficePath,
                Arguments = args,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };

        process.Start();
        process.WaitForExit();
    }

    /// <summary>
    /// Detects LibreOffice installation path for different operating systems.
    /// </summary>
    static string GetLibreOfficePath()
    {
        if (OperatingSystem.IsWindows())
            return @"C:\Program Files\LibreOffice\program\soffice.exe";

        if (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS())
            return "/usr/bin/soffice"; // Common path for Linux/macOS

        return null;
    }
}