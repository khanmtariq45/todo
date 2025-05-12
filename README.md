from docx import Document
from docx.oxml import parse_xml
from docx.oxml.ns import qn
from docx.oxml.shared import OxmlElement
from docx.opc.constants import RELATIONSHIP_TYPE as RT

def replace_hyperlink_keep_format(doc_path, replacements):
    doc = Document(doc_path)
    part = doc.part

    for para in doc.paragraphs:
        for run in para.runs:
            run_text = run.text
            for old_url, new_url in replacements.items():
                if old_url in run_text:
                    # Step 1: Remove old hyperlink relationship
                    for r_id, rel in list(part.rels.items()):
                        if rel.reltype == RT.HYPERLINK and old_url in rel.target_ref:
                            part.drop_rel(r_id)

                    # Step 2: Create new hyperlink relationship
                    new_rid = part.relate_to(new_url, RT.HYPERLINK, is_external=True)

                    # Step 3: Build new hyperlink element (preserve formatting)
                    text_to_link = run.text.replace(old_url, "")
                    new_run_xml = run._element

                    hyperlink = OxmlElement('w:hyperlink')
                    hyperlink.set(qn('r:id'), new_rid)

                    # Wrap the existing run in the hyperlink
                    hyperlink.append(new_run_xml)

                    # Replace the run with the new hyperlink
                    para._element.insert(para._element.index(new_run_xml), hyperlink)
                    para._element.remove(new_run_xml)
                    print(f"Replaced link: {old_url} -> {new_url}")
                    break  # Move to next run

    doc.save(doc_path)
    print(f"Saved updated document: {doc_path}")

# Example usage
replacements = {
    "https://old-link.com": "https://new-link.com"
}
replace_hyperlink_keep_format("your_doc.docx", replacements)