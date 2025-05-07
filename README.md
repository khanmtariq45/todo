import os
import re
import sys
from datetime import datetime
from docx import Document
from win32com import client

URL_REGEX = re.compile(r'(https?://\S+|www\.\S+|mailto:\S+|file://\S+)', re.IGNORECASE)

def extract_text_and_links_from_paragraph(paragraph, line_offset=0):
    links = []
    text = paragraph.text.strip()
    if text:
        matches = URL_REGEX.findall(text)
        for url in matches:
            links.append((url, line_offset))
    return links

def extract_links_from_docx(path):
    links = []
    try:
        doc = Document(path)
        line_num = 1

        # Body paragraphs
        for para in doc.paragraphs:
            links.extend(extract_text_and_links_from_paragraph(para, line_num))
            line_num += 1

        # Tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        links.extend(extract_text_and_links_from_paragraph(para, line_num))
                        line_num += 1

        # Headers and footers
        for section in doc.sections:
            for part in (section.header, section.footer):
                for para in part.paragraphs:
                    links.extend(extract_text_and_links_from_paragraph(para, -1))
    except Exception as e:
        raise Exception(f"DOCX error: {e}")
    return links

def extract_links_from_doc(path):
    links = []
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(path, ReadOnly=True)

        for i, para in enumerate(doc.Paragraphs, 1):
            text = para.Range.Text.strip()
            matches = URL_REGEX.findall(text)
            for url in matches:
                links.append((url, i))

        # Headers and footers
        for section in doc.Sections:
            for hf in [section.Headers(1), section.Footers(1)]:
                text = hf.Range.Text.strip()
                matches = URL_REGEX.findall(text)
                for url in matches:
                    links.append((url, -1))

        doc.Close(False)
        word.Quit()
    except Exception as e:
        raise Exception(f"DOC error: {e}")
    return links

def find_all_links(base_path):
    file_links = {}
    error_files = []
    total_links = 0
    file_count = 0

    print(f"\nScanning: {base_path}\n")

    for root, _, files in os.walk(base_path):
        for file in files:
            ext = file.lower().split('.')[-1]
            if ext not in ["doc", "docx"]:
                continue

            full_path = os.path.join(root, file)
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
                error_files.append((full_path, str(e)))
                print(f"[ERROR] {file}: {e}")

    return file_links, error_files, total_links

def generate_html_log(file_links, error_files, total, output_path):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Word Link Report</title>
    <style>
        body {{ font-family: 'Segoe UI'; background: #f4f4f9; padding: 30px; }}
        h1 {{ color: #2c3e50; }}
        .summary {{ background: #dff0d8; padding: 15px; border-left: 5px solid #3c763d; margin-bottom: 20px; }}
        .error {{ background: #f2dede; padding: 15px; border-left: 5px solid #a94442; margin-bottom: 20px; }}
        .file {{ background: #fff; border-left: 5px solid #3498db; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
        .footer {{ margin-top: 40px; font-size: 0.9em; color: #999; }}
        a {{ color: #2980b9; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
    <h1>Word Files Hyperlink Report</h1>
    <div class="summary">
        <strong>Total Links Found:</strong> {total}<br>
        <strong>Generated At:</strong> {timestamp}
    </div>
"""

    if error_files:
        html += '<div class="error"><strong>Files with Errors:</strong><ul>'
        for file, msg in error_files:
            html += f"<li>{file} - {msg}</li>"
        html += '</ul></div>'

    for file, links in file_links.items():
        html += f'<div class="file"><strong>{file}</strong><br><ul>'
        for link, line in links:
            where = "Header/Footer" if line == -1 else f"Line {line}"
            html += f"<li>{where}: <a href='{link}' target='_blank'>{link}</a></li>"
        html += "</ul></div>"

    html += '<div class="footer">End of Report</div></body></html>'

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"\nReport saved to: {output_path}")

if __name__ == "__main__":
    try:
        base_path = input("Enter the base folder path: ").strip()
        if not os.path.exists(base_path):
            print("Invalid path.")
            sys.exit(1)

        output_file = "word_links_report.html"
        links, errors, total = find_all_links(base_path)
        generate_html_log(links, errors, total, output_file)
    except KeyboardInterrupt:
        print("\nOperation cancelled.")