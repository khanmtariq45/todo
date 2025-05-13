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

# ... Existing function definitions ...

def write_log_to_html():
    bootstrap_css = 'https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css'

    # Using a template with clearly defined replacements
    html_template = """<!DOCTYPE html>
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
            <p class="text-muted">Report generated on {generation_time}</p>
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
        log_entries="\n".join(formatted_entries), 
        bootstrap_css=bootstrap_css,
        generation_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    )
    
    with open("link_update_report.html", "w", encoding="utf-8") as html_file:
        html_file.write(html_content)
    log(f"HTML report generated: link_update_report.html")

# ... Remaining functions and main execution ...

if __name__ == "__main__":
    folder_path = input("Enter folder path: ").strip()
    if not folder_path or not os.path.exists(folder_path):
        print("Invalid folder path.")
        sys.exit(1)
    scan_and_update_documents(folder_path)
    print("Log written to link_update_report.html")
    print("Processing complete.")
