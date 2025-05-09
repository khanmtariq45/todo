def write_log_to_html():
    html_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link Update Log Report</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }}
        h1 {{
            color: #2c3e50;
            text-align: center;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }}
        .log-entry {{
            background-color: white;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }}
        .timestamp {{
            color: #7f8c8d;
            font-weight: bold;
            margin-right: 10px;
        }}
        .success {{
            color: #27ae60;
        }}
        .error {{
            color: #e74c3c;
        }}
        .info {{
            color: #3498db;
        }}
        .link {{
            color: #2980b9;
            text-decoration: none;
            word-break: break-all;
        }}
        .link:hover {{
            text-decoration: underline;
        }}
        .summary {{
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            border-radius: 5px;
            margin-top: 30px;
        }}
        .summary h2 {{
            margin-top: 0;
            border-bottom: 1px solid #3498db;
            padding-bottom: 10px;
        }}
        .stats {{
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
        }}
        .stat-box {{
            background-color: #34495e;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
            flex: 1;
            min-width: 200px;
            margin-right: 15px;
        }}
        .stat-box:last-child {{
            margin-right: 0;
        }}
        .stat-value {{
            font-size: 24px;
            font-weight: bold;
            color: #3498db;
        }}
        .divider {{
            border-top: 1px solid #ecf0f1;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <h1>Link Update Log Report</h1>
    
    {log_entries}
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="stats">
            <div class="stat-box">
                <div>Processed Files</div>
                <div class="stat-value">{processed}</div>
            </div>
            <div class="stat-box">
                <div>Updated Files</div>
                <div class="stat-value">{updated}</div>
            </div>
            <div class="stat-box">
                <div>Total Replacements</div>
                <div class="stat-value">{replacements}</div>
            </div>
        </div>
    </div>
    
    <div class="divider"></div>
    
    <p style="text-align: center; color: #7f8c8d;">
        Report generated on {generation_time}
    </p>
</body>
</html>
"""

    # Filter only useful entries (those containing links or errors)
    useful_entries = []
    processed = updated = replacements = 0
    
    for entry in log_entries:
        if any(keyword in entry.lower() for keyword in ["http://", "https://", "file://", "error", "failed", "replacement"]):
            useful_entries.append(entry)
    
    # Extract summary stats from the log
    for entry in log_entries:
        if "Processed files:" in entry:
            processed = entry.split(":")[1].strip()
        elif "Updated files:" in entry:
            updated = entry.split(":")[1].strip()
        elif "Total replacements:" in entry:
            replacements = entry.split(":")[1].strip()
    
    # Format each log entry
    formatted_entries = []
    for entry in useful_entries:
        timestamp_end = entry.find("]")
        timestamp = entry[:timestamp_end+1]
        message = entry[timestamp_end+2:]
        
        # Determine entry type for styling
        if "error" in message.lower() or "failed" in message.lower():
            entry_class = "error"
        elif "replacement" in message.lower() or "found" in message.lower():
            entry_class = "success"
        else:
            entry_class = "info"
        
        # Make URLs clickable
        urls = URL_REGEX.findall(message) + LOCAL_FILE_REGEX.findall(message)
        for url in set(urls):
            if url in message:
                message = message.replace(url, f'<a href="{url}" class="link" target="_blank">{url}</a>')
        
        formatted_entry = f"""
        <div class="log-entry">
            <span class="timestamp">{timestamp}</span>
            <span class="{entry_class}">{message}</span>
        </div>
        """
        formatted_entries.append(formatted_entry)
    
    # Fill the template
    html_content = html_template.format(
        log_entries="\n".join(formatted_entries),
        processed=processed,
        updated=updated,
        replacements=replacements,
        generation_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    )
    
    with open("link_update_report.html", "w", encoding="utf-8") as html_file:
        html_file.write(html_content)
    log(f"HTML report generated: link_update_report.html")

# Replace the original write_log_to_file function with this new one
write_log_to_file = write_log_to_html