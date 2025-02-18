using System;
using System.Data.SqlClient;
using System.IO;
using System.Threading;
using System.Windows.Forms;
using SHDocVw;

namespace HtmlToMhtmlConverter
{
    class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            if (args.Length < 2)
            {
                Console.WriteLine("Usage: HtmlToMhtmlConverter.exe <baseFolderPath> <connectionString>");
                return;
            }

            string baseFolderPath = args[0];
            string connectionString = args[1];

            if (!Directory.Exists(baseFolderPath))
            {
                Console.WriteLine("The provided base folder path does not exist.");
                return;
            }

            try
            {
                ProcessFilesFromDatabase(baseFolderPath, connectionString);
                Console.WriteLine("Conversion completed!");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
            }
        }

        static void ProcessFilesFromDatabase(string baseFolderPath, string connectionString)
        {
            using (var connection = new SqlConnection(connectionString))
            {
                connection.Open();
                string query = "SELECT filepath FROM qmsdtlsfile_log WHERE active_status = 1";
                using (var command = new SqlCommand(query, connection))
                using (var reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string filePath = reader["filepath"].ToString();
                        string fullFilePath = Path.Combine(baseFolderPath, filePath);

                        if (File.Exists(fullFilePath) && (fullFilePath.EndsWith(".html") || fullFilePath.EndsWith(".htm")))
                        {
                            string outputFilePath = GetOutputFilePath(baseFolderPath, filePath);
                            ConvertHtmlToMhtml(fullFilePath, outputFilePath);
                        }
                        else
                        {
                            Console.WriteLine($"File not found or not an HTML file: {fullFilePath}");
                        }
                    }
                }
            }
        }

        static string GetOutputFilePath(string baseFolderPath, string filePath)
        {
            string outputBaseFolder = Path.Combine(baseFolderPath, "ConvertedFiles");
            string fullOutputPath = Path.Combine(outputBaseFolder, filePath);
            string outputFilePath = Path.ChangeExtension(fullOutputPath, fullOutputPath.EndsWith(".html") ? ".mhtml" : ".mht");

            // Ensure the output directory exists
            Directory.CreateDirectory(Path.GetDirectoryName(outputFilePath));

            return outputFilePath;
        }

        static void ConvertHtmlToMhtml(string inputPath, string outputPath)
        {
            Console.WriteLine($"Converting: {inputPath}");

            var autoResetEvent = new AutoResetEvent(false);
            Exception threadException = null;

            Thread staThread = new Thread(() =>
            {
                try
                {
                    using (var form = new Form())
                    using (var browser = new WebBrowser())
                    {
                        form.ShowInTaskbar = false;
                        form.WindowState = FormWindowState.Minimized;
                        browser.Silent = true;
                        browser.DocumentCompleted += (sender, e) =>
                        {
                            if (browser.ReadyState == WebBrowserReadyState.Complete)
                            {
                                try
                                {
                                    object fileName = outputPath;
                                    object fileType = 9; // MHTML format
                                    browser.ExecWB(OLECMDID.OLECMDID_SAVEAS,
                                                  OLECMDEXECOPT.OLECMDEXECOPT_DONTPROMPTUSER,
                                                  ref fileName,
                                                  ref fileType);
                                }
                                finally
                                {
                                    autoResetEvent.Set();
                                    form.Close();
                                }
                            }
                        };

                        browser.Navigate(new Uri(inputPath));
                        form.Controls.Add(browser);
                        Application.Run(form);
                    }
                }
                catch (Exception ex)
                {
                    threadException = ex;
                    autoResetEvent.Set();
                }
            });

            staThread.SetApartmentState(ApartmentState.STA);
            staThread.Start();

            if (!autoResetEvent.WaitOne(TimeSpan.FromSeconds(30)))
            {
                Console.WriteLine($"Timeout converting {inputPath}");
            }

            staThread.Join();

            if (threadException != null)
            {
                Console.WriteLine($"Error converting {inputPath}: {threadException.Message}");
            }
        }
    }
}