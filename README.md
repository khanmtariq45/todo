from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT

def replace_hyperlink_with_external(doc, old_url, new_url):
    for para in doc.paragraphs:
        for run in para.runs:
            if old_url in run.text:
                # Remove the run with old hyperlink text
                run.text = run.text.replace(old_url, "")

        for hyperlink in para._element.xpath('.//w:hyperlink'):
            rel_id = hyperlink.get(qn('r:id'))
            if not rel_id:
                continue
            rel = doc.part.rels[rel_id]
            if rel.target_ref != old_url:
                continue

            # Remove old hyperlink
            para._element.remove(hyperlink)

            # Create new run
            new_run = para.add_run("Updated Link")
            new_run.font.color.rgb = run.font.color  # Optional: preserve style

            # Add external hyperlink
            part = doc.part
            r_id = part.relate_to(new_url, RT.HYPERLINK, is_external=True)

            # Create a new hyperlink element
            hyperlink_elm = OxmlElement('w:hyperlink')
            hyperlink_elm.set(qn('r:id'), r_id)

            # Create a run inside the hyperlink
            r = OxmlElement('w:r')
            rPr = OxmlElement('w:rPr')
            r.append(rPr)
            t = OxmlElement('w:t')
            t.text = "Updated Link"
            r.append(t)
            hyperlink_elm.append(r)

            # Append new hyperlink
            para._element.append(hyperlink_elm)

doc = Document("your_file.docx")
replace_hyperlink_with_external(doc, "old_link", "https://new-link.com")
doc.save("updated_file.docx")