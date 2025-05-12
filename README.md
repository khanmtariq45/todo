if para.runs:
    replaced = replace_hyperlink(para, hyperlink.address, replacement, display_text)
    if replaced:
        log(f"Updated hyperlink in table: {original} => {replacement}")
        updated = True



from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT

def replace_hyperlink(paragraph, old_url, new_url, display_text=None):
    for run in paragraph.runs:
        if old_url in run.text:
            text_to_show = display_text or new_url
            # Clear the run's text
            run.clear()

            # Create the new hyperlink
            part = paragraph.part
            r_id = part.relate_to(new_url, RT.HYPERLINK, is_external=True)

            hyperlink = OxmlElement('w:hyperlink')
            hyperlink.set(qn('r:id'), r_id)

            new_run = OxmlElement('w:r')
            rPr = OxmlElement('w:rPr')
            new_run.append(rPr)
            t = OxmlElement('w:t')
            t.text = text_to_show
            new_run.append(t)

            hyperlink.append(new_run)

            paragraph._p.append(hyperlink)
            return True
    return False