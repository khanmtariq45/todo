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