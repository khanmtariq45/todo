Documentnt os
import re
import sys
import urllib.parse
from datetime import datetime
from docx import Document
from win32com import client
import pyodbc

# Combined regex patterns
URL_PATTERN = (
    r'(https?://[^\s<>"]+|www\.[^\s<>"]+|'
    r'ftp://[^\s<>"]+|mailto:[^\s<>"]+|'
    r'file://[^\s<>"]+|tel:[^\s<>"]+)'
)
LOCAL_FILE_PATTERN = (
    r'(file://[^\s<>"\]]+|[A-Za-z]:[\\/][^\s<>"\]]+|'
    r'(?:\.\.?[\\/]|[^:/\\\s<>|]+[\\/])[^\s<>"\]]+)'
)

URL_REGEX = re.compile(URL_PATTERN, re.IGNORECASE)
LOCAL_FILE_REGEX = re.compile(LOCAL_FILE_PATTERN, re.IGNORECASE)

EXCLUDE_PREFIXES = ("http://", "https://", "mailto:", "tel:", "ftp://", "s://", "www.")
LOG_FILE = "link_update_log.txt"

def log(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {message}\n")

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
        query = """
            SELECT TOP 1 encryptedDocId
            FROM QMS_DocIds_Import01 
            WHERE filepath LIKE ?
        """
        normalized_path = filepath.replace("\\", "/").lower()
        cursor.execute(query, f"%{normalized_path}%")
        row = cursor.fetchone()
        encrypted_id = row[0] if row else None
        if encrypted_id:
            log(f"Fetched encryptedDocId for {filepath} -> {encrypted_id}")
        else:
            log(f"No encryptedDocId found for {filepath}")
        return encrypted_id
    except Exception as e:
        log(f"Database error for {filepath}: {e}")
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

def get_qms_replacement(url):
    encrypted_doc_id = fetch_qms_file_id(url)
    if encrypted_doc_id:
        return f"#\\qms?DocId={encrypted_doc_id}"
    return None

def process_hyperlink(hyperlink, line_offset, source_type):
    try:
        if not (hyperlink and hasattr(hyperlink, 'address') and hyperlink.address):
            return None
        url = hyperlink.address.strip()
        if not is_local_file_url(url):
            return None
        replacement = get_qms_replacement(url)
        if replacement:
            display_text = (hyperlink.text.strip() if hasattr(hyperlink, 'text') and hyperlink.text 
                            else replacement)
            log(f"[{source_type}] Found: {url} | Replacement: {replacement}")
            return (url, replacement, line_offset, source_type, display_text)
        else:
            log(f"[{source_type}] Found but no replacement: {url}")
            return None
    except Exception as e:
        log(f"Hyperlink error at line {line_offset}: {e}")
        return None

def extract_links_from_text(text, line_offset, existing_links):
    links = []
    if not text.strip():
        return links
    for url in URL_REGEX.findall(text):
        if url and not any(url in found_url for found_url, *_ in existing_links):
            if is_local_file_url(url):
                replacement = get_qms_replacement(url)
                if replacement:
                    log(f"[Text] Found: {url} | Replacement: {replacement}")
                    links.append((url, replacement, line_offset, "Text", replacement))
                else:
                    log(f"[Text] Found but no replacement: {url}")
    return links
