from docx import Document
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml.shared import qn
from docx.oxml import OxmlElement

def replace_hyperlinks_completely(docx_path, old_url, new_url, display_text, output_path):
    """
    Completely remove hyperlinks with old URL and add new hyperlinks with new URL.
    
    Args:
        docx_path (str): Path to the input Word document
        old_url (str): The URL to be removed
        new_url (str): The new URL to add
        display_text (str): The text to display for the new hyperlink
        output_path (str): Path to save the modified document
    """
    # Load the document
    doc = Document(docx_path)
    
    # Process all paragraphs in the document
    for paragraph in doc.paragraphs:
        # Find all hyperlinks in this paragraph
        hyperlinks = paragraph._element.xpath('.//w:hyperlink')
        
        # Process each hyperlink
        for hyperlink in hyperlinks:
            # Get the relationship ID
            rel_id = hyperlink.get(qn('r:id'))
            
            # Check if this hyperlink points to our old URL
            if rel_id in doc.part.rels:
                if doc.part.rels[rel_id]._target == old_url:
                    # Remove the entire hyperlink element
                    hyperlink.getparent().remove(hyperlink)
                    
                    # Add new hyperlink with the same display text
                    add_hyperlink(paragraph, new_url, display_text)
    
    # Save the modified document
    doc.save(output_path)
    print(f"Document with replaced hyperlinks saved to {output_path}")

def add_hyperlink(paragraph, url, text):
    """
    Add a hyperlink to a paragraph.
    
    Args:
        paragraph: The paragraph to add the hyperlink to
        url (str): The URL to link to
        text (str): The text to display
    """
    # Create the hyperlink element
    part = paragraph.part
    r_id = part.relate_to(
        url, 
        RT.HYPERLINK, 
        is_external=True
    )
    
    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), r_id)
    
    # Create the run element
    new_run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    new_run.append(rPr)
    
    # Set hyperlink style (blue, underlined)
    style = OxmlElement('w:rStyle')
    style.set(qn('w:val'), 'Hyperlink')
    rPr.append(style)
    
    # Add the text
    t = OxmlElement('w:t')
    t.text = text
    new_run.append(t)
    
    # Add the run to the hyperlink
    hyperlink.append(new_run)
    
    # Add the hyperlink to the paragraph
    paragraph._p.append(hyperlink)
    
    return hyperlink