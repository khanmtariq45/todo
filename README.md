public string DecodeObfuscatedEmails(string htmlContent)
{
    try
    {
        var oregex = new System.Text.RegularExpressions.Regex(@"<(?<tag>[a-zA-Z]+)[^>]*data-cfemail=([\""']?)(?<cfemail>[a-fA-F0-9]+)\1[^>]*>(?<innerContent>.*?)</\k<tag>>", System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline);
        var omatchings = oregex.Matches(htmlContent);

        if (omatchings.Count > 0)
        {
            foreach (System.Text.RegularExpressions.Match match in omatchings)
            {
                string tag = match.Groups["tag"].Value;
                string cfemail = match.Groups["cfemail"].Value;
                string innerContent = match.Groups["innerContent"].Value;

                // Skip if the email is already decoded
                if (!string.IsNullOrEmpty(innerContent) && innerContent.Contains("@"))
                {
                    continue;
                }

                if (!string.IsNullOrEmpty(cfemail))
                {
                    string decodedEmail = DecodeEmail(cfemail);
                    string updatedTag;

                    if (tag.Equals("a", StringComparison.OrdinalIgnoreCase))
                    {
                        updatedTag = $@"<a href=""mailto:{decodedEmail}"">{decodedEmail}</a>";
                    }
                    else if (tag.Equals("span", StringComparison.OrdinalIgnoreCase))
                    {
                        updatedTag = $@"<!--email_off-->{decodedEmail}<!--/email_off-->";
                    }
                    else
                    {
                        continue;
                    }

                    htmlContent = htmlContent.Replace(match.Value, updatedTag);
                }
            }
        }
        return htmlContent;
    }
    catch (Exception ex)
    {
        // Log the exception and return the original content
        UDFLib.WriteExceptionLog(ex);
        return htmlContent;
    }
}

public string DecodeEmail(string obfuscatedEmail)
{
    if (obfuscatedEmail.Length < 2)
    {
        throw new ArgumentException("Invalid obfuscated email format.");
    }

    int key = Convert.ToInt32(obfuscatedEmail.Substring(0, 2), 16);
    var email = new System.Text.StringBuilder();

    try
    {
        for (int i = 2; i < obfuscatedEmail.Length; i += 2)
        {
            int charCode = Convert.ToInt32(obfuscatedEmail.Substring(i, 2), 16) ^ key;
            email.Append((char)charCode);
        }
    }
    catch (Exception ex)
    {
        UDFLib.WriteExceptionLog(ex);
        return string.Empty; // Return an empty string on error
    }

    return email.ToString();
}