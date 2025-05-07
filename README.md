import os
import sys
from docx import Document
import win32com.client
from datetime import datetime

def extract_links_from_docx(path):
    links_with_lines = []
    try:
        doc = Document(path)
        for i, para in enumerate(doc.paragraphs, 1):
            for rel in doc.part._rels.values():
                if "hyperlink" in rel.reltype and rel.target_ref in para.text:
                    links_with_lines.append((rel.target_ref, i))
    except Exception as e:
        raise Exception(f"DOCX parse error: {e}")
    return links_with_lines

def extract_links_from_doc(path):
    links_with_lines = []
    try:
        word = win32com.client.Dispatch("Word.Application")
        doc = word.Documents.Open(path, ReadOnly=True)

        for i, para in enumerate(doc.Paragraphs, 1):
            text = para.Range.Text
            for h in doc.Hyperlinks:
                if h.Address and h.Address in text:
                    links_with_lines.append((h.Address, i))

        doc.Close(False)
        word.Quit()
    except Exception as e:
        raise Exception(f"DOC parse error: {e}")
    return links_with_lines

def find_all_links(base_path):
    file_links = {}
    error_files = []
    total_links = 0
    file_count = 0

    print(f"\nScanning Word files in: {base_path}\n")

    for root, _, files in os.walk(base_path):
        for file in files:
            full_path = os.path.join(root, file)
            ext = file.lower().split('.')[-1]

            if ext not in ["doc", "docx"]:
                continue

            file_count += 1
            print(f"[{file_count}] Processing: {full_path}")

            try:
                if ext == "docx":
                    links = extract_links_from_docx(full_path)
                else:
                    links = extract_links_from_doc(full_path)

                if links:
                    file_links[full_path] = links
                    total_links += len(links)

            except Exception as e:
                print(f"[ERROR] {full_path}: {e}")
                error_files.append((full_path, str(e)))

    return file_links, error_files, total_links

def generate_html_log(file_links, error_files, total, output_path):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Word Link Report</title>
    <style>
        body {{
            font-family: 'Segoe UI', sans-serif;
            background: #f5f7fa;
            padding: 30px;
            color: #333;
        }}
        h1 {{
            color: #2c3e50;
        }}
        .summary {{
            background-color: #d9edf7;
            padding: 15px;
            border-left: 5px solid #31708f;
            margin-bottom: 25px;
            font-size: 1.2em;
        }}
        .error {{
            background-color: #f2dede;
            padding: 10px;
            border-left: 5px solid #a94442;
            margin-bottom: 20px;
        }}
        .file {{
            background-color: #fff;
            border-left: 5px solid #3498db;
            margin-bottom: 20px;
            padding: 15px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }}
        .file .path {{
            font-weight: bold;
            color: #2980b9;
            word-wrap: break-word;
        }}
        .file .count {{
            color: #27ae60;
            margin: 8px 0;
        }}
        .file a {{
            display: block;
            margin-left: 10px;
            color: #2980b9;
            text-decoration: none;
        }}
        .file a:hover {{
            text-decoration: underline;
        }}
        .footer {{
            margin-top: 40px;
            font-size: 1.1em;
            color: #999;
        }}
    </style>
</head>
<body>
    <h1>Word File Link Report</h1>
    <div class="summary">
        <strong>Total Links Found:</strong> {total}<br>
        <strong>Generated:</strong> {timestamp}
    </div>
"""

    if error_files:
        html += '<div class="error"><strong>Files with Errors (manual check needed):</strong><ul>'
        for file, msg in error_files:
            html += f"<li>{file} - <em>{msg}</em></li>"
        html += '</ul></div>'

    for file, links in file_links.items():
        html += f'<div class="file">'
        html += f'<div class="path">File: {file}</div>'
        html += f'<div class="count">Links: {len(links)}</div>'
        for link, line in links:
            html += f'<a href="{link}" target="_blank">Line {line}: {link}</a>'
        html += '</div>'

    html += f'<div class="footer">End of Report</div>'
    html += '</body></html>'

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"\nHTML report saved at: {output_path}")

# === MAIN EXECUTION ===
if __name__ == "__main__":
    try:
        base_path = input("Enter the base folder path: ").strip()
        if not os.path.exists(base_path):
            print("Invalid path. Exiting.")
            sys.exit(1)

        output_html = "word_links_report.html"
        links, errors, total_count = find_all_links(base_path)
        generate_html_log(links, errors, total_count, output_html)
    except KeyboardInterrupt:
        print("\nCancelled by user.")