import os
from docx import Document
import win32com.client
from datetime import datetime

def extract_links_from_docx(path):
    links = []
    try:
        doc = Document(path)
        rels = doc.part._rels
        for rel in rels.values():
            if "hyperlink" in rel.reltype:
                links.append(rel.target_ref)
    except Exception as e:
        print(f"[DOCX Error] {path}: {e}")
    return links

def extract_links_from_doc(path):
    links = []
    try:
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(path, ReadOnly=True)

        for h in doc.Hyperlinks:
            links.append(h.Address)

        doc.Close(False)
        word.Quit()
    except Exception as e:
        print(f"[DOC Error] {path}: {e}")
    return links

def find_all_links(base_path):
    file_links = {}
    total = 0
    file_count = 0

    print(f"\nScanning Word files in: {base_path}\n")

    for root, dirs, files in os.walk(base_path):
        for file in files:
            full_path = os.path.join(root, file)
            ext = file.lower().split('.')[-1]

            if ext not in ["doc", "docx"]:
                continue

            file_count += 1
            print(f"[{file_count}] Processing: {full_path}")

            if ext == "docx":
                links = extract_links_from_docx(full_path)
            else:  # .doc
                links = extract_links_from_doc(full_path)

            if links:
                file_links[full_path] = links
                total += len(links)

    print(f"\nDone. Total files scanned: {file_count}")
    return file_links, total

def generate_html_log(file_links, total, output_path):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Word Link Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; background: #f9f9f9; color: #333; }}
        h1 {{ color: #2c3e50; }}
        .file-block {{ margin-bottom: 20px; padding: 10px; border-left: 5px solid #2980b9; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
        .file-path {{ font-weight: bold; color: #2980b9; word-break: break-all; }}
        .link-count {{ color: #27ae60; }}
        .link {{ display: block; margin-left: 10px; color: #2980b9; text-decoration: none; }}
        .link:hover {{ text-decoration: underline; }}
        .footer {{ margin-top: 30px; font-size: 1.2em; font-weight: bold; color: #c0392b; }}
    </style>
</head>
<body>
    <h1>Word Files Link Report</h1>
    <p>Generated on {timestamp}</p>
"""

    for file, links in file_links.items():
        html += f'<div class="file-block">'
        html += f'<div class="file-path">{file}</div>'
        html += f'<div class="link-count">Link Count: {len(links)}</div>'
        for link in links:
            html += f'<a class="link" href="{link}" target="_blank">{link}</a>'
        html += '</div>'

    html += f'<div class="footer">Total Links Found: {total}</div>'
    html += '</body></html>'

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"\nHTML log saved to: {output_path}")

# === Run Script ===
base_path = r"C:\Your\WordFiles\Folder"  # <--- Change to your base folder
output_html = "link_report.html"

results, total_count = find_all_links(base_path)
generate_html_log(results, total_count, output_html)