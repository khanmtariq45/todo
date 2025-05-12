from docx import Document
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml.shared import qn
from docx.oxml import OxmlElement
import re

def replace_filepath_with_weburl(docx_path, old_filepath, new_weburl, display_text, output_path):
    """
    Completely replace local file paths with web URLs in hyperlinks
    
    Args:
        docx_path: Input document path
        old_filepath: Local file path to replace (e.g., r"C:\files\doc.docx")
        new_weburl: New web URL (e.g., "https://example.com/new-doc")
        display_text: Text to display for hyperlink
        output_path: Output document path
    """
    doc = Document(docx_path)
    
    # Normalize paths for comparison (handle different slash formats)
    old_filepath = old_filepath.replace('/', '\\').lower()
    
    # Process all paragraphs
    for paragraph in doc.paragraphs:
        # Find all hyperlinks in paragraph
        hyperlinks = paragraph._element.xpath('.//w:hyperlink')
        
        # Process each hyperlink
        for hyperlink in hyperlinks:
            rel_id = hyperlink.get(qn('r:id'))
            
            if rel_id in doc.part.rels:
                target = doc.part.rels[rel_id]._target
                # Check if target matches our old file path (case insensitive)
                if target.replace('/', '\\').lower() == old_filepath:
                    # Remove the entire hyperlink
                    hyperlink.getparent().remove(hyperlink)
                    
                    # Remove the relationship
                    del doc.part.rels[rel_id]
        
        # Also replace any visible text that matches the old path
        if old_filepath in paragraph.text.lower():
            paragraph.text = re.sub(re.escape(old_filepath), display_text, paragraph.text, flags=re.IGNORECASE)
    
    # Now add new hyperlinks where we removed old ones
    for paragraph in doc.paragraphs:
        if display_text in paragraph.text:
            # Find runs containing our display text
            for run in paragraph.runs:
                if display_text in run.text:
                    # Add hyperlink at this position
                    add_hyperlink(paragraph, new_weburl, display_text)
                    run.text = run.text.replace(display_text, '')  # Remove duplicate text
    
    doc.save(output_path)
    print(f"Successfully replaced file paths with web URLs in {output_path}")

def add_hyperlink(paragraph, url, text):
    """Add a properly formatted web hyperlink"""
    part = paragraph.part
    r_id = part.relate_to(url, RT.HYPERLINK, is_external=True)
    
    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), r_id)
    
    new_run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    
    # Set hyperlink style (blue + underline)
    rStyle = OxmlElement('w:rStyle')
    rStyle.set(qn('w:val'), 'Hyperlink')
    rPr.append(rStyle)
    
    new_run.append(rPr)
    t = OxmlElement('w:t')
    t.text = text
    new_run.append(t)
    
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)