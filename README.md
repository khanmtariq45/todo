right now in doc file my url 
 return f"#\\qms?DocId={encrypted_doc_id}"
is not corrected setting up in docx file and it is adding file full path because of # may be but we will handle it in c# when convert it to html and on conversion we already have a condition 

           string pattern2 = @"href=""([^""]*?)#\\?qms\?(.*?)""";
                string replacement2 = @"href=""$1/#/qms?$2""";
                html = System.Text.RegularExpressions.Regex.Replace(html, pattern2, replacement2);



so what are the posibilities through which i can go so my c# code will update it and now in docx file i become a complete url ?
