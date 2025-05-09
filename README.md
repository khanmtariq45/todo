def extract_docx_links(file_path):
    """Extract all links from a DOCX file."""
    links = []
    try:
        doc = Document(file_path)
        line_offset = 0

        # Process paragraphs
        for para in doc.paragraphs:
            links.extend(extract_paragraph_links(para, line_offset))
            line_offset += len(para.text.split('\n'))

        # Process tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        links.extend(extract_paragraph_links(para, line_offset))
                        line_offset += len(para.text.split('\n'))

        # Process headers and footers
        for section in doc.sections:
            for part in (section.header, section.footer):
                if part:
                    for para in part.paragraphs:
                        links.extend(extract_paragraph_links(para, line_offset))
                        line_offset += len(para.text.split('\n'))

    except Exception as e:
        print(f"Error extracting links from DOCX {file_path}: {e}")
    
    return links

def extract_doc_links(file_path):
    """Extract all links from a DOC file using COM interface."""
    links = []
    word = doc = None
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(file_path), ReadOnly=True, Visible=False)
        line_offset = 0

        # Process paragraphs
        for para in doc.Paragraphs:
            text = para.Range.Text.strip()
            if text:
                # Process hyperlinks
                if hasattr(para.Range, 'Hyperlinks'):
                    for hyperlink in para.Range.Hyperlinks:
                        link_data = process_hyperlink(hyperlink, line_offset, "Hyperlink")
                        if link_data:
                            links.append(link_data)
                
                # Process text URLs
                links.extend(extract_links_from_text(text, line_offset, links))
                line_offset += len(text.split('\n'))

        # Process headers and footers
        for section in doc.Sections:
            for hf in [section.Headers(1), section.Footers(1)]:
                if hf:
                    # Process hyperlinks
                    if hasattr(hf.Range, 'Hyperlinks'):
                        for hyperlink in hf.Range.Hyperlinks:
                            link_data = process_hyperlink(hyperlink, line_offset, "Header/Footer")
                            if link_data:
                                links.append(link_data)
                    
                    # Process text URLs
                    links.extend(extract_links_from_text(hf.Range.Text, line_offset, links))
                    line_offset += len(hf.Range.Text.split('\n'))

        # Process shapes
        if hasattr(doc, 'InlineShapes'):
            for shape in doc.InlineShapes:
                try:
                    if shape and hasattr(shape, 'Hyperlink') and shape.Hyperlink:
                        link_data = process_hyperlink(shape.Hyperlink, line_offset, "Shape")
                        if link_data:
                            links.append(link_data)
                except Exception as e:
                    print(f"Warning: Shape hyperlink error - {e}")

    except Exception as e:
        print(f"Error extracting links from DOC {file_path}: {e}")
    finally:
        if doc:
            doc.Close(False)
        if word:
            word.Quit()
    
    return links

def scan_and_update_documents(base_path):
    """Scan all DOC/DOCX files in the given path and update links"""
    processed_files = 0
    updated_files = 0
    total_replacements = 0
    error_files = []

    print(f"\nScanning and updating: {base_path}\n")

    for root, _, files in os.walk(base_path):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in (".doc", ".docx"):
                continue

            full_path = os.path.join(root, file)
            processed_files += 1
            print(f"[{processed_files}] Processing: {full_path}")

            try:
                # First extract all local file links
                extractor = extract_docx_links if ext == ".docx" else extract_doc_links
                links = extractor(full_path)
                
                if not links:
                    continue

                # Filter to only include links we can replace
                replaceable_links = [(orig, repl) for orig, repl, *_ in links if repl]
                if not replaceable_links:
                    continue

                # Update the document
                updater = update_docx_file if ext == ".docx" else update_doc_file
                if updater(full_path, replaceable_links):
                    updated_files += 1
                    total_replacements += len(replaceable_links)
                    print(f"  Updated {len(replaceable_links)} links")

            except Exception as e:
                error_files.append((full_path, str(e)))
                print(f"[ERROR] {file}: {e}")

    # Print summary
    print("\n=== Scan Complete ===")
    print(f"Processed files: {processed_files}")
    print(f"Updated files: {updated_files}")
    print(f"Total replacements: {total_replacements}")
    if error_files:
        print("\nErrors encountered:")
        for file, error in error_files:
            print(f"  {file}: {error}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python doc_link_updater.py <directory_path>")
        sys.exit(1)
    
    target_path = sys.argv[1]
    if not os.path.isdir(target_path):
        print(f"Error: {target_path} is not a valid directory")
        sys.exit(1)
    
    scan_and_update_documents(target_path)