if rel.reltype == RT.HYPERLINK and rel.target_ref == old_url:
    rel._target = new_url

    # Optional: update the display text in the run
    for paragraph in doc.paragraphs:
        for run in paragraph.runs:
            if old_url in run.text:
                run.text = run.text.replace(old_url, new_url)