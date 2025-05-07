import os
import re
import sys
from datetime import datetime
from docx import Document
from win32com import client

# Enhanced URL regex pattern
URL_REGEX = re.compile(
    r'('
    r'https?://[^\s<>"\'{}|\\^`[\]]+'  # Standard http/https URLs
    r'|www\.[^\s<>"\'{}|\\^`[\]]+'     # www. URLs without protocol
    r'|ftp://[^\s<>"\'{}|\\^`[\]]+'    # FTP URLs
    r'|mailto:[^\s<>"\'{}|\\^`[\]]+'   # mailto links
    r'|\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b'  # Email addresses
    r'|\\\\[^\s<>"\'{}|\\^`[\]]+'      # Network paths (\\server\path)
    r'|file://[^\s<>"\'{}|\\^`[\]]+'   # file:// URLs
    r'|tel:[^\s<>"\'{}|\\^`[\]]+'      # Telephone links
    r')',
    re.IGNORECASE
)

def extract_text_and_links_from_paragraph(paragraph, line_offset=0):
    """Extract links with both display text and target URLs."""
    links = []
    text = paragraph.text.strip()
    
    if not text:
        return links

    # First check for proper hyperlinks
    if hasattr(paragraph, 'hyperlinks'):
        for hyperlink in paragraph.hyperlinks:
            try:
                if hyperlink and hasattr(hyperlink, 'address') and hyperlink.address:
                    display_text = paragraph.text if not hyperlink.text else hyperlink.text
                    clean_url = str(hyperlink.address).strip()
                    clean_text = str(display_text).strip()
                    links.append((clean_text, clean_url, line_offset, "Hyperlink"))
            except Exception as e:
                print(f"Warning: Error processing hyperlink - {str(e)}")
                continue

    # Then check for URL-like text patterns
    try:
        matches = URL_REGEX.findall(text)
        for url in matches:
            if not url:
                continue
                
            # Skip if this URL was already found as a hyperlink
            if not any(url in found_url for _, found_url, _, _ in links):
                clean_url = url.strip()
                links.append((clean_url, clean_url, line_offset, "Text"))
    except Exception as e:
        print(f"Warning: Error processing text URLs - {str(e)}")

    return links

def extract_links_from_docx(path):
    """Extract links from .docx files with display text."""
    links = []
    try:
        doc = Document(path)
        line_num = 1

        # Process main document paragraphs
        for para in doc.paragraphs:
            links.extend(extract_text_and_links_from_paragraph(para, line_num))
            line_num += 1

        # Process tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        links.extend(extract_text_and_links_from_paragraph(para, line_num))
                        line_num += 1

        # Process headers, footers, footnotes, etc. (same as before)
        # ... [rest of the docx processing code remains the same]

    except Exception as e:
        raise Exception(f"DOCX processing error: {str(e)}")

    return links

def extract_links_from_doc(path):
    """Extract links from .doc files with display text."""
    links = []
    word = None
    doc = None
    
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(path), ReadOnly=True, Visible=False)

        # Process main document content
        for i, para in enumerate(doc.Paragraphs, 1):
            try:
                text = para.Range.Text.strip()
                if not text:
                    continue

                # Check hyperlinks first
                if hasattr(para.Range, 'Hyperlinks'):
                    for hyperlink in para.Range.Hyperlinks:
                        try:
                            if hyperlink and hasattr(hyperlink, 'Address') and hyperlink.Address:
                                display_text = hyperlink.TextToDisplay if hasattr(hyperlink, 'TextToDisplay') else para.Range.Text
                                clean_url = str(hyperlink.Address).strip()
                                clean_text = str(display_text).strip()
                                links.append((clean_text, clean_url, i, "Hyperlink"))
                        except Exception as e:
                            print(f"Warning: Error processing DOC hyperlink - {str(e)}")
                            continue

                # Then check for URL-like text
                matches = URL_REGEX.findall(text)
                for url in matches:
                    if not url:
                        continue
                    if not any(url in found_url for _, found_url, _, _ in links):
                        clean_url = url.strip()
                        links.append((clean_url, clean_url, i, "Text"))
            except Exception as e:
                print(f"Warning: Error processing paragraph {i} - {str(e)}")
                continue

        # ... [rest of the doc processing code remains the same]

    except Exception as e:
        raise Exception(f"DOC processing error: {str(e)}")
    finally:
        try:
            if doc:
                doc.Close(False)
            if word:
                word.Quit()
        except Exception as e:
            print(f"Warning: Error closing Word application - {str(e)}")

    return links

def generate_html_log(file_links, error_files, total, output_path):
    """Generate an HTML report showing both display text and URLs."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Word Link Report</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f9; padding: 30px; line-height: 1.6; }}
        h1 {{ color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
        .summary {{ background: #e8f4fc; padding: 15px; border-left: 5px solid #3498db; margin-bottom: 20px; border-radius: 0 5px 5px 0; }}
        .error {{ background: #fdeaea; padding: 15px; border-left: 5px solid #e74c3c; margin-bottom: 20px; border-radius: 0 5px 5px 0; }}
        .file {{ background: #fff; border-left: 5px solid #2ecc71; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 0 5px 5px 0; }}
        .footer {{ margin-top: 40px; font-size: 0.9em; color: #7f8c8d; text-align: center; }}
        .link-container {{ display: flex; margin-bottom: 8px; }}
        .link-text {{ flex: 1; font-weight: bold; }}
        .link-url {{ flex: 2; color: #2980b9; word-break: break-all; }}
        a {{ color: #2980b9; text-decoration: none; }}
        a:hover {{ text-decoration: underline; color: #e74c3c; }}
        .link-type {{ font-size: 0.8em; padding: 2px 5px; border-radius: 3px; margin-left: 5px; }}
        .link-type.hyperlink {{ background: #d5f5e3; color: #27ae60; }}
        .link-type.text {{ background: #fdebd0; color: #e67e22; }}
        .link-type.shape {{ background: #e8daef; color: #9b59b6; }}
        .location {{ font-size: 0.9em; color: #7f8c8d; margin-bottom: 5px; }}
        .stats {{ display: flex; justify-content: space-between; margin-top: 10px; }}
        .stat-box {{ background: white; padding: 10px; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; margin: 0 5px; text-align: center; }}
    </style>
</head>
<body>
    <h1>Word Files Hyperlink Report</h1>
    <div class="summary">
        <div class="stats">
            <div class="stat-box">
                <strong>Total Links Found:</strong> {total}
            </div>
            <div class="stat-box">
                <strong>Files Processed:</strong> {len(file_links)}
            </div>
            <div class="stat-box">
                <strong>Files with Errors:</strong> {len(error_files)}
            </div>
        </div>
        <p><strong>Generated At:</strong> {timestamp}</p>
    </div>
"""

    if error_files:
        html += '<div class="error"><h3>Files with Errors:</h3><ul>'
        for file, msg in error_files:
            html += f"<li><strong>{file}</strong><br>{msg}</li>"
        html += '</ul></div>'

    for file, links in file_links.items():
        html += f'<div class="file"><h3>{file}</h3>'
        for display_text, url, line, link_type in links:
            where = "Header/Footer/Shape" if line == -1 else f"Line {line}"
            type_class = link_type.lower().replace(" ", "-")
            html += f"""
            <div class="link-container">
                <div class="location">{where}:</div>
            </div>
            <div class="link-container">
                <div class="link-text">{display_text}</div>
                <div class="link-url">
                    <a href="{url}" target="_blank">{url}</a>
                    <span class="link-type {type_class}">{link_type}</span>
                </div>
            </div>
            """
        html += "</div>"

    html += '<div class="footer">Report generated by Word Link Extractor</div></body></html>'

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"\nReport saved to: {output_path}")

# [Rest of the main code remains the same]