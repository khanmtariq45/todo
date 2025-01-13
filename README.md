static void ProcessFile(string originalFilePath, string connectionString, StringBuilder logBuilder)
{
    string fileName = Path.GetFileName(originalFilePath);
    string updatedFileName = GetFileNameFromDatabase(fileName, connectionString);

    string baseOutputDirectory = @"C:\ProcessedFiles";
    Directory.CreateDirectory(baseOutputDirectory); // Ensure the base output directory exists.

    string relativePath = Path.GetRelativePath(
        Directory.GetParent(originalFilePath).FullName,
        originalFilePath);

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

static string Path.GetRelativePath(string rootPath, string fullPath)
{
    Uri rootUri = new Uri(rootPath + Path.DirectorySeparatorChar);
    Uri fullUri = new Uri(fullPath);
    return Uri.UnescapeDataString(rootUri.MakeRelativeUri(fullUri).ToString())
        .Replace('/', Path.DirectorySeparatorChar);
}