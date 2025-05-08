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
    
    # Generate the error section if there are errors
    error_section = ""
    if error_files:
        error_items = "".join(
            f"""<div class="error-item">
                <div class="error-path">
                    <i class="fas fa-file"></i> {file}
                </div>
                <div class="error-message">{msg}</div>
            </div>"""
            for file, msg in error_files
        )
        error_section = f"""
        <section class="error-section">
            <h2 class="section-title">
                <i class="fas fa-exclamation-circle"></i>
                Files with Processing Errors
            </h2>
            <div class="error-list">
                {error_items}
            </div>
        </section>"""

    # Generate the file sections if there are files with links
    file_sections = ""
    if file_links:
        file_sections = "".join(
            f"""
            <div class="file-section">
                <div class="file-header">
                    <div class="file-path">
                        <i class="fas fa-file-alt"></i>
                        {file}
                    </div>
                    <div class="file-link-count">
                        {len(links)} { 'link' if len(links) == 1 else 'links' }
                    </div>
                </div>
                <div class="links-container">
                    {"".join(
                        f"""
                        <div class="link-item">
                            <div class="link-location">
                                <i class="fas fa-map-marker-alt"></i>
                                { "Header/Footer/Shape" if line == -1 else f"Line {line}" }
                            </div>
                            <div class="link-content">
                                <div class="link-display">{display_text}</div>
                                <a href="{link}" target="_blank" class="link-url">
                                    <i class="fas fa-external-link-alt"></i>
                                    {link}
                                </a>
                                <span class="link-type type-{link_type.lower().replace(' ', '-')}">
                                    <i class="fas fa-{'link' if link_type == 'Hyperlink' else 'font' if link_type == 'Text' else 'image'}"></i>
                                    {link_type}
                                </span>
                            </div>
                        </div>
                        """
                        for link, line, link_type, display_text in links
                    )}
                </div>
            </div>
            """
            for file, links in file_links.items()
        )
    else:
        file_sections = """
        <div class="empty-state">
            <i class="fas fa-folder-open"></i>
            <h3>No links found in documents</h3>
            <p>No Word documents with links were found in the specified directory.</p>
        </div>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Word Document Link Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        /* CSS styles remain exactly the same as in the previous version */
        :root {{
            --primary: #4f46e5;
            --primary-light: #6366f1;
            --secondary: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --background: #f9fafb;
            --card-bg: #ffffff;
            --text: #111827;
            --text-light: #6b7280;
            --border: #e5e7eb;
            --success-bg: #ecfdf5;
            --error-bg: #fef2f2;
            --hyperlink-bg: #e0e7ff;
            --text-hyperlink: #4338ca;
            --shape-bg: #f3e8ff;
            --text-shape: #7e22ce;
        }}

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}

        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 
                        'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 
                        'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            background-color: var(--background);
            color: var(--text);
            padding: 2rem 1rem;
        }}

        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}

        header {{
            text-align: center;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid var(--border);
        }}

        .logo {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }}

        .logo-icon {{
            background-color: var(--primary);
            color: white;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }}

        h1 {{
            font-size: 2rem;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 0.5rem;
        }}

        .subtitle {{
            color: var(--text-light);
            font-size: 1rem;
            margin-bottom: 1.5rem;
        }}

        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }}

        .stat-card {{
            background: var(--card-bg);
            padding: 1.5rem;
            border-radius: 0.75rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            border-left: 4px solid var(--primary);
            transition: transform 0.2s ease;
        }}

        .stat-card:hover {{
            transform: translateY(-2px);
        }}

        .stat-card.success {{
            border-left-color: var(--secondary);
        }}

        .stat-card.warning {{
            border-left-color: var(--warning);
        }}

        .stat-card.error {{
            border-left-color: var(--danger);
        }}

        .stat-title {{
            font-size: 0.875rem;
            color: var(--text-light);
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}

        .stat-value {{
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text);
        }}

        .section-title {{
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }}

        .section-title i {{
            color: var(--primary);
        }}

        .error-section {{
            background-color: var(--error-bg);
            padding: 1.5rem;
            border-radius: 0.75rem;
            margin-bottom: 3rem;
            border-left: 4px solid var(--danger);
        }}

        .error-item {{
            padding: 1rem;
            background-color: white;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            border-left: 3px solid var(--danger);
        }}

        .error-item:last-child {{
            margin-bottom: 0;
        }}

        .error-path {{
            font-weight: 600;
            color: var(--danger);
            margin-bottom: 0.5rem;
        }}

        .error-message {{
            color: var(--text);
            font-size: 0.9rem;
        }}

        .file-section {{
            background-color: var(--card-bg);
            border-radius: 0.75rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            margin-bottom: 2rem;
            overflow: hidden;
        }}

        .file-header {{
            padding: 1.25rem 1.5rem;
            background-color: var(--primary-light);
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}

        .file-path {{
            font-weight: 500;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }}

        .file-link-count {{
            background-color: white;
            color: var(--primary);
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            font-size: 0.875rem;
            font-weight: 600;
        }}

        .links-container {{
            padding: 1.5rem;
        }}

        .link-item {{
            padding: 1.25rem;
            border-radius: 0.5rem;
            background-color: white;
            margin-bottom: 1rem;
            border: 1px solid var(--border);
            transition: all 0.2s ease;
        }}

        .link-item:hover {{
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            transform: translateY(-1px);
        }}

        .link-item:last-child {{
            margin-bottom: 0;
        }}

        .link-location {{
            font-size: 0.75rem;
            color: var(--text-light);
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}

        .link-content {{
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }}

        .link-display {{
            font-weight: 500;
            color: var(--text);
            word-break: break-word;
        }}

        .link-url {{
            font-size: 0.875rem;
            color: var(--primary);
            text-decoration: none;
            word-break: break-all;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}

        .link-url:hover {{
            text-decoration: underline;
        }}

        .link-type {{
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
            border-radius: 999px;
            margin-top: 0.5rem;
        }}

        .type-hyperlink {{
            background-color: var(--hyperlink-bg);
            color: var(--text-hyperlink);
        }}

        .type-text {{
            background-color: var(--success-bg);
            color: var(--secondary);
        }}

        .type-shape {{
            background-color: var(--shape-bg);
            color: var(--text-shape);
        }}

        footer {{
            margin-top: 4rem;
            padding-top: 2rem;
            border-top: 1px solid var(--border);
            text-align: center;
            color: var(--text-light);
            font-size: 0.875rem;
        }}

        .empty-state {{
            text-align: center;
            padding: 3rem;
            color: var(--text-light);
        }}

        .empty-state i {{
            font-size: 2rem;
            margin-bottom: 1rem;
            color: var(--border);
        }}

        @media (max-width: 768px) {{
            body {{
                padding: 1rem 0.5rem;
            }}
            
            .stats-grid {{
                grid-template-columns: 1fr;
            }}
            
            .file-header {{
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="logo">
                <div class="logo-icon">
                    <i class="fas fa-link"></i>
                </div>
                <h1>Word Document Link Report</h1>
            </div>
            <p class="subtitle">Generated on {timestamp}</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-title">
                    <i class="fas fa-link"></i>
                    Total Links Found
                </div>
                <div class="stat-value">{total}</div>
            </div>
            <div class="stat-card success">
                <div class="stat-title">
                    <i class="fas fa-file-alt"></i>
                    Files Processed
                </div>
                <div class="stat-value">{len(file_links)}</div>
            </div>
            <div class="stat-card error">
                <div class="stat-title">
                    <i class="fas fa-exclamation-triangle"></i>
                    Files with Errors
                </div>
                <div class="stat-value">{len(error_files)}</div>
            </div>
        </div>

        {error_section}

        <section>
            <h2 class="section-title">
                <i class="fas fa-file-word"></i>
                Document Links
            </h2>
            {file_sections}
        </section>

        <footer>
            <p>Report generated by Word Link Extractor</p>
            <p><i class="far fa-clock"></i> {timestamp}</p>
        </footer>
    </div>
</body>
</html>"""

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
