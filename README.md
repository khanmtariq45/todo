for file, links in file_links.items():
    html += f'<div class="file"><h3>{file}</h3><ul>'
    for link, line, link_type, display_text in links:
        where = "Header/Footer/Shape" if line == -1 else f"Line {line}"
        type_class = link_type.lower().replace(" ", "-")
        html += f"""
        <li class="link-block">
            <span class="location">{where}</span>
            <span class="display-text">{display_text}</span>
            <a class="actual-link" href="{link}" target="_blank">{link}</a>
            <span class="link-type {type_class}">{link_type}</span>
        </li>
        """
    html += "</ul></div>"