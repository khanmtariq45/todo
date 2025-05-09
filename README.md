import os
import re
import sys
import urllib.parse
from datetime import datetime
from docx import Document
from win32com import client
import pyodbc

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

def fetch_qms_file_id(filepath):
    """Fetch encryptedDocId from database for the given filepath"""
    dbConnectionString = (
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=dev.c5owyuw64shd.ap-south-1.rds.amazonaws.com,1982;"
        "DATABASE=JIBE_Main;"
        "UID=j2;"
        "PWD=123456;"
        "Max Pool Size=200;"
    )

    try:
        conn = pyodbc.connect(dbConnectionString)
        cursor = conn.cursor()

        query = """
            SELECT TOP 1 encryptedDocId
            FROM QMS_DocIds_Import01 
            WHERE filepath LIKE ?
        """
        # Normalize the path for comparison
        normalized_path = filepath.replace("\\", "/").lower()
        cursor.execute(query, f"%{normalized_path}%")
        row = cursor.fetchone()

        return row[0] if row else None

    except Exception as e:
        print(f"Database error for {filepath}: {e}")
        return None
    finally:
        try:
            cursor.close()
            conn.close()
        except:
            pass

def normalize_path(path):
    """Normalize and extract last two parts of a path."""
    path = urllib.parse.unquote(path)
    return "/".join(path.replace("\\", "/").rstrip("/").split("/")[-2:])

def is_local_file_url(url):
    """Check if URL is a local file path that needs replacement"""
    url = url.strip().lower()
    return (LOCAL_FILE_REGEX.match(url) and 
            not url.startswith(EXCLUDE_PREFIXES))

def get_qms_replacement(url):
    """Get the QMS replacement string for a local file URL"""
    encrypted_doc_id = fetch_qms_file_id(url)
    if encrypted_doc_id:
        return f"#\\qms?DocId={encrypted_doc_id}"
    return None

def process_hyperlink(hyperlink, line_offset, source_type):
    """Process a single hyperlink object."""
    try:
        if not (hyperlink and hasattr(hyperlink, 'address') and hyperlink.address):
            return None

        url = hyperlink.address.strip()
        if not is_local_file_url(url):
            return None

        replacement = get_qms_replacement(url)
        if not replacement:
            return None

        display_text = (hyperlink.text.strip() if hasattr(hyperlink, 'text') and hyperlink.text 
                       else replacement)
        return (url, replacement, line_offset, source_type, display_text)
    except Exception as e:
        print(f"Warning: Hyperlink error - {e}")
        return None

def extract_links_from_text(text, line_offset, existing_links):
    """Extract links from plain text."""
    links = []
    if not text.strip():
        return links

    for url in URL_REGEX.findall(text):
        if url and not any(url in found_url for found_url, *_ in existing_links):
            if is_local_file_url(url):
                replacement = get_qms_replacement(url)
                if replacement:
                    links.append((url, replacement, line_offset, "Text", replacement))
    return links

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

def update_docx_file(file_path, links_to_update):
    """Update a DOCX file with QMS document IDs"""
    try:
        doc = Document(file_path)
        updated = False

        # Update paragraphs
        for para in doc.paragraphs:
            if not para.text.strip():
                continue
            
            # Update hyperlinks
            if hasattr(para, 'hyperlinks'):
                for hyperlink in para.hyperlinks:
                    for original, replacement, *_ in links_to_update:
                        if hyperlink.address and original in hyperlink.address:
                            hyperlink.address = replacement
                            updated = True
            
            # Update text content
            for original, replacement, *_ in links_to_update:
                if original in para.text:
                    para.text = para.text.replace(original, replacement)
                    updated = True

        # Update tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        for original, replacement, *_ in links_to_update:
                            if original in para.text:
                                para.text = para.text.replace(original, replacement)
                                updated = True

        # Update headers and footers
        for section in doc.sections:
            for part in (section.header, section.footer):
                if part:
                    for para in part.paragraphs:
                        for original, replacement, *_ in links_to_update:
                            if original in para.text:
                                para.text = para.text.replace(original, replacement)
                                updated = True

        if updated:
            doc.save(file_path)
            return True
        return False

    except Exception as e:
        print(f"Error updating DOCX file {file_path}: {e}")
        return False

def update_doc_file(file_path, links_to_update):
    """Update a DOC file with QMS document IDs using COM interface"""
    word = doc = None
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(file_path), ReadOnly=False, Visible=False)
        updated = False

        # Update paragraphs
        for para in doc.Paragraphs:
            text = para.Range.Text.strip()
            if not text:
                continue
            
            # Update hyperlinks
            if hasattr(para.Range, 'Hyperlinks'):
                for hyperlink in para.Range.Hyperlinks:
                    for original, replacement, *_ in links_to_update:
                        if hyperlink.Address and original in hyperlink.Address:
                            hyperlink.Address = replacement
                            updated = True
            
            # Update text content
            for original, replacement, *_ in links_to_update:
                if original in para.Range.Text:
                    para.Range.Text = para.Range.Text.replace(original, replacement)
                    updated = True

        # Update headers and footers
        for section in doc.Sections:
            for hf in [section.Headers(1), section.Footers(1)]:
                if hf:
                    # Update hyperlinks in headers/footers
                    if hasattr(hf.Range, 'Hyperlinks'):
                        for hyperlink in hf.Range.Hyperlinks:
                            for original, replacement, *_ in links_to_update:
                                if hyperlink.Address and original in hyperlink.Address:
                                    hyperlink.Address = replacement
                                    updated = True
                    
                    # Update text in headers/footers
                    for original, replacement, *_ in links_to_update:
                        if original in hf.Range.Text:
                            hf.Range.Text = hf.Range.Text.replace(original, replacement)
                            updated = True

        # Update shapes
        if hasattr(doc, 'InlineShapes'):
            for shape in doc.InlineShapes:
                try:
                    if shape and hasattr(shape, 'Hyperlink') and shape.Hyperlink:
                        for original, replacement, *_ in links_to_update:
                            if shape.Hyperlink.Address and original in shape.Hyperlink.Address:
                                shape.Hyperlink.Address = replacement
                                updated = True
                except Exception as e:
                    print(f"Warning: Shape hyperlink error - {e}")

        if updated:
            doc.Save()
            return True
        return False

    except Exception as e:
        print(f"Error updating DOC file {file_path}: {e}")
        return False
    finally:
        if doc:
            doc.Close(False)
        if word:
            word.Quit()

def scan_and_update_documents(base_path):
    """Scan all DOC/DOCX files in the given path and update links"""
    processed_files = 0
    updated_files = 0
    total_replacements = 0
    error_files = []

    print(f"\nScanning and updating: {base_path}\n")

    for root, _, files in os.walk(base_path):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in (".doc", ".docx"):
                continue

            full_path = os.path.join(root, file)
            processed_files += 1
            print(f"[{processed_files}] Processing: {full_path}")

            try:
                # First extract all local file links
                extractor = extract_docx_links if ext == ".docx" else extract_doc_links
                links = extractor(full_path)
                
                if not links:
                    continue

                # Filter to only include links we can replace
                replaceable_links = [(orig, repl) for orig, repl, *_ in links if repl]
                if not replaceable_links:
                    continue

                # Update the document
                updater = update_docx_file if ext == ".docx" else update_doc_file
                if updater(full_path, replaceable_links):
                    updated_files += 1
                    total_replacements += len(replaceable_links)
                    print(f"  Updated {len(replaceable_links)} links")

            except Exception as e:
                error_files.append((full_path, str(e)))
                print(f"[ERROR] {file}: {e