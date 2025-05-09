import os
import re
import sys
import urllib.parse
from datetime import datetime
from docx import Document
from win32com import client

# Combined regex patterns
URL_PATTERN = (
    r'(https?://[^\s<>"\'{}|\\^`[]+|www\.[^\s<>"\'{}|\\^`[]+|'
    r'ftp://[^\s<>"\'{}|\\^`[]+|mailto:[^\s<>"\'{}|\\^`[]+|'
    r'file://[^\s<>"\'{}|\\^`[]+|tel:[^\s<>"\'{}|\\^`[]+)'
)
LOCAL_FILE_PATTERN = (
    r'(file://[^\s<>"\'{}|\\^`\]]+|[A-Za-z]:[\\/][^\s<>"\'{}|\\^`\]]+|'
    r'(?:\.\.?[\\/]|[^:/\\\s<>|]+[\\/])[^\s<>"\'{}|\\^`\]]+)'
)

URL_REGEX = re.compile(URL_PATTERN, re.IGNORECASE)
LOCAL_FILE_REGEX = re.compile(LOCAL_FILE_PATTERN, re.IGNORECASE)

# Common prefixes to exclude
EXCLUDE_PREFIXES = ("http://", "https://", "mailto:", "tel:", "ftp://", "s://", "www.")

def normalize_path(path):
    """Normalize and extract last two parts of a path."""
    path = urllib.parse.unquote(path)
    return "/".join(path.replace("\\", "/").rstrip("/").split("/")[-2:])

def extract_links_from_text(text, line_offset, existing_links):
    """Extract links from plain text."""
    links = []
    if not text.strip():
        return links

    for url in URL_REGEX.findall(text):
        if url and not any(url in found_url for found_url, _, _, _ in existing_links):
            clean_url = url.strip()
            if (LOCAL_FILE_REGEX.match(clean_url) and 
                not clean_url.lower().startswith(EXCLUDE_PREFIXES)):
                short_url = normalize_path(clean_url)
                links.append((short_url, line_offset, "Text", short_url))
    return links

def process_hyperlink(hyperlink, line_offset, source_type):
    """Process a single hyperlink object."""
    try:
        if not (hyperlink and hasattr(hyperlink, 'address') and hyperlink.address):
            return None

        url = hyperlink.address.strip()
        if url.lower().startswith(EXCLUDE_PREFIXES):
            return None

        short_url = normalize_path(url)
        display_text = (hyperlink.text.strip() if hasattr(hyperlink, 'text') and hyperlink.text 
                       else short_url)
        return (short_url, line_offset, source_type, display_text)
    except Exception as e:
        print(f"Warning: Hyperlink error - {e}")
        return None

def extract_paragraph_links(paragraph, line_offset):
    """Extract links from a paragraph object."""
    links = []
    text = paragraph.text.strip()
    if not text:
        return links

    # Process hyperlinks
    if hasattr(paragraph, 'hyperlinks'):
        for hyperlink in paragraph.hyperlinks:
            link_data = process_hyperlink(hyperlink, line_offset, "Hyperlink")
            if link_data:
                links.append(link_data)

    # Process text URLs
    links.extend(extract_links_from_text(text, line_offset, links))
    return links

def extract_docx_links(path):
    """Extract links from DOCX file."""
    links = []
    try:
        doc = Document(path)
        line_num = 1

        # Process paragraphs
        for para in doc.paragraphs:
            links.extend(extract_paragraph_links(para, line_num))
            line_num += 1

        # Process tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        links.extend(extract_paragraph_links(para, line_num))
                        line_num += 1

        # Process headers and footers
        for section in doc.sections:
            for part in (section.header, section.footer):
                if part:
                    for para in part.paragraphs:
                        links.extend(extract_paragraph_links(para, -1))

    except Exception as e:
        raise Exception(f"DOCX error: {e}")
    return links

def extract_doc_links(path):
    """Extract links from DOC file using COM interface."""
    links = []
    word = doc = None
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(path), ReadOnly=True, Visible=False)

        # Process paragraphs
        for i, para in enumerate(doc.Paragraphs, 1):
            text = para.Range.Text.strip()
            if not text:
                continue

            # Process hyperlinks
            if hasattr(para.Range, 'Hyperlinks'):
                for hyperlink in para.Range.Hyperlinks:
                    link_data = process_hyperlink(hyperlink, i, "Hyperlink")
                    if link_data:
                        links.append(link_data)

            # Process text URLs
            links.extend(extract_links_from_text(text, i, links))

        # Process headers and footers
        for section in doc.Sections:
            for hf in [section.Headers(1), section.Footers(1)]:
                if hf:
                    text = hf.Range.Text.strip()
                    if text:
                        # Process hyperlinks
                        if hasattr(hf.Range, 'Hyperlinks'):
                            for hyperlink in hf.Range.Hyperlinks:
                                if hyperlink and hasattr(hyperlink, 'Address') and hyperlink.Address:
                                    url = hyperlink.Address.strip()
                                    short_url = normalize_path(url)
                                    links.append((short_url, -1, "Hyperlink", short_url))

                        # Process text URLs
                        links.extend(extract_links_from_text(text, -1, links))

        # Process shapes
        if hasattr(doc, 'InlineShapes'):
            for shape in doc.InlineShapes:
                try:
                    if (shape and hasattr(shape, 'Hyperlink') and 
                       shape.Hyperlink and shape.Hyperlink.Address):
                        url = shape.Hyperlink.Address.strip()
                        short_url = normalize_path(url)
                        links.append((short_url, -1, "Shape Hyperlink", short_url))
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

def scan_documents(base_path):
    """Scan all DOC/DOCX files in the given path."""
    file_links = {}
    error_files = []
    file_count = total_links = 0

    print(f"\nScanning: {base_path}\n")

    for root, _, files in os.walk(base_path):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in (".doc", ".docx"):
                continue

            full_path = os.path.join(root, file)
            file_count += 1
            print(f"[{file_count}] Processing: {full_path}")

            try:
                extractor = extract_docx_links if ext == ".docx" else extract_doc_links
                links = extractor(full_path)
                
                if links:
                    file_links[full_path] = links
                    total_links += len(links)
            except Exception as e:
                error_files.append((full_path, str(e)))
                print(f"[ERROR] {file}: {e}")

    return file_links, error_files, total_links

def main():
    """Main execution function."""
    try:
        base_path = input("Enter the base folder path: ").strip()
        if not os.path.exists(base_path):
            print("Error: Path does not exist.")
            sys.exit(1)

        print("\nExtracting links...")
        links, errors, total = scan_documents(base_path)

        print("\nAll Extracted Links:")
        for file_path, file_links in links.items():
            print(f"\nFile: {file_path}")
            for url, line, source, display in file_links:
                print(f"  [{source}] Line {line}: {display} -> {url}")

        if errors:
            print("\nErrors encountered:")
            for file_path, error in errors:
                print(f"  {file_path}: {error}")

        print(f"\nTotal local file links found: {total}\nDone!")
    except KeyboardInterrupt:
        print("\nCancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()