import os
import re
import sys
import urllib.parse
from datetime import datetime
from docx import Document
from win32com import client
import pyodbc

# Regex patterns
URL_PATTERN = (
    r'(https?://[^\s<>"]+|www\.[^\s<>"]+|'
    r'ftp://[^\s<>"]+|mailto:[^\s<>"]+|'
    r'file://[^\s<>"]+|tel:[^\s<>"]+)'
)
LOCAL_FILE_PATTERN = (
    r'(file://[^\s<>"]+|[A-Za-z]:[\\/][^\s<>"]+|'
    r'(?:\.?[\\/]|[^:/\\\s<>|]+[\\/])[^\s<>"]+)'
)

URL_REGEX = re.compile(URL_PATTERN, re.IGNORECASE)
LOCAL_FILE_REGEX = re.compile(LOCAL_FILE_PATTERN, re.IGNORECASE)
EXCLUDE_PREFIXES = ("http://", "https://", "mailto:", "tel:", "ftp://", "s://", "www.")

results = []  # Collects info for HTML report

def get_last_two_path_parts(path):
    path = urllib.parse.unquote(path).replace("\\", "/").rstrip("/")
    parts = path.split("/")
    return "/".join(parts[-2:]) if len(parts) >= 2 else path

def fetch_qms_file_id(filepath):
    conn_str = (
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=dev.c5owyuw64shd.ap-south-1.rds.amazonaws.com,1982;"
        "DATABASE=JIBE_Main;"
        "UID=j2;PWD=123456;"
    )
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        normalized = get_last_two_path_parts(filepath)
        cursor.execute("""
            SELECT TOP 1 encryptedDocId FROM QMS_DocIds_Import01 
            WHERE filepath LIKE ?
        """, f"%{normalized}%")
        row = cursor.fetchone()
        return row[0] if row else None
    except Exception as e:
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
    enc_id = fetch_qms_file_id(url)
    return f"#\\qms?DocId={enc_id}" if enc_id else None

def process_hyperlink(hyperlink, line_offset):
    try:
        if not (hyperlink and hasattr(hyperlink, 'address') and hyperlink.address):
            return None
        url = hyperlink.address.strip()
        if not is_local_file_url(url):
            return None
        replacement = get_qms_replacement(url)
        return (url, replacement, line_offset, 'Hyperlink', hyperlink.text.strip()) if replacement else None
    except:
        return None

def extract_links_from_text(text, line_offset, existing):
    links = []
    for url in URL_REGEX.findall(text):
        if url and not any(url in e[0] for e in existing):
            if is_local_file_url(url):
                repl = get_qms_replacement(url)
                if repl:
                    links.append((url, repl, line_offset, 'Text', repl))
    return links

def extract_paragraph_links(paragraph, line_offset):
    links = []
    text = paragraph.text.strip()
    if hasattr(paragraph, 'hyperlinks'):
        for hyperlink in paragraph.hyperlinks:
            data = process_hyperlink(hyperlink, line_offset)
            if data:
                links.append(data)
    links.extend(extract_links_from_text(text, line_offset, links))
    return links

def update_docx_file(path, updates):
    try:
        doc = Document(path)
        changed = False
        for para in doc.paragraphs:
            for orig, repl, *_ in updates:
                if orig in para.text:
                    para.text = para.text.replace(orig, repl)
                    changed = True
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        for orig, repl, *_ in updates:
                            if orig in para.text:
                                para.text = para.text.replace(orig, repl)
                                changed = True
        if changed:
            doc.save(path)
        return changed
    except Exception as e:
        return False

def update_doc_file(path, updates):
    word = doc = None
    try:
        word = client.Dispatch("Word.Application")
        doc = word.Documents.Open(os.path.abspath(path), ReadOnly=False)
        changed = False
        for para in doc.Paragraphs:
            for orig, repl, *_ in updates:
                if orig in para.Range.Text:
                    para.Range.Text = para.Range.Text.replace(orig, repl)
                    changed = True
        if changed:
            doc.Save()
        return changed
    except Exception as e:
        return False
    finally:
        if doc:
            doc.Close(False)
        if word:
            word.Quit()

def extract_docx_links(path):
    links = []
    try:
        doc = Document(path)
        line = 0
        for para in doc.paragraphs:
            links.extend(extract_paragraph_links(para, line))
            line += 1
    except:
        pass
    return links

def extract_doc_links(path):
    links = []
    word = doc = None
    try:
        word = client.Dispatch("Word.Application")
        doc = word.Documents.Open(os.path.abspath(path), ReadOnly=True)
        line = 0
        for para in doc.Paragraphs:
            text = para.Range.Text.strip()
            if hasattr(para.Range, 'Hyperlinks'):
                for hyperlink in para.Range.Hyperlinks:
                    data = process_hyperlink(hyperlink, line)
                    if data:
                        links.append(data)
            links.extend(extract_links_from_text(text, line, links))
            line += 1
    except:
        pass
    finally:
        if doc:
            doc.Close(False)
        if word:
            word.Quit()
    return links

def scan_and_update_documents(base_path):
    print(f"Scanning: {base_path}")
    for root, _, files in os.walk(base_path):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in (".doc", ".docx"):
                continue
            full_path = os.path.join(root, file)
            print(f"Processing: {full_path}")
            info = {"path": full_path, "links": [], "updated": False, "error": None}
            try:
                extractor = extract_docx_links if ext == ".docx" else extract_doc_links
                links = extractor(full_path)
                info["links"] = links
                if links:
                    replacers = [(o, r) for o, r, *_ in links if r]
                    updater = update_docx_file if ext == ".docx" else update_doc_file
                    info["updated"] = updater(full_path, replacers)
            except Exception as e:
                info["error"] = str(e)
            results.append(info)

def generate_html_report(output_path="report.html"):
    html = ["<html><head><meta charset='utf-8'><title>Link Update Report</title></head><body>"]
    processed = len(results)
    updated = sum(1 for r in results if r["updated"])
    errors = sum(1 for r in results if r["error"])
    html.append(f"<h2>Processed: {processed} | Updated: {updated} | Errors: {errors}</h2><ul>")
    for r in results:
        if r["links"]:
            html.append("<li><b>" + r["path"] + "</b>")
            if r["error"]:
                html.append(f" <span style='color:red;'>Error: {r['error']}</span>")
            elif r["updated"]:
                html.append(f" <span style='color:green;'>(Updated)</span>")
            else:
                html.append(f" <span>(Found Links Only)</span>")
            html.append("<ul>")
            for o, rpl, ln, src, txt in r["links"]:
                html.append(f"<li>{txt} => {rpl}</li>")
            html.append("</ul></li>")
    html.append("</ul></body></html>")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(html))
    print(f"HTML report generated at {output_path}")

if __name__ == "__main__":
    folder_path = input("Enter folder path: ").strip()
    if not folder_path or not os.path.exists(folder_path):
        print("Invalid folder path.")
        sys.exit(1)
    scan_and_update_documents(folder_path)
    generate_html_report()
