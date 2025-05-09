import os
import re
import html
from docx import Document
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.opc.package import OpcPackage
from docx.oxml.shared import qn
from docx.opc.part import Part
from datetime import datetime

def extract_hyperlinks(doc_path):
    try:
        doc = Document(doc_path)
        package = OpcPackage.open(doc_path)
        links = []
        rels = {}
        line_number = 0

        # Build rels map
        for rel in package.parts[0].rels.values():
            if rel.reltype == RT.HYPERLINK:
                rels[rel.rId] = rel.target_ref

        for para in doc.paragraphs:
            line_number += 1
            for run in para.runs:
                r_element = run._element
                hlink = r_element.find('.//w:hyperlink', namespaces=r_element.nsmap)
                if hlink is not None:
                    rid = hlink.get(qn('r:id'))
                    if rid in rels:
                        link = rels[rid]
                        text = run.text
                        links.append((text, link, line_number))
        return links
    except Exception as e:
        return f"Error: {str(e)}"

def update_links(doc_path, replacements):
    try:
        doc = Document(doc_path)
        updated = False
        package = OpcPackage.open(doc_path)
        rels_part = package.parts[0]

        updated_links = []
        rels = {rel.rId: rel for rel in rels_part.rels.values() if rel.reltype == RT.HYPERLINK}
        line_number = 0

        for para in doc.paragraphs:
            line_number += 1
            for run in para.runs:
                r_element = run._element
                hlink = r_element.find('.//w:hyperlink', namespaces=r_element.nsmap)
                if hlink is not None:
                    rid = hlink.get(qn('r:id'))
                    if rid in rels:
                        link_obj = rels[rid]
                        old_link = link_obj.target_ref
                        for pattern, replacement in replacements.items():
                            if re.search(pattern, old_link):
                                new_link = re.sub(pattern, replacement, old_link)
                                link_obj._target = new_link
                                updated_links.append((run.text, new_link, line_number))
                                updated = True

        if updated:
            doc.save(doc_path)

        return updated_links
    except Exception as e:
        return f"Error: {str(e)}"

def generate_report(report_data, output_path):
    html_content = [
        "<html><head><style>",
        "body{font-family:Arial;margin:40px;}",
        "h1{color:#333;}",
        "h2{margin-top:40px;color:#444;}",
        "table{width:100%;border-collapse:collapse;margin-top:10px;}",
        "th,td{border:1px solid #ccc;padding:8px;text-align:left;}",
        "th{background:#eee;}",
        ".error{color:red;}",
        ".updated{color:green;}",
        "</style></head><body>",
        "<h1>Word Link Replacement Report</h1>",
    ]

    total = len(report_data)
    updated = len([f for f in report_data if f['status'] == 'updated'])
    errors = len([f for f in report_data if f['status'] == 'error'])

    html_content.append(f"<p><b>Total files scanned:</b> {total}</p>")
    html_content.append(f"<p><b>Files updated:</b> <span class='updated'>{updated}</span></p>")
    html_content.append(f"<p><b>Files with errors:</b> <span class='error'>{errors}</span></p>")
    
    html_content.append("<hr><h2>Detailed File Results</h2><ul>")
    for f in report_data:
        file_display = html.escape(f['path'])
        if f['status'] == 'updated':
            html_content.append(f"<li><b>{file_display}</b> - <span class='updated'>Updated</span></li>")
        elif f['status'] == 'error':
            html_content.append(f"<li><b>{file_display}</b> - <span class='error'>Error</span></li>")
    html_content.append("</ul><hr>")

    for file_result in report_data:
        file_display = html.escape(file_result['path'])
        html_content.append(f"<h2>{file_display}</h2>")
        if file_result['status'] == 'updated':
            html_content.append("<p class='updated'><b>Links Updated:</b></p><table><tr><th>Line</th><th>Display Text</th><th>Updated Link</th></tr>")
            for text, link, line in file_result['data']:
                html_content.append(f"<tr><td>{line}</td><td>{html.escape(text)}</td><td>{html.escape(link)}</td></tr>")
            html_content.append("</table>")
        elif file_result['status'] == 'error':
            html_content.append(f"<p class='error'><b>Error:</b> {html.escape(file_result['data'])}</p>")

    html_content.append("</body></html>")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(html_content))


# === Main execution ===
if __name__ == "__main__":
    folder = "path_to_your_docs_folder"  # change this
    replacements = {
        r'file:///old_path/': 'file:///new_path/',
        r'C:\\old\\path\\': 'C:\\new\\path\\'
    }

    report_data = []

    for root, dirs, files in os.walk(folder):
        for file in files:
            if file.lower().endswith(".docx"):
                full_path = os.path.join(root, file)
                result = update_links(full_path, replacements)

                if isinstance(result, list) and result:
                    report_data.append({
                        'path': full_path,
                        'status': 'updated',
                        'data': result
                    })
                elif isinstance(result, str) and result.startswith("Error:"):
                    report_data.append({
                        'path': full_path,
                        'status': 'error',
                        'data': result
                    })

    now = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_file = f"link_update_report_{now}.html"
    generate_report(report_data, output_file)
    print(f"Report saved to: {output_file}")