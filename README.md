import os
import re
import sys
import pyodbc
import urllib.parse
from datetime import datetime
from docx import Document
from win32com import client
from docx.opc.constants import RELATIONSHIP_TYPE as RT

# Regex patterns for URLs and local file paths
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

log_entries = []

def log(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_entries.append(f"[{timestamp}] {message}")

# Function definitions here...

def get_last_two_path_parts(path):
    path = urllib.parse.unquote(path)
    path = path.replace("\\", "/").rstrip("/")
    parts = path.split("/")
    return "/".join(parts[-2:]) if len(parts) >= 2 else path

def fetch_qms_file_id(filepath):
    # Database connection and fetching logic
    # ...

def is_local_file_url(url):
    # Determine if a URL is a local file URL
    # ...

def get_qms_replacement(url):
    # Get QMS replacement URL from database
    # ...

def process_hyperlink(hyperlink, line_offset, source_type, file_path):
    # Process hyperlinks in Word documents
    # ...

def extract_links_from_text(text, line_offset, existing_links):
    # Extract links from text
    # ...

def extract_paragraph_links(paragraph, line_offset, file_path):
    # Extract links from paragraphs in Word documents
    # ...

def update_hyperlink_relationships(doc, old_url, new_url, para, display_text=None):
    # Update hyperlink relationships in the Word document
    # ...

def update_docx_file(file_path, links_to_update):
    # Update hyperlinks in DOCX files
    # ...

def update_doc_file(file_path, links_to_update):
    # Update hyperlinks in DOC files
    # ...

def extract_docx_links(file_path):
    # Extract hyperlinks from DOCX files
    # ...

def extract_doc_links(file_path):
    # Extract hyperlinks from DOC files
    # ...

def write_log_to_html():
    bootstrap_css = 'https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css'

    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link Update Log Report</title>
    <link rel="stylesheet" href="{bootstrap_css}">
    <style>
        body {{
            font-family: Arial, sans-serif; /* Fixed font-family */
            background-color: #f8f9fa;
        }}
        h1 {{
            color: #343a40;
            margin-top: 20px;
            margin-bottom: 20px;
            text-align: center;
        }}
        .card {{
            margin-bottom: 20px;
        }}
        .timestamp {{
            font-weight: bold;
        }}
        .success {{ color: #28a745; }}
        .error {{ color: #dc3545; }}
        .info {{ color: #17a2b8; }}
        .link {{ color: #007bff; text-decoration: none; }}
        .link:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Link Update Log Report</h1>
        <div class="row">
            {log_entries}
        </div>
        <footer class="text-center">
            <p class="text-muted">Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </footer>
    </div>
</body>
</html>
"""

    formatted_entries = []
    for entry in log_entries:
        timestamp_end = entry.find("]")
        timestamp = entry[:timestamp_end + 1]
        message = entry[timestamp_end + 2:]

        # Determine entry class
        entry_class = "success" if "updated" in message.lower() else "error" if "error" in message.lower() or "failed" in message.lower() else "info"

        # Make URLs clickable
        urls = URL_REGEX.findall(message) + LOCAL_FILE_REGEX.findall(message)
        for url in set(urls):
            if url in message:
                message = message.replace(url, f'<a href="{url}" class="link" target="_blank">{url}</a>')

        # Add log entry to formatted entries as a Bootstrap card
        formatted_entries.append(f"""
        <div class="col-md-6">
            <div class="card border-{entry_class}">
                <div class="card-body">
                    <span class="timestamp">{timestamp}</span>
                    <span class="{entry_class}">{message}</span>
                </div>
            </div>
        </div>
        """)

    html_content = html_template.format(
        log_entries="\n".join(formatted_entries)
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
            log(f"Processing [{processed}]: {full_path}")
            try:
                extractor = extract_docx_links if ext == ".docx" else extract_doc_links
                links = extractor(full_path)
                if not links:
                    log(f"No links found in {full_path}.")
                    continue

                replaceable_links = [(orig, repl) for orig, repl, *_ in links if repl]
                if not replaceable_links:
                    log(f"No replaceable links found in {full_path}.")
                    continue

                updater = update_docx_file if ext == ".docx" else update_doc_file
                if updater(full_path, replaceable_links):
                    updated += 1
                    total_replacements += len(replaceable_links)
                    log(f"Updated {len(replaceable_links)} links in {full_path}.")
                else:
                    log(f"No updates made for {full_path}.")
            except Exception as e:
                log(f"[ERROR] {file}: {e}")

    log("=== Scan Complete ===")
    log(f"Processed files: {processed}.")
    log(f"Updated files: {updated}.")
    log(f"Total replacements: {total_replacements}.")
    write_log_to_html()

if __name__ == "__main__":
    folder_path = input("Enter folder path: ").strip()
    if not folder_path or not os.path.exists(folder_path):
        print("Invalid folder path.")
        sys.exit(1)
    scan_and_update_documents(folder_path)
    print("Log written to link_update_report.html")
    print("Processing complete.")
