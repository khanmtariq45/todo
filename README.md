I have a script

import os
import re
import sys
from datetime import datetime
from docx import Document
from win32com import client

URL_REGEX = re.compile(
    r'('
    r'https?://[^\s<>"\'{}|\\^`[]+'
    r'|www\.[^\s<>"\'{}|\\^`[]+'
    r'|ftp://[^\s<>"\'{}|\\^`[]+'
    r'|mailto:[^\s<>"\'{}|\\^`[]+'
    r'|\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b'
    r'|\\\^\s<>"\'{}|\\^`[]+'
    r'|file://[^\s<>"\'{}|\\^`[]+'
    r'|tel:[^\s<>"\'{}|\\^`[]+'
    r')',
    re.IGNORECASE
)

def extract_text_and_links_from_paragraph(paragraph, line_offset=0):
    links = []
    text = paragraph.text.strip()
    if not text:
        return links

    if hasattr(paragraph, 'hyperlinks'):
        for hyperlink in paragraph.hyperlinks:
            try:
                if hyperlink and hasattr(hyperlink, 'address') and hyperlink.address:
                    clean_url = hyperlink.address.strip()
                    display_text = hyperlink.text.strip() if hasattr(hyperlink, 'text') else clean_url
                    links.append((clean_url, line_offset, "Hyperlink", display_text))
            except Exception as e:
                print(f"Warning: Hyperlink error - {e}")

    try:
        matches = URL_REGEX.findall(text)
        for url in matches:
            if url and not any(url in found_url for found_url, _, _, _ in links):
                clean_url = url.strip()
                links.append((clean_url, line_offset, "Text", clean_url))
    except Exception as e:
        print(f"Warning: Regex error - {e}")

    return links

def extract_links_from_docx(path):
    links = []
    try:
        doc = Document(path)
        line_num = 1

        for para in doc.paragraphs:
            links.extend(extract_text_and_links_from_paragraph(para, line_num))
            line_num += 1

        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        links.extend(extract_text_and_links_from_paragraph(para, line_num))
                        line_num += 1

        for section in doc.sections:
            for part in (section.header, section.footer):
                if part is not None:
                    for para in part.paragraphs:
                        links.extend(extract_text_and_links_from_paragraph(para, -1))

    except Exception as e:
        raise Exception(f"DOCX error: {e}")
    return links

def extract_links_from_doc(path):
    links = []
    word = None
    doc = None
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(path), ReadOnly=True, Visible=False)

        for i, para in enumerate(doc.Paragraphs, 1):
            text = para.Range.Text.strip()
            if not text:
                continue

            if hasattr(para.Range, 'Hyperlinks'):
                for hyperlink in para.Range.Hyperlinks:
                    try:
                        if hyperlink and hasattr(hyperlink, 'Address') and hyperlink.Address:
                            clean_url = hyperlink.Address.strip()
                            display_text = hyperlink.TextToDisplay.strip() if hasattr(hyperlink, 'TextToDisplay') else clean_url
                            links.append((clean_url, i, "Hyperlink", display_text))
                    except Exception as e:
                        print(f"Warning: Hyperlink error - {e}")

            matches = URL_REGEX.findall(text)
            for url in matches:
                if url and not any(url in found_url for found_url, _, _, _ in links):
                    clean_url = url.strip()
                    links.append((clean_url, i, "Text", clean_url))

        for section in doc.Sections:
            for hf in [section.Headers(1), section.Footers(1)]:
                try:
                    if hf:
                        text = hf.Range.Text.strip()
                        if not text:
                            continue
                        if hasattr(hf.Range, 'Hyperlinks'):
                            for hyperlink in hf.Range.Hyperlinks:
                                if hyperlink and hasattr(hyperlink, 'Address') and hyperlink.Address:
                                    clean_url = hyperlink.Address.strip()
                                    display_text = hyperlink.TextToDisplay.strip() if hasattr(hyperlink, 'TextToDisplay') else clean_url
                                    links.append((clean_url, -1, "Hyperlink", display_text))

                        matches = URL_REGEX.findall(text)
                        for url in matches:
                            if url and not any(url in found_url for found_url, _, _, _ in links):
                                clean_url = url.strip()
                                links.append((clean_url, -1, "Text", clean_url))
                except Exception as e:
                    print(f"Warning: Header/Footer error - {e}")

        if hasattr(doc, 'InlineShapes'):
            for shape in doc.InlineShapes:
                try:
                    if shape and hasattr(shape, 'Hyperlink') and shape.Hyperlink and shape.Hyperlink.Address:
                        clean_url = shape.Hyperlink.Address.strip()
                        display_text = clean_url
                        links.append((clean_url, -1, "Shape Hyperlink", display_text))
                except Exception as e:
                    print(f"Warning: Shape hyperlink error - {e}")

    except Exception as e:
        raise Exception(f"DOC error: {e}")
    finally:
        if doc:
            doc.Close(False)
        if word:
            word.Quit()
    return links

def find_all_links(base_path):
    file_links = {}
    error_files = []
    total_links = 0
    file_count = 0

    print(f"\nScanning: {base_path}\n")

    for root, _, files in os.walk(base_path):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in [".doc", ".docx"]:
                continue

            full_path = os.path.join(root, file)
            file_count += 1
            print(f"[{file_count}] Processing: {full_path}")

            try:
                if ext == ".docx":
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
        body {{ font-family: 'Segoe UI', Arial; background: #f4f4f9; padding: 30px; }}
        h1 {{ color: #2c3e50; border-bottom: 2px solid #3498db; }}
        .summary, .error, .file {{ padding: 15px; margin-bottom: 20px; border-radius: 5px; }}
        .summary {{ background: #e8f4fc; border-left: 5px solid #3498db; }}
        .error {{ background: #fdeaea; border-left: 5px solid #e74c3c; }}
        .file {{ background: #fff; border-left: 5px solid #2ecc71; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
        .footer {{ margin-top: 40px; font-size: 0.9em; color: #7f8c8d; text-align: center; }}
        a {{ color: #2980b9; text-decoration: none; }}
        a:hover {{ text-decoration: underline; color: #e74c3c; }}
        .link-type {{ font-size: 0.8em; padding: 2px 5px; border-radius: 3px; margin-left: 5px; }}
        .hyperlink {{ background: #d5f5e3; color: #27ae60; }}
        .text {{ background: #fdebd0; color: #e67e22; }}
        .shape-hyperlink {{ background: #e8daef; color: #9b59b6; }}
        .location {{ font-size: 0.9em; color: #7f8c8d; }}
        ul {{ padding-left: 20px; }}
    </style>
</head>
<body>
    <h1>Word Files Hyperlink Report</h1>
    <div class="summary">
        <p><strong>Total Links Found:</strong> {total}</p>
        <p><strong>Files Processed:</strong> {len(file_links)}</p>
        <p><strong>Files with Errors:</strong> {len(error_files)}</p>
        <p><strong>Generated At:</strong> {timestamp}</p>
    </div>
"""

    if error_files:
        html += '<div class="error"><h3>Files with Errors:</h3><ul>'
        for file, msg in error_files:
            html += f"<li><strong>{file}</strong><br>{msg}</li>"
        html += '</ul></div>'

    for file, links in file_links.items():
        html += f'<div class="file"><h3>{file}</h3><ul>'
        for link, line, link_type, display_text in links:
            where = "Header/Footer/Shape" if line == -1 else f"Line {line}"
            type_class = link_type.lower().replace(" ", "-")
            html += (
                f"<li><span class='location'>{where}:</span> "
                f"<a href='{link}' target='_blank' title='{link}'>{link} {display_text}</a> "
                f"<span class='link-type {type_class}'>{link_type}</span></li>"
            )
        html += "</ul></div>"

    html += '<div class="footer">Report generated by Word Link Extractor</div></body></html>'

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"\nReport saved to: {output_path}")

if __name__ == "__main__":
    try:
        base_path = input("Enter the base folder path: ").strip()
        if not os.path.exists(base_path):
            print("Error: Path does not exist.")
            sys.exit(1)

        output_file = "word_links_report.html"
        print("\nExtracting links...")
        links, errors, total = find_all_links(base_path)
        print("\nGenerating report...")
        generate_html_log(links, errors, total, output_file)
        print("\nDone!")
    except KeyboardInterrupt:
        print("\nCancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {str(e)}")
        sys.exit(1)
