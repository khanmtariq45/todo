def update_doc_file(file_path, links_to_update):
    word = doc = None
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False  # Run in background
        doc = word.Documents.Open(os.path.abspath(file_path), ReadOnly=False, Visible=False)
        updated = False

        # Process ALL document parts (main, headers, footers, textboxes)
        for story_range in doc.StoryRanges:
            while story_range:
                # Update hyperlinks
                for hyperlink in story_range.Hyperlinks:
                    for original, replacement, *_ in links_to_update:
                        if hyperlink.Address and original in hyperlink.Address:
                            log(f"Updating DOC hyperlink: {original} => {replacement}")
                            hyperlink.Address = replacement
                            updated = True

                # Update plain text
                for original, replacement, *_ in links_to_update:
                    if original in story_range.Text:
                        log(f"Updating DOC text: {original} => {replacement}")
                        story_range.Text = story_range.Text.replace(original, replacement)
                        updated = True

                # Move to next linked story (e.g., continued headers/footers)
                story_range = story_range.NextStoryRange

        # Explicitly process tables (in case StoryRanges misses some)
        for table in doc.Tables:
            for row in table.Rows:
                for cell in row.Cells:
                    for original, replacement, *_ in links_to_update:
                        if original in cell.Range.Text:
                            log(f"Updating DOC table text: {original} => {replacement}")
                            cell.Range.Text = cell.Range.Text.replace(original, replacement)
                            updated = True

        if updated:
            doc.Save()
            log(f"Successfully updated DOC: {file_path}")
        else:
            log(f"No updates made to DOC: {file_path}")

        return updated

    except Exception as e:
        log(f"Error updating DOC file {file_path}: {str(e)}")
        return False

    finally:
        # Safely close Word
        try:
            if doc:
                doc.Close(SaveChanges=False)
            if word:
                word.Quit()
        except Exception as e:
            log(f"Warning: Could not clean up Word COM object: {str(e)}")







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
                            log(f"Updating hyperlink in paragraph: {original} => {replacement}")
                            
                            # Workaround: remove the hyperlink and add a new one
                            run = hyperlink._parent
                            run.text = run.text.replace(hyperlink.text, replacement)
                            updated = True
            
            # Then handle text replacements
            for original, replacement, *_ in links_to_update:
                if original in para.text:
                    log(f"Replacing text in paragraph: {original} => {replacement}")
                    para.text = para.text.replace(original, replacement)
                    updated = True

        # Process tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        for original, replacement, *_ in links_to_update:
                            if original in para.text:
                                log(f"Replacing text in table cell: {original} => {replacement}")
                                para.text = para.text.replace(original, replacement)
                                updated = True

        # Process headers and footers
        for section in doc.sections:
            for part in (section.header, section.footer):
                if part:
                    for para in part.paragraphs:
                        for original, replacement, *_ in links_to_update:
                            if original in para.text:
                                log(f"Replacing text in header/footer: {original} => {replacement}")
                                para.text = para.text.replace(original, replacement)
                                updated = True

        if updated:
            doc.save(file_path)
            log(f"Saved updated DOCX file: {file_path}")
        else:
            log(f"No updates made to DOCX file: {file_path}")

        return updated
    except Exception as e:
        log(f"Error updating DOCX file {file_path}: {e}")
        return False









def update_docx_file(file_path, links_to_update):
    word = doc = None
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(file_path), ReadOnly=False, Visible=False)
        updated = False
        
        # Process all story ranges (main document, headers, footers, etc.)
        for story_range in [doc.Content] + [sec.Header.Range for sec in doc.Sections] + [sec.Footer.Range for sec in doc.Sections]:
            # Process hyperlinks
            for hyperlink in story_range.Hyperlinks:
                for original, replacement, *_ in links_to_update:
                    if hyperlink.Address and original in hyperlink.Address:
                        log(f"Updating hyperlink: {original} => {replacement}")
                        hyperlink.Address = replacement
                        updated = True
            
            # Process text
            for original, replacement, *_ in links_to_update:
                if original in story_range.Text:
                    log(f"Replacing text: {original} => {replacement}")
                    story_range.Text = story_range.Text.replace(original, replacement)
                    updated = True

        if updated:
            doc.Save()
            log(f"Saved updated DOCX file: {file_path}")
        else:
            log(f"No updates made to DOCX file: {file_path}")
            
        return updated
    except Exception as e:
        log(f"Error updating DOCX file {file_path}: {e}")
        return False
    finally:
        if doc:
            doc.Close(False)
        if word:
            word.Quit()