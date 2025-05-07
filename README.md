import os
import re
import sys
from datetime import datetime
from docx import Document
from win32com import client

# Enhanced URL regex pattern to capture all types of links
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
    """Extract links from a paragraph, checking both hyperlinks and plain text URLs."""
    links = []
    text = paragraph.text.strip()
    
    if not text:
        return links

    # First check for proper hyperlinks
    if hasattr(paragraph, 'hyperlinks'):
        for hyperlink in paragraph.hyperlinks:
            try:
                if (hyperlink and 
                    hasattr(hyperlink, 'address') and 
                    hyperlink.address and 
                    str(hyperlink.address).strip()):
                    clean_url = str(hyperlink.address).strip()
                    links.append((clean_url, line_offset, "Hyperlink"))
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
            if not any(url in found_url for found_url, _, _ in links):
                clean_url = url.strip()
                links.append((clean_url, line_offset, "Text"))
    except Exception as e:
        print(f"Warning: Error processing text URLs - {str(e)}")

    return links

def extract_links_from_docx(path):
    """Extract links from .docx files using python-docx."""
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

        # Process headers and footers
        for section in doc.sections:
            for part in (section.header, section.footer):
                if part is not None:
                    for para in part.paragraphs:
                        links.extend(extract_text_and_links_from_paragraph(para, -1))

        # Process footnotes if present
        if hasattr(doc, 'footnotes'):
            for footnote in doc.footnotes:
                for para in footnote.paragraphs:
                    links.extend(extract_text_and_links_from_paragraph(para, -1))

        # Process endnotes if present
        if hasattr(doc, 'endnotes'):
            for endnote in doc.endnotes:
                for para in endnote.paragraphs:
                    links.extend(extract_text_and_links_from_paragraph(para, -1))

    except Exception as e:
        raise Exception(f"DOCX processing error: {str(e)}")

    return links

def extract_links_from_doc(path):
    """Extract links from .doc files using Word COM interface."""
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
                            if (hyperlink and 
                                hasattr(hyperlink, 'Address') and 
                                hyperlink.Address and 
                                str(hyperlink.Address).strip()):
                                clean_url = str(hyperlink.Address).strip()
                                links.append((clean_url, i, "Hyperlink"))
                        except Exception as e:
                            print(f"Warning: Error processing DOC hyperlink - {str(e)}")
                            continue

                # Then check for URL-like text
                matches = URL_REGEX.findall(text)
                for url in matches:
                    if not url:
                        continue
                    if not any(url in found_url for found_url, _, _ in links):
                        clean_url = url.strip()
                        links.append((clean_url, i, "Text"))
            except Exception as e:
                print(f"Warning: Error processing paragraph {i} - {str(e)}")
                continue

        # Process headers and footers
        for section in doc.Sections:
            for hf in [section.Headers(1), section.Footers(1)]:
                try:
                    if hf is not None:
                        text = hf.Range.Text.strip()
                        if not text:
                            continue

                        if hasattr(hf.Range, 'Hyperlinks'):
                            for hyperlink in hf.Range.Hyperlinks:
                                try:
                                    if (hyperlink and 
                                        hasattr(hyperlink, 'Address') and 
                                        hyperlink.Address and 
                                        str(hyperlink.Address).strip()):
                                        clean_url = str(hyperlink.Address).strip()
                                        links.append((clean_url, -1, "Hyperlink"))
                                except Exception as e:
                                    print(f"Warning: Error processing header/footer hyperlink - {str(e)}")
                                    continue

                        matches = URL_REGEX.findall(text)
                        for url in matches:
                            if not url:
                                continue
                            if not any(url in found_url for found_url, _, _ in links):
                                clean_url = url.strip()
                                links.append((clean_url, -1, "Text"))
                except Exception as e:
                    print(f"Warning: Error processing header/footer - {str(e)}")
                    continue

        # Process shapes (which might contain hyperlinks)
        if hasattr(doc, 'InlineShapes'):
            for shape in doc.InlineShapes:
                try:
                    if (shape is not None and 
                        hasattr(shape, 'Hyperlink') and 
                        shape.Hyperlink is not None and 
                        hasattr(shape.Hyperlink, 'Address') and 
                        shape.Hyperlink.Address and 
                        str(shape.Hyperlink.Address).strip()):
                        clean_url = str(shape.Hyperlink.Address).strip()
                        links.append((clean_url, -1, "Shape Hyperlink"))
                except Exception as e:
                    print(f"Warning: Error processing shape hyperlink - {str(e)}")
                    continue

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

def find_all_links(base_path):
    """Scan all Word documents in the specified directory and subdirectories."""
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
    """Generate an HTML report of all found links."""
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
        a {{ color: #2980b9; text-decoration: none; }}
        a:hover {{ text-decoration: underline; color: #e74c3c; }}
        .link-type {{ font-size: 0.8em; padding: 2px 5px; border-radius: 3px; margin-left: 5px; }}
        .link-type.hyperlink {{ background: #d5f5e3; color: #27ae60; }}
        .link-type.text {{ background: #fdebd0; color: #e67e22; }}
        .link-type.shape {{ background: #e8daef; color: #9b59b6; }}
        .location {{ font-size: 0.9em; color: #7f8c8d; }}
        ul {{ padding-left: 20px; }}
        li {{ margin-bottom: 8px; }}
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
        html += f'<div class="file"><h3>{file}</h3><ul>'
        for link, line, link_type in links:
            where = "Header/Footer/Shape" if line == -1 else f"Line {line}"
            type_class = link_type.lower().replace(" ", "-")
            html += (
                f"<li>"
                f"<span class='location'>{where}:</span> "
                f"<a href='{link}' target='_blank'>{link}</a> "
                f"<span class='link-type {type_class}'>{link_type}</span>"
                f"</li>"
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
            print("Error: The specified path does not exist.")
            sys.exit(1)

        output_file = "word_links_report.html"
        print("\nStarting link extraction process...")
        
        links, errors, total = find_all_links(base_path)
        
        print("\nGenerating report...")
        generate_html_log(links, errors, total, output_file)
        
        print("\nProcess completed successfully!")
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {str(e)}")
        sys.exit(1)