import os
import re
import sys
import urllib.parse
from datetime import datetime
from collections import defaultdict
from docx import Document
from win32com import client
import pyodbc

# Regex patterns
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
EXCLUDE_PREFIXES = ("http://", "https://", "mailto:", "tel:", "ftp://", "s://", "www.")

# Track file processing status and failed links
file_status = defaultdict(dict)
processed_files = []
failed_links = defaultdict(list)

def get_last_two_path_parts(path):
    path = urllib.parse.unquote(path)
    path = path.replace("\\", "/").rstrip("/")
    parts = path.split("/")
    return "/".join(parts[-2:]) if len(parts) >= 2 else path

log_entries = []

def log(message, file_path=None, link=None):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_entry = f"[{timestamp}] {message}"
    log_entries.append(log_entry)
    
    # Track failed links for specific files
    if file_path and link and ("failed" in message.lower() or "error" in message.lower()):
        failed_links[file_path].append((link, message))

def fetch_qms_file_id(filepath):
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
        normalized_path = get_last_two_path_parts(filepath)
        cursor.execute("""
            SELECT TOP 1 encryptedDocId FROM QMS_DocIds_Import01 
            WHERE filepath LIKE ?
        """, f"%{normalized_path}%")
        row = cursor.fetchone()
        return row[0] if row else None

    except Exception as e:
        log(f"Database error: {e}", filepath)
        return None
    finally:
        try:
            cursor.close()
            conn.close()
        except:
            pass

def is_local_file_url(url):
    url = url.strip().lower()
    return (LOCAL_FILE_REGEX.match(url) and not url.startswith(EXCLUDE_PREFIXES))

def get_qms_replacement(url, file_path):
    encrypted_doc_id = fetch_qms_file_id(url)
    if encrypted_doc_id:
        log(f"Found encrypted ID for {url} => {encrypted_doc_id}", file_path)
        return f"#\\qms?DocId={encrypted_doc_id}"
    else:
        log(f"No encrypted ID found for {url}", file_path, url)
    return None

def process_hyperlink(hyperlink, line_offset, source_type, file_path):
    try:
        if not (hyperlink and hasattr(hyperlink, 'address') and hyperlink.address:
            return None
        url = hyperlink.address.strip()
        if not is_local_file_url(url):
            return None
        replacement = get_qms_replacement(url, file_path)
        if not replacement:
            log(f"Replacement not found for {url}", file_path, url)
            return None
        display_text = (hyperlink.text.strip() if hasattr(hyperlink, 'text') and hyperlink.text 
                        else replacement)
        log(f"Prepared replacement: {url} => {replacement}", file_path)
        return (url, replacement, line_offset, source_type, display_text)
    except Exception as e:
        log(f"Hyperlink processing error: {e}", file_path)
        return None

def extract_links_from_text(text, line_offset, existing_links, file_path):
    links = []
    if not text.strip():
        return links
    for url in URL_REGEX.findall(text):
        if url and not any(url in found_url for found_url, *_ in existing_links):
            if is_local_file_url(url):
                replacement = get_qms_replacement(url, file_path)
                if replacement:
                    links.append((url, replacement, line_offset, "Text", replacement))
                else:
                    log(f"No replacement found for text link: {url}", file_path, url)
    return links

def extract_paragraph_links(paragraph, line_offset, file_path):
    links = []
    text = paragraph.text.strip()
    if not text:
        return links
    if hasattr(paragraph, 'hyperlinks'):
        for hyperlink in paragraph.hyperlinks:
            link_data = process_hyperlink(hyperlink, line_offset, "Hyperlink", file_path)
            if link_data:
                links.append(link_data)
    links.extend(extract_links_from_text(text, line_offset, links, file_path))
    return links

def update_docx_file(file_path, links_to_update):
    try:
        doc = Document(file_path)
        updated = False
        for para in doc.paragraphs:
            if hasattr(para, 'hyperlinks'):
                for hyperlink in para.hyperlinks:
                    for original, replacement, *_ in links_to_update:
                        if hyperlink.address and original in hyperlink.address:
                            hyperlink.address = replacement
                            updated = True
                            log(f"Updated hyperlink: {original} => {replacement}", file_path)
            for original, replacement, *_ in links_to_update:
                if original in para.text:
                    para.text = para.text.replace(original, replacement)
                    updated = True
                    log(f"Replaced text in paragraph: {original} => {replacement}", file_path)
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        for original, replacement, *_ in links_to_update:
                            if original in para.text:
                                para.text = para.text.replace(original, replacement)
                                updated = True
                                log(f"Replaced text in table cell: {original} => {replacement}", file_path)
        for section in doc.sections:
            for part in (section.header, section.footer):
                if part:
                    for para in part.paragraphs:
                        for original, replacement, *_ in links_to_update:
                            if original in para.text:
                                para.text = para.text.replace(original, replacement)
                                updated = True
                                log(f"Replaced text in header/footer: {original} => {replacement}", file_path)
        if updated:
            doc.save(file_path)
            log(f"Successfully updated file", file_path)
            file_status[file_path]['status'] = 'updated'
            file_status[file_path]['updated_links'] = len(links_to_update)
        return updated
    except Exception as e:
        log(f"Error updating file: {e}", file_path)
        file_status[file_path]['status'] = 'error'
        file_status[file_path]['error'] = str(e)
        return False

def update_doc_file(file_path, links_to_update):
    word = doc = None
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(file_path), ReadOnly=False, Visible=False)
        updated = False
        for para in doc.Paragraphs:
            text = para.Range.Text.strip()
            for original, replacement, *_ in links_to_update:
                if original in para.Range.Text:
                    para.Range.Text = para.Range.Text.replace(original, replacement)
                    updated = True
                    log(f"Updated paragraph: {original} => {replacement}", file_path)
            if hasattr(para.Range, 'Hyperlinks'):
                for hyperlink in para.Range.Hyperlinks:
                    for original, replacement, *_ in links_to_update:
                        if hyperlink.Address and original in hyperlink.Address:
                            hyperlink.Address = replacement
                            updated = True
                            log(f"Updated hyperlink: {original} => {replacement}", file_path)
        for section in doc.Sections:
            for hf in [section.Headers(1), section.Footers(1)]:
                if hf:
                    for original, replacement, *_ in links_to_update:
                        if original in hf.Range.Text:
                            hf.Range.Text = hf.Range.Text.replace(original, replacement)
                            updated = True
                            log(f"Updated header/footer: {original} => {replacement}", file_path)
        if updated:
            doc.Save()
            log(f"Successfully updated file", file_path)
            file_status[file_path]['status'] = 'updated'
            file_status[file_path]['updated_links'] = len(links_to_update)
        return updated
    except Exception as e:
        log(f"Error updating file: {e}", file_path)
        file_status[file_path]['status'] = 'error'
        file_status[file_path]['error'] = str(e)
        return False
    finally:
        if doc:
            doc.Close(False)
        if word:
            word.Quit()

def extract_docx_links(file_path):
    links = []
    try:
        doc = Document(file_path)
        line_offset = 0
        for para in doc.paragraphs:
            links.extend(extract_paragraph_links(para, line_offset, file_path))
            line_offset += len(para.text.split('\n'))
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        links.extend(extract_paragraph_links(para, line_offset, file_path))
                        line_offset += len(para.text.split('\n'))
        for section in doc.sections:
            for part in (section.header, section.footer):
                if part:
                    for para in part.paragraphs:
                        links.extend(extract_paragraph_links(para, line_offset, file_path))
                        line_offset += len(para.text.split('\n'))
    except Exception as e:
        log(f"Error extracting links: {e}", file_path)
        file_status[file_path]['status'] = 'error'
        file_status[file_path]['error'] = str(e)
    return links

def extract_doc_links(file_path):
    links = []
    word = doc = None
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(file_path), ReadOnly=True, Visible=False)
        line_offset = 0
        for para in doc.Paragraphs:
            text = para.Range.Text.strip()
            if text:
                if hasattr(para.Range, 'Hyperlinks'):
                    for hyperlink in para.Range.Hyperlinks:
                        link_data = process_hyperlink(hyperlink, line_offset, "Hyperlink", file_path)
                        if link_data:
                            links.append(link_data)
                links.extend(extract_links_from_text(text, line_offset, links, file_path))
                line_offset +=