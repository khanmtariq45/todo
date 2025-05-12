def update_hyperlink_relationships(doc, old_url, new_url):
    updated = False
    for rel in doc.part.rels.values():
        if rel.reltype == RT.HYPERLINK and rel.target_ref == old_url:
            rel._target = new_url  # This is a hack, but it works
            updated = True
    return updated


if update_hyperlink_relationships(doc, original, replacement):
    log(f"Replaced hyperlink relationship: {original} => {replacement}")
    updated = True