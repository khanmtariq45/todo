import os
import re
import sys
from datetime import datetime
from docx import Document
from win32com import client

# Enhanced URL regex pattern
URL_REGEX = re.compile(
    r'('
    r'https?://[^\s<>"\'{}|\\^`[\]]+'  # Standard http/https URLs
    r'|www\.[^\s<>"\'{}|\\^`[\]]+'     # www. URLs without protocol
    r'|ftp://[^\s<>"\'{}|\\^`[\]]+'    # FTP URLs
    r'|mailto:[^\s<>"\'{}|\\^`[\]]+'   # mailto links
    r'|\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b'  # Email addresses
    r'|\\\\[^\s<>"\'{}|\\^`[\]]+'      # Network paths (\\server\path)
    r'|file://[^\s<>"\'{}|\\^`[\]]+'   # file:// URLs
    r')',
    re.IGNORECASE
)

def extract_text_and_links_from_paragraph(paragraph, line_offset=0):
    links = []
    text = paragraph.text.strip()
    if text:
        # First check for hyperlinks in the paragraph
        if hasattr(paragraph, 'hyperlinks'):
            for hyperlink in paragraph.hyperlinks:
                if hyperlink and hasattr(hyperlink, 'address') and hyperlink.address:
                    links.append((hyperlink.address, line_offset, "Hyperlink"))
        
        # Then check for URL-like text that might not be hyperlinked
        matches = URL_REGEX.findall(text)
        for url in matches:
            # Skip if this URL was already found as a hyperlink
            if not any(url in found_url for found_url, _, _ in links):
                links.append((url, line_offset, "Text"))
    
    return links

def extract_links_from_docx(path):
    links = []
    try:
        doc = Document(path)
        line_num = 1

        # Body paragraphs
        for para in doc.paragraphs:
            links.extend(extract_text_and_links_from_paragraph(para, line_num))
            line_num += 1

        # Tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        links.extend(extract_text_and_links_from_paragraph(para, line_num))
                        line_num += 1

        # Headers and footers
        for section in doc.sections:
            for part in (section.header, section.footer):
                if part is not None:
                    for para in part.paragraphs:
                        links.extend(extract_text_and_links_from_paragraph(para, -1))
                    
        # Footnotes and endnotes (if present)
        if hasattr(doc, 'footnotes'):
            for footnote in doc.footnotes:
                for para in footnote.paragraphs:
                    links.extend(extract_text_and_links_from_paragraph(para, -1))
                    
    except Exception as e:
        raise Exception(f"DOCX error: {e}")
    return links

def extract_links_from_doc(path):
    links = []
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(path, ReadOnly=True)

        # Process main document content
        for i, para in enumerate(doc.Paragraphs, 1):
            text = para.Range.Text.strip()
            if text:
                # Check hyperlinks first
                if hasattr(para.Range, 'Hyperlinks'):
                    for hyperlink in para.Range.Hyperlinks:
                        if hyperlink and hasattr(hyperlink, 'Address') and hyperlink.Address:
                            links.append((hyperlink.Address, i, "Hyperlink"))
                
                # Then check for URL-like text
                matches = URL_REGEX.findall(text)
                for url in matches:
                    if not any(url in found_url for found_url, _, _ in links):
                        links.append((url, i, "Text"))

        # Headers and footers
        for section in doc.Sections:
            for hf in [section.Headers(1), section.Footers(1)]:
                if hf is not None:
                    text = hf.Range.Text.strip()
                    if text:
                        if hasattr(hf.Range, 'Hyperlinks'):
                            for hyperlink in hf.Range.Hyperlinks:
                                if hyperlink and hasattr(hyperlink, 'Address') and hyperlink.Address:
                                    links.append((hyperlink.Address, -1, "Hyperlink"))
                        matches = URL_REGEX.findall(text)
                        for url in matches:
                            if not any(url in found_url for found_url, _, _ in links):
                                links.append((url, -1, "Text"))

        # Process shapes (which might contain hyperlinks)
        if hasattr(doc, 'InlineShapes'):
            for shape in doc.InlineShapes:
                if (shape is not None and 
                    hasattr(shape, 'Hyperlink') and 
                    shape.Hyperlink is not None and 
                    hasattr(shape.Hyperlink, 'Address') and 
                    shape.Hyperlink.Address):
                    links.append((shape.Hyperlink.Address, -1, "Shape Hyperlink"))

        doc.Close(False)
        word.Quit()
    except Exception as e:
        # Ensure Word is properly closed even if error occurs
        if 'doc' in locals():
            doc.Close(False)
        if 'word' in locals():
            word.Quit()
        raise Exception(f"DOC error: {e}")
    return links

# [Rest of the code remains the same...]