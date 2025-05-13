import os
import re
import sys
import pyodbc
import urllib.parse
from datetime import datetime
from docx import Document
from win32com import client
from docx.opc.constants import RELATIONSHIP_TYPE as RT

# Regex patterns
URL_PATTERN = (
    r'(https?://[^\s<>"\'{}|\\^`[]+|www\.[^\s<>"\'{}|\\^`[]+|'
    r'ftp://[^\s<>"\'{}|\\^`[]+|mailto:[^\s<>"\'{}|\\^`[]+|'
    r'file://[^\s<>"\'{}|\\^`[]+|tel:[^\s<>"\'{}|\\^`[]+)'
)

LOCAL_FILE_REGEX = re.compile(
    r'('
    r'file://[^\s<>"\'{}|\\^`\]]+'  # file:// URLs
    r'|[A-Za-z]:\\/*[^<>:"/\\|?*\r\n]*'  # Windows absolute paths
    r'|(?:\.\.?[\\/]|[^:/\\\s<>|]+[\\/])(?:[^<>:"/\\|?*\r\n]+[\\/])*[^<>:"/\\|?*\r\n]*'  # Relative paths
    r'|[^<>:"/\\|?*\r\n]+\.(?:pdf|docx?|xlsx?|pptx?|txt|csv|jpg|png|zip)'  # Standalone filenames with common extensions
    r')',
    re.IGNORECASE
)

URL_REGEX = re.compile(URL_PATTERN, re.IGNORECASE)
EXCLUDE_PREFIXES = ("http://", "https://", "mailto:", "tel:", "ftp://", "s://", "www.")

log_entries = []

def log(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_entries.append(f"[{timestamp}] {message}")

def get_last_two_path_parts(path):
    path = urllib.parse.unquote(path)
    path = path.replace("\\", "/").rstrip("/")
    parts = path.split("/")
    return "/".join(parts[-2:]) if len(parts) >= 2 else path

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
        log(f"Database error for {filepath}: {e}")
        return None
    finally:
        try:
            cursor.close()
            conn.close()
        except:
            pass

def is_local_file_url(url):
    url = url.strip()
    return LOCAL_FILE_REGEX.match(url) and not url.lower().startswith(("http://", "https://", "mailto:", "tel:", "ftp://", "s://", "www."))

def get_qms_replacement(url):
    encrypted_doc_id = fetch_qms_file_id(url)
    if encrypted_doc_id:
        return f"#\\qms?DocId={encrypted_doc_id}"
    else:
        log(f"No encrypted ID found for {url}")
    return None

def process_hyperlink(hyperlink, line_offset, source_type, file_path):
    try:
        if not (hyperlink and hasattr(hyperlink, 'address') and hyperlink.address):
            return None
        url = hyperlink.address.strip()
        if not is_local_file_url(url):
            return None
        replacement = get_qms_replacement(url)
        if not replacement:
            log(f"Replacement not found for {url}")
            return None
        display_text = (hyperlink.text.strip() if hasattr(hyperlink, 'text') and hyperlink.text 
                        else replacement)   
        log(f"Prepared replacement for {url} => {replacement} (Display Name: {display_text})")
        return (url, replacement, line_offset, source_type, display_text)
    except Exception as e:
        log(f"Hyperlink processing error: {e}")
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
                    links.append((url, replacement, line_offset, "Text", replacement))
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
    links.extend(extract_links_from_text(text, line_offset, links))
    return links

def update_hyperlink_relationships(doc, old_url, new_url, para, display_text=None):
    updated = False

    for rel in doc.part.rels.values():
        if rel.reltype == RT.HYPERLINK and rel.target_ref == old_url:
            rel._target = new_url
            updated = True

    for run in para.runs:
        if old_url in run.text:
            run.text = run.text.replace(old_url, new_url)
            updated = True

    return updated

def update_docx_file(file_path, links_to_update):
    try:
        doc = Document(file_path)
        updated = False

        for para in doc.paragraphs:
            if hasattr(para, 'hyperlinks'):
                for hyperlink in para.hyperlinks:
                    for original, replacement, *_ in links_to_update:
                        if hyperlink.address and original in hyperlink.address:
                            if hyperlink.text == original:
                                try:
                                    hyperlink.text = replacement
                                except:
                                    pass
                            if update_hyperlink_relationships(doc, original, replacement, para):
                                updated = True

            for original, replacement, *_ in links_to_update:
                if original in para.text:
                    para.text = para.text.replace(original, replacement)
                    updated = True

        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        if hasattr(para, 'hyperlinks'):
                            for hyperlink in para.hyperlinks:
                                for original, replacement, *_ in links_to_update:
                                    if hyperlink.address and original in hyperlink.address:
                                        if hyperlink.text == original:
                                            try:
                                                hyperlink.text = replacement
                                            except:
                                                pass
                                        if update_hyperlink_relationships(doc, original, replacement, para):
                                            updated = True

                        for original, replacement, *_ in links_to_update:
                            if original in para.text:
                                para.text = para.text.replace(original, replacement)
                                updated = True

        for section in doc.sections:
            for part in (section.header, section.footer):
                if part:
                    for para in part.paragraphs:
                        if hasattr(para, 'hyperlinks'):
                            for hyperlink in para.hyperlinks:
                                for original, replacement, *_ in links_to_update:
                                    if hyperlink.address and original in hyperlink.address:
                                        hyperlink.address = replacement
                                        if hyperlink.text == original:
                                            try:
                                                hyperlink.text = replacement
                                            except:
                                                pass
                                        if update_hyperlink_relationships(doc, original, replacement, para):
                                            updated = True

                        for original, replacement, *_ in links_to_update:
                            if original in para.text:
                                para.text = para.text.replace(original, replacement)
                                updated = True

        if updated:
            doc.save(file_path)
        return updated
    except Exception as e:
        log(f"Error updating DOCX file {file_path}: {e}")
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
                    log(f"Updated DOC paragraph: {original} => {replacement}")
            if hasattr(para.Range, 'Hyperlinks'):
                for hyperlink in para.Range.Hyperlinks:
                    for original, replacement, *_ in links_to_update:
                        if hyperlink.Address and original in hyperlink.Address:
                            hyperlink.Address = replacement
                            updated = True
                            log(f"Updated DOC hyperlink: {original} => {replacement}")
        for section in doc.Sections:
            for hf in [section.Headers(1), section.Footers(1)]:
                if hf:
                    for original, replacement, *_ in links_to_update:
                        if original in hf.Range.Text:
                            hf.Range.Text = hf.Range.Text.replace(original, replacement)
                            updated = True
                            log(f"Updated DOC header/footer: {original} => {replacement}")
        if updated:
            doc.Save()
            log(f"Saved updated DOC: {file_path}")
        return updated
    except Exception as e:
        log(f"Error updating DOC file {file_path}: {e}")
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
        log(f"Error extracting links from DOCX {file_path}: {e}")
        
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
                links.extend(extract_links_from_text(text, line_offset, links))
                line_offset += len(text.split('\n'))
        for section in doc.Sections:
            for hf in [section.Headers(1), section.Footers(1)]:
                if hf:
                    if hasattr(hf.Range, 'Hyperlinks'):
                        for hyperlink in hf.Range.Hyperlinks:
                            link_data = process_hyperlink(hyperlink, line_offset, "Header/Footer", file_path)
                            if link_data:
                                links.append(link_data)
                    links.extend(extract_links_from_text(hf.Range.Text, line_offset, links))
                    line_offset += len(hf.Range.Text.split('\n'))
    except Exception as e:
        log(f"Error extracting links from DOC {file_path}: {e}")
    finally:
        if doc:
            doc.Close(False)
        if word:
            word.Quit()
    return links

def write_log_to_html():
    html_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link Update Log Report</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.5;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #eef2f3;
        }}
        h1 {{
            color: #2c3e50;
            text-align: center;
        }}
        h2 {{
            color: #2980b9;
        }}
        .log-container {{
            background-color: white;
            border-radius: 5px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }}
        .summary {{
            background-color: #34495e;
            color: white;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }}
        .log-entry {{
            border-bottom: 1px solid #ccc;
            padding: 10px 0;
        }}
        .timestamp {{
            color: #95a5a6;
            font-weight: bold;
            margin-right: 10px;
        }}
        .success {{ color: #27ae60; }}
        .error {{ color: #e74c3c; }}
        .link {{ color: #2980b9; text-decoration: none; }}
        .link:hover {{ text-decoration: underline; }}
        .divider {{ border-top: 1px dashed #ccc; margin: 20px 0; }}
    </style>
</head>
<body>
    <h1>Link Update Log Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Processed Files: <strong>{processed}</strong></p>
        <p>Updated Files: <strong>{updated}</strong></p>
        <p>Failed to Update Files: <strong>{failed}</strong></p>
        <p>Total Replacements: <strong>{replacements}</strong></p>
    </div>
    
    <div class="log-container">
        <h2>Log Entries</h2>
        {log_entries}
    </div>
    
    <p style="text-align: center; color: #7f8c8d;">
        Report generated on {generation_time}
    </p>
</body>
</html>
"""

    useful_entries = []
    processed = updated = failed = total_replacements = 0

    # Analyzing logs for summary and entries
    for entry in log_entries:
        if "Processed files:" in entry:
            processed = entry.split(":")[1].strip()
        elif "Updated files:" in entry:
            updated = entry.split(":")[1].strip()
        elif "Total replacements:" in entry:
            total_replacements = entry.split(":")[1].strip()
        elif "failed" in entry.lower():
            failed += 1  # Count failures
            useful_entries.append(entry)  # Include failures in log entries
        else:
            useful_entries.append(entry)

    formatted_entries = []
    for entry in useful_entries:
        timestamp_end = entry.find("]")
        timestamp = entry[:timestamp_end + 1]
        message = entry[timestamp_end + 2:]

        entry_class = "success" if "updated" in message.lower() else "error" if "error" in message.lower() or "failed" in message.lower() else "info"

        # Make URLs clickable
        urls = URL_REGEX.findall(message) + LOCAL_FILE_REGEX.findall(message)
        for url in set(urls):
            if url in message:
                message = message.replace(url, f'<a href="{url}" class="link" target="_blank">{url}</a>')

        formatted_entry = f"""
        <div class="log-entry">
            <span class="timestamp">{timestamp}</span>
            <span class="{entry_class}">{message}</span>
        </div>
        """
        formatted_entries.append(formatted_entry)

    html_content = html_template.format(
        log_entries="\n".join(formatted_entries),
        processed=processed,
        updated=updated,
        failed=failed,
        replacements=total_replacements,
        generation_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    )
    
    with open("link_update_report.html", "w", encoding="utf-8") as html_file:
        html_file.write(html_content)
    log(f"HTML report generated: link_update_report.html")

def scan_and_update_documents(base_path):
    processed = updated = total_replacements = 0
    log(f"Starting scan in: {base_path}")
    for root, _, files in os.walk(base_path):
        for file in files:
            # Skip temporary files
            if file.startswith("~$"):
                continue

            ext = os.path.splitext(file)[1].lower()
            if ext not in (".doc", ".docx"):
                continue

            full_path = os.path.join(root, file)
            processed += 1
            print(f"Processing: {full_path}")
            log(f"Processing [{processed}]: {full_path}")
            try:
                extractor = extract_docx_links if ext == ".docx" else extract_doc_links
                links = extractor(full_path)
                if not links:
                    log("No links found.")
                    continue

                replaceable_links = [(orig, repl) for orig, repl, *_ in links if repl]
                if not replaceable_links:
                    log("No replaceable links found.")
                    continue

                updater = update_docx_file if ext == ".docx" else update_doc_file
                if updater(full_path, replaceable_links):
                    updated += 1
                    total_replacements += len(replaceable_links)
                    log(f"Updated {len(replaceable_links)} links.")
            except Exception as e:
                log(f"[ERROR] {file}: {e}")

    log("=== Scan Complete ===")
    log(f"Processed files: {processed}")
    log(f"Updated files: {updated}")
    log(f"Total replacements: {total_replacements}")
    write_log_to_html()

if __name__ == "__main__":
    folder_path = input("Enter folder path: ").strip()
    if not folder_path or not os.path.exists(folder_path):
        print("Invalid folder path.")
        sys.exit(1)
    scan_and_update_documents(folder_path)
    print("Log written to link_update_report.html")
    print("Processing complete.")
