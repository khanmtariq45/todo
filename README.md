def update_docx_file(file_path, links_to_update):
    try:
        doc = Document(file_path)
        updated = False

        # Process paragraphs
        for para in doc.paragraphs:
            # First handle hyperlink objects
            if hasattr(para, 'hyperlinks'):
                for hyperlink in para.hyperlinks:
                    for original, replacement, *_ in links_to_update:
                        if hyperlink.address and original in hyperlink.address:
                            # Update both address and text if they match
                            hyperlink.address = replacement
                            if hyperlink.text == original:
                                try:
                                    hyperlink.text = replacement
                                except:
                                    pass  # Some hyperlinks may not allow text modification
                            if update_hyperlink_relationships(doc, original, replacement):
                                updated = True

            # Then handle text replacements
            for original, replacement, *_ in links_to_update:
                if original in para.text:
                    para.text = para.text.replace(original, replacement)
                    updated = True

        # Process tables (ensure we update hyperlink text in tables too)
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        if hasattr(para, 'hyperlinks'):
                            for hyperlink in para.hyperlinks:
                                for original, replacement, *_ in links_to_update:
                                    if hyperlink.address and original in hyperlink.address:
                                        hyperlink.address = replacement
                                        if hyperlink.text == original:
                                            try:
                                                hyperlink.text = replacement
                                            except:
                                                pass
                                        if update_hyperlink_relationships(doc, original, replacement):
                                            updated = True

                        # Text replacements
                        for original, replacement, *_ in links_to_update:
                            if original in para.text:
                                para.text = para.text.replace(original, replacement)
                                updated = True

        # Process headers and footers
        for section in doc.sections:
            for part in (section.header, section.footer):
                if part:
                    for para in part.paragraphs:
                        if hasattr(para, 'hyperlinks'):
                            for hyperlink in para.hyperlinks:
                                for original, replacement, *_ in links_to_update:
                                    if hyperlink.address and original in hyperlink.address:
                                        hyperlink.address = replacement
                                        if hyperlink.text == original:
                                            try:
                                                hyperlink.text = replacement
                                            except:
                                                pass
                                        if update_hyperlink_relationships(doc, original, replacement):
                                            updated = True

                        # Text replacements
                        for original, replacement, *_ in links_to_update:
                            if original in para.text:
                                para.text = para.text.replace(original, replacement)
                                updated = True

        if updated:
            doc.save(file_path)
        return updated
    except Exception as e:
        log(f"Error updating DOCX file {file_path}: {e}")
        return False


def update_doc_file(file_path, links_to_update):
    word = doc = None
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(file_path), ReadOnly=False, Visible=False)
        updated = False
        
        for para in doc.Paragraphs:
            for original, replacement, *_ in links_to_update:
                if original in para.Range.Text:
                    # First check if this is a hyperlink
                    if para.Range.Hyperlinks.Count > 0:
                        for hyperlink in para.Range.Hyperlinks:
                            if hyperlink.Address and original in hyperlink.Address:
                                hyperlink.Address = replacement
                                # Try to update the display text if it matches the original
                                if hyperlink.TextToDisplay == original:
                                    hyperlink.TextToDisplay = replacement
                                updated = True
                    # Then handle regular text
                    para.Range.Text = para.Range.Text.replace(original, replacement)
                    updated = True
                    
        for section in doc.Sections:
            for hf in [section.Headers(1), section.Footers(1)]:
                if hf:
                    for original, replacement, *_ in links_to_update:
                        if original in hf.Range.Text:
                            if hf.Range.Hyperlinks.Count > 0:
                                for hyperlink in hf.Range.Hyperlinks:
                                    if hyperlink.Address and original in hyperlink.Address:
                                        hyperlink.Address = replacement
                                        if hyperlink.TextToDisplay == original:
                                            hyperlink.TextToDisplay = replacement
                                        updated = True
                            hf.Range.Text = hf.Range.Text.replace(original, replacement)
                            updated = True
        
        if updated:
            doc.Save()
        return updated
    except Exception as e:
        log(f"Error updating DOC file {file_path}: {e}")
        return False
    finally:
        if doc:
            doc.Close(False)
        if word:
            word.Quit()
