public string DecodeObfuscatedEmails(string htmlContent)
    {
        try
        {
            var oregex = new System.Text.RegularExpressions.Regex(@"<(?<tag>[a-zA-Z]+)[^>]*data-cfemail=([\""']?)(?<cfemail>[a-fA-F0-9]+)\1[^>]*>(?<innerContent>.*?)</\k<tag>>", System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline);
            var omatchings = oregex.Matches(htmlContent);
            UDFLib.WriteExceptionInfLog(new Exception("Started Processing HTML Content:" + htmlContent), QMSEnums.QmsModuleCode.QMS.ToString());
            if (omatchings.Count > 0)
            {
                UDFLib.WriteExceptionInfLog(new Exception("Found " + omatchings.Count.ToString() + " Regex Matching Instances."), QMSEnums.QmsModuleCode.QMS.ToString());
                foreach (System.Text.RegularExpressions.Match match in omatchings)
                {
                    string tag = match.Groups["tag"].Value;
                    string cfemail = match.Groups["cfemail"].Value;
                    string innerContent = match.Groups["innerContent"].Value;
                    if (!string.IsNullOrEmpty(cfemail))
                    {
                        string decodedEmail = DecodeEmail(cfemail);
                        string updatedTag;
                        if (tag.Equals("a", StringComparison.OrdinalIgnoreCase))
                        {
                            updatedTag = @"<a href=\\""mailto:" + decodedEmail + "\\>" + decodedEmail + "</a>";
                        }
                        else if (tag.Equals("span", StringComparison.OrdinalIgnoreCase))
                        {
                            updatedTag = @"<!--email_off-->" + decodedEmail + "<!--/email_off-->";
                        }
                        else
                        {
                            continue;
                        }
                        UDFLib.WriteExceptionInfLog(new Exception("Replacing: " + match.Value + " With " + updatedTag), QMSEnums.QmsModuleCode.QMS.ToString());
                        htmlContent = htmlContent.Replace(match.Value, updatedTag);
                    }
                    else
                    {
                        UDFLib.WriteExceptionLog(new Exception("No obfuscated email found in the match. cfemail: " + "(" + cfemail + ") - tag: " + tag + " - innerContent: " + innerContent));
                    }
                }
                UDFLib.WriteExceptionInfLog(new Exception("Content Length: " + System.Text.Encoding.UTF8.GetByteCount(htmlContent) + " Completed Processing HTML Content:" + htmlContent), QMSEnums.QmsModuleCode.QMS.ToString());
            }
            else
            {
                UDFLib.WriteExceptionInfLog(new Exception("No match found using REGEX:" + oregex), QMSEnums.QmsModuleCode.QMS.ToString());
            }
            return htmlContent;
        }
        catch (Exception ex)
        {
            UDFLib.WriteExceptionLog(ex);
            return htmlContent;
        }
    }

    public string DecodeEmail(string obfuscatedEmail)
    {
        // Ensure the obfuscatedEmail has at least 2 characters for the key
        if (obfuscatedEmail.Length < 2)
        {
            throw new ArgumentException("Invalid obfuscated email format.");
        }

        int key = Convert.ToInt32(obfuscatedEmail.Substring(0, 2), 16);
        System.Text.StringBuilder email = new System.Text.StringBuilder();

        try
        {
            for (int i = 2; i < obfuscatedEmail.Length; i += 2)
            {
                // Ensure there are enough characters left for a valid substring
                if (i + 2 <= obfuscatedEmail.Length)
                {
                    int charCode = Convert.ToInt32(obfuscatedEmail.Substring(i, 2), 16) ^ key;
                    email.Append((char)charCode);
                }
                else
                {
                    UDFLib.WriteExceptionLog(new ArgumentException("Invalid obfuscated email format."));
                }
            }
        }
        catch (Exception ex)
        {
            UDFLib.WriteExceptionLog(ex);
            return string.Empty; // Return an empty string or handle the error as needed
        }
        return email.ToString();
    }
