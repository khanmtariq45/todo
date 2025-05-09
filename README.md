import os
from docx import Document

def is_file_link(link: str) -> bool:
    if not link:
        return False
    link = link.strip().lower()
    return (
        link.startswith("file://") or
        os.path.isabs(link) or
        ('\\' in link or '/' in link and not link.startswith("http") and not link.startswith("mailto:"))
    )

def extract_links_from_docx(file_path):
    links = []
    try:
        doc = Document(file_path)
        rels = doc.part.rels
        for rel in rels.values():
            if rel.reltype == "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink":
                target = rel.target_ref
                if is_file_link(target):
                    links.append(target)
    except Exception as e:
        print(f"[ERROR] {file_path}: {e}")
    return links

def scan_folder(folder_path):
    for root, _, files in os.walk(folder_path):
        for file in files:
            if file.lower().endswith(".docx"):
                full_path = os.path.join(root, file)
                links = extract_links_from_docx(full_path)
                if links:
                    print(f"\nFile: {full_path}")
                    for link in links:
                        print(f"  File Link: {link}")

if __name__ == "__main__":
    folder_path = input("Enter the full folder path to scan: ").strip('"')
    if not os.path.isdir(folder_path):
        print("Error: Invalid folder path.")
    else:
        scan_folder(folder_path)