

I faced a lot of error in exe and I am providing you distinct error so please make my exe stable

[ERROR] COMP-001 App1 - STS Questionnaire - Vessel and Cargo Information.doc: Word.Application.Quit
[ERROR] COMP-001 App4 - Sanctions Summary Matrix.doc: Open.Close
[ERROR] Record of Changes.doc: (-2147417848, 'The object invoked has disconnected from its clients.', None, None)
[ERROR] PC21 - Evaluation Report for 2nd AE & 3rd AE.doc: DOC error: (-2147352567, 'Exception occurred.', (0, 'Microsoft Word', 
'Office has detected a problem with this file. To help protect your computer this file cannot be opened.\r (C:\\...\\PC21 - Evaluation Report for 2...)', 
'wdmain11.chm', 25775, -2146821993), None)
[ERROR] VB01D - BTM Checklist.doc: DOC error: (-2146959355, 'Server execution failed', None, None)
Warning: Header/Footer error - (-2147352567, 'Exception occurred.', (0, 'Microsoft Word', 'Object has been deleted.', 'wdmain11.chm', 25305, -2146822463), None)



import os
import re
import sys
from datetime import datetime
from docx import Document
from win32com import client

# Regex for matching all hyperlinks
URL_REGEX = re.compile(
    r'('
    r'https?://[^\s<>"\'{}|\\^`[]+'
    r'|www\.[^\s<>"\'{}|\\^`[]+'
    r'|ftp://[^\s<>"\'{}|\\^`[]+'
    r'|mailto:[^\s<>"\'{}|\\^`[]+'
    r'|file://[^\s<>"\'{}|\\^`[]+'
    r'|tel:[^\s<>"\'{}|\\^`[]+'
    r')',
    re.IGNORECASE
)

# Regex to match local file paths
LOCAL_FILE_REGEX = re.compile(
    r'('
    r'file://[^\s<>"\'{}|\\^`\]]+'  # file://... with extension
    r'|[A-Za-z]:[\\/][^\s<>"\'{}|\\^`\]]+'  # Absolute path with extension
    r'|(?:\.\.?[\\/]|[^:/\\\s<>|]+[\\/])[^\s<>"\'{}|\\^`\]]+'  # Relative with extension
    r')',
    re.IGNORECASE
)

def extract_text_and_links_from_paragraph(paragraph, line_offset=0):
    links = []
    text = paragraph.text.strip()
    if not text:
        return links

    # Check for hyperlinks in the paragraph
    if hasattr(paragraph, 'hyperlinks'):
        for hyperlink in paragraph.hyperlinks:
            try:
                if hyperlink and hasattr(hyperlink, 'address') and hyperlink.address:
                    url = hyperlink.address.strip()
                    # Only keep local file paths (excluding external URLs)
                    if not url.lower().startswith(("http://", "https://", "mailto:", "tel:", "ftp://", "s://", "www.")):
                        display_text = hyperlink.text.strip() if hasattr(hyperlink, 'text') else url
                        links.append((url, line_offset, "Hyperlink", display_text))
            except Exception as e:
                print(f"Warning: Hyperlink error - {e}")

    # Also check for URLs in the text using regex
    try:
        matches = URL_REGEX.findall(text)
        for url in matches:
            if url and not any(url in found_url for found_url, _, _, _ in links):
                clean_url = url.strip()
                # Only add local file URLs
                if LOCAL_FILE_REGEX.match(clean_url) and not clean_url.lower().startswith(("http://", "https://", "mailto:", "tel:", "ftp://", "s://", "www.")):
                    links.append((clean_url, line_offset, "Text", clean_url))
    except Exception as e:
        print(f"Warning: Regex error - {e}")

    return links

def extract_links_from_docx(path):
    links = []
    try:
        doc = Document(path)
        line_num = 1

        for para in doc.paragraphs:
            links.extend(extract_text_and_links_from_paragraph(para, line_num))
            line_num += 1

        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        links.extend(extract_text_and_links_from_paragraph(para, line_num))
                        line_num += 1

        for section in doc.sections:
            for part in (section.header, section.footer):
                if part is not None:
                    for para in part.paragraphs:
                        links.extend(extract_text_and_links_from_paragraph(para, -1))

    except Exception as e:
        raise Exception(f"DOCX error: {e}")
    return links

def extract_links_from_doc(path):
    links = []
    word = None
    doc = None
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(path), ReadOnly=True, Visible=False)

        for i, para in enumerate(doc.Paragraphs, 1):
            text = para.Range.Text.strip()
            if not text:
                continue

            # Check for hyperlinks in the document
            if hasattr(para.Range, 'Hyperlinks'):
                for hyperlink in para.Range.Hyperlinks:
                    try:
                        if hyperlink and hasattr(hyperlink, 'Address') and hyperlink.Address:
                            url = hyperlink.Address.strip()
                            # Only keep local file paths (excluding external URLs)
                            if not url.lower().startswith(("http://", "https://", "mailto:", "tel:", "ftp://", "s://", "www.")):
                                display_text = hyperlink.TextToDisplay.strip() if hasattr(hyperlink, 'TextToDisplay') else url
                                links.append((url, i, "Hyperlink", display_text))
                    except Exception as e:
                        print(f"Warning: Hyperlink error - {e}")

            matches = URL_REGEX.findall(text)
            for url in matches:
                if url and not any(url in found_url for found_url, _, _, _ in links):
                    clean_url = url.strip()
                    # Only add local file URLs
                    if LOCAL_FILE_REGEX.match(clean_url) and not clean_url.lower().startswith(("http://", "https://", "mailto:", "tel:", "ftp://", "s://", "www.")):
                        links.append((clean_url, i, "Text", clean_url))

        for section in doc.Sections:
            for hf in [section.Headers(1), section.Footers(1)]:
                try:
                    if hf:
                        text = hf.Range.Text.strip()
                        if not text:
                            continue
                        if hasattr(hf.Range, 'Hyperlinks'):
                            for hyperlink in hf.Range.Hyperlinks:
                                if hyperlink and hasattr(hyperlink, 'Address') and hyperlink.Address:
                                    clean_url = hyperlink.Address.strip()
                                    display_text = clean_url
                                    links.append((clean_url, -1, "Hyperlink", display_text))

                        matches = URL_REGEX.findall(text)
                        for url in matches:
                            if url and not any(url in found_url for found_url, _, _, _ in links):
                                clean_url = url.strip()
                                links.append((clean_url, -1, "Text", clean_url))
                except Exception as e:
                    print(f"Warning: Header/Footer error - {e}")

        if hasattr(doc, 'InlineShapes'):
            for shape in doc.InlineShapes:
                try:
                    if shape and hasattr(shape, 'Hyperlink') and shape.Hyperlink and shape.Hyperlink.Address:
                        clean_url = shape.Hyperlink.Address.strip()
                        display_text = clean_url
                        links.append((clean_url, -1, "Shape Hyperlink", display_text))
                except Exception as e:
                    print(f"Warning: Shape hyperlink error - {e}")

    except Exception as e:
        raise Exception(f"DOC error: {e}")
    finally:
        if doc:
            doc.Close(False)
        if word:
            word.Quit()
    return links

def find_all_links(base_path):
    file_links = {}
    error_files = []
    total_links = 0
    file_count = 0

    print(f"\nScanning: {base_path}\n")

    for root, _, files in os.walk(base_path):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in [".doc", ".docx"]:
                continue

            full_path = os.path.join(root, file)
            file_count += 1
            print(f"[{file_count}] Processing: {full_path}")

            try:
                if ext == ".docx":
                    links = extract_links_from_docx(full_path)
                else:
                    links = extract_links_from_doc(full_path)

                if links:
                    file_links[full_path] = links
                    total_links += len(links)
            except Exception as e:
                error_files.append((full_path, str(e)))
                print(f"[ERROR] {file}: {e}")

    return file_links, error_files, total_links

if __name__ == "__main__":
    try:
        base_path = input("Enter the base folder path: ").strip()
        if not os.path.exists(base_path):
            print("Error: Path does not exist.")
            sys.exit(1)

        output_file = "word_links_report.html"
        print("\nExtracting links...")
        links, errors, total = find_all_links(base_path)

        print("\nAll Extracted Links:")
        for file_path, file_links in links.items():
            print(f"\nFile: {file_path}")
            for url, line, source, display in file_links:
                print(f"  [{source}] Line {line}: {display} -> {url}")

        if errors:
            print("\nErrors encountered:")
            for file_path, error in errors:
                print(f"  {file_path}: {error}")

        print(f"\nTotal local file links found: {total}")
        print("\nDone!")
    except KeyboardInterrupt:
        print("\nCancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {str(e)}")
        sys.exit(1)
