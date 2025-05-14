[2025-05-12 15:31:46] Starting scan in: C:\Users\MuhammadTariqPKDev\Downloads\Convert Data\New folder
[2025-05-12 15:31:46] Processing [1]: C:\Users\MuhammadTariqPKDev\Downloads\Convert Data\New folder\SA07 Risk Matrix.docx
[2025-05-12 15:31:49] Found encrypted ID for SA07%20Consequence%20Category%20Table.pdf => 6EC2798F7A9C498F712EF560846A20E6
[2025-05-12 15:31:49] Prepared replacement for SA07%20Consequence%20Category%20Table.pdf => #\qms?DocId=6EC2798F7A9C498F712EF560846A20E6 (Display Name: CONSEQUENCES)
[2025-05-12 15:31:51] Found encrypted ID for SA07%20Consequence%20Category%20Table.pdf => 6EC2798F7A9C498F712EF560846A20E6
[2025-05-12 15:31:51] Prepared replacement for SA07%20Consequence%20Category%20Table.pdf => #\qms?DocId=6EC2798F7A9C498F712EF560846A20E6 (Display Name: CONSEQUENCES)
[2025-05-12 15:31:51] Found encrypted ID for SA07%20Consequence%20Category%20Table.pdf => 6EC2798F7A9C498F712EF560846A20E6
[2025-05-12 15:31:51] Prepared replacement for SA07%20Consequence%20Category%20Table.pdf => #\qms?DocId=6EC2798F7A9C498F712EF560846A20E6 (Display Name: CONSEQUENCES)
[2025-05-12 15:31:52] Found encrypted ID for SA07%20Consequence%20Category%20Table.pdf => 6EC2798F7A9C498F712EF560846A20E6
[2025-05-12 15:31:52] Prepared replacement for SA07%20Consequence%20Category%20Table.pdf => #\qms?DocId=6EC2798F7A9C498F712EF560846A20E6 (Display Name: CONSEQUENCES)
[2025-05-12 15:31:53] Found encrypted ID for SA07%20Consequence%20Category%20Table.pdf => 6EC2798F7A9C498F712EF560846A20E6
[2025-05-12 15:31:53] Prepared replacement for SA07%20Consequence%20Category%20Table.pdf => #\qms?DocId=6EC2798F7A9C498F712EF560846A20E6 (Display Name: CONSEQUENCES)
[2025-05-12 15:31:55] Found encrypted ID for SA07%20Hazard%20Probability%20Rating%20Table.pdf => E95880F1459DE62596472316E3A159EC
[2025-05-12 15:31:55] Prepared replacement for SA07%20Hazard%20Probability%20Rating%20Table.pdf => #\qms?DocId=E95880F1459DE62596472316E3A159EC (Display Name: INITIAL PROBABILITY)
[2025-05-12 15:31:56] Found encrypted ID for SA07%20Hazard%20Probability%20Rating%20Table.pdf => E95880F1459DE62596472316E3A159EC
[2025-05-12 15:31:56] Prepared replacement for SA07%20Hazard%20Probability%20Rating%20Table.pdf => #\qms?DocId=E95880F1459DE62596472316E3A159EC (Display Name: INITIAL PROBABILITY)
[2025-05-12 15:31:57] Found encrypted ID for SA07%20Hazard%20Probability%20Rating%20Table.pdf => E95880F1459DE62596472316E3A159EC
[2025-05-12 15:31:57] Prepared replacement for SA07%20Hazard%20Probability%20Rating%20Table.pdf => #\qms?DocId=E95880F1459DE62596472316E3A159EC (Display Name: INITIAL PROBABILITY)
[2025-05-12 15:31:58] Found encrypted ID for SA07%20Hazard%20Probability%20Rating%20Table.pdf => E95880F1459DE62596472316E3A159EC
[2025-05-12 15:31:58] Prepared replacement for SA07%20Hazard%20Probability%20Rating%20Table.pdf => #\qms?DocId=E95880F1459DE62596472316E3A159EC (Display Name: INITIAL PROBABILITY)
[2025-05-12 15:31:59] Found encrypted ID for SA07%20Hazard%20Probability%20Rating%20Table.pdf => E95880F1459DE62596472316E3A159EC
[2025-05-12 15:31:59] Prepared replacement for SA07%20Hazard%20Probability%20Rating%20Table.pdf => #\qms?DocId=E95880F1459DE62596472316E3A159EC (Display Name: INITIAL PROBABILITY)
[2025-05-12 15:31:59] Replacing0 text in table: SA07%20Consequence%20Category%20Table.pdf => #\qms?DocId=6EC2798F7A9C498F712EF560846A20E6
[2025-05-12 15:31:59] Error updating DOCX file C:\Users\MuhammadTariqPKDev\Downloads\Convert Data\New folder\SA07 Risk Matrix.docx: property 'address' of 'Hyperlink' object has no setter
[2025-05-12 15:31:59] === Scan Complete ===
[2025-05-12 15:31:59] Processed files: 1
[2025-05-12 15:31:59] Updated files: 0
[2025-05-12 15:31:59] Total replacements: 0
[2025-05-12 15:31:59] HTML report generated: link_update_report.html

import os
import re
import sys
import urllib.parse
from datetime import datetime
from docx import Document
from win32com import client
import pyodbc

Regex patterns

URL_PATTERN = (
r'(https?://[^\s<>"'{}|\^[]+|www\.[^\s<>"\'{}|\\^[]+|'
r'file://[^\s<>"'{}|\^[]+|tel:[^\s<>"\'{}|\\^[]+)'
)

LOCAL_FILE_REGEX = re.compile(
r'('
r'file://[^\s<>"'{}|\^`]]+'  # file:// URLs
r'|[A-Za-z]:\/[^<>:"/\|?\r\n]'  # Windows absolute paths
r'|(?:..?[\/]|[^:/\\s<>|]+[\/])(?:[^<>:"/\|?\r\n]+[\/])[^<>:"/\|?\r\n]'  # Relative paths
r'|[^<>:"/\|?\r\n]+.(?:pdf|docx?|xlsx?|pptx?|txt|csv|jpg|png|zip)'  # Standalone filenames with common extensions
r')',
re.IGNORECASE
)

URL_REGEX = re.compile(URL_PATTERN, re.IGNORECASE)
EXCLUDE_PREFIXES = ("http://", "https://", "mailto:", "tel:", "ftp://", "s://", "www.")

def get_last_two_path_parts(path):
path = urllib.parse.unquote(path)
path = path.replace("\", "/").rstrip("/")
parts = path.split("/")
return "/".join(parts[-2:]) if len(parts) >= 2 else path

log_entries = []

def log(message):
timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
log_entries.append(f"[{timestamp}] {message}")

def write_log_to_file():
with open("link_update_log.txt", "w", encoding="utf-8") as log_file:
log_file.write("\n".join(log_entries))

def fetch_qms_file_id(filepath):
dbConnectionString = (
"DRIVER={ODBC Driver 17 for SQL Server};"
"SERVER=dev.c5owyuw64shd.ap-south-1.rds.amazonaws.com,1982;"
"DATABASE=JIBE_Main;"
"UID=j2;"
"PWD=123456;"
"Max Pool Size=200;"
)

try:  
    conn = pyodbc.connect(dbConnectionString)  
    cursor = conn.cursor()  
    normalized_path = get_last_two_path_parts(filepath)  
    cursor.execute("""  
        SELECT TOP 1 encryptedDocId FROM QMS_DocIds_Import01   
        WHERE filepath LIKE ?  
    """, f"%{normalized_path}%")  
    row = cursor.fetchone()  
    return row[0] if row else None  

except Exception as e:  
    log(f"Database error for {filepath}: {e}")  
    return None  
finally:  
    try:  
        cursor.close()  
        conn.close()  
    except:  
        pass

def is_local_file_url(url):
url = url.strip()
return LOCAL_FILE_REGEX.match(url) and not url.lower().startswith(("http://", "https://", "mailto:", "tel:", "ftp://", "s://", "www."))

def get_qms_replacement(url):
encrypted_doc_id = fetch_qms_file_id(url)
if encrypted_doc_id:
log(f"Found encrypted ID for {url} => {encrypted_doc_id}")
return f"#\qms?DocId={encrypted_doc_id}"
else:
log(f"No encrypted ID found for {url}")
return None

def process_hyperlink(hyperlink, line_offset, source_type, file_path):
try:
if not (hyperlink and hasattr(hyperlink, 'address') and hyperlink.address):
return None
url = hyperlink.address.strip()
if not is_local_file_url(url):
return None
replacement = get_qms_replacement(url)
if not replacement:
log(f"Replacement not found for {url}")
return None
display_text = (hyperlink.text.strip() if hasattr(hyperlink, 'text') and hyperlink.text
else replacement)
log(f"Prepared replacement for {url} => {replacement} (Display Name: {display_text})")
return (url, replacement, line_offset, source_type, display_text)
except Exception as e:
log(f"Hyperlink processing error: {e}")
return None

def extract_links_from_text(text, line_offset, existing_links):
links = []
if not text.strip():
return links
for url in URL_REGEX.findall(text):
if url and not any(url in found_url for found_url, *_ in existing_links):
if is_local_file_url(url):
replacement = get_qms_replacement(url)
if replacement:
links.append((url, replacement, line_offset, "Text", replacement))
return links

def extract_paragraph_links(paragraph, line_offset, file_path):
links = []
text = paragraph.text.strip()
if not text:
return links
if hasattr(paragraph, 'hyperlinks'):
for hyperlink in paragraph.hyperlinks:
link_data = process_hyperlink(hyperlink, line_offset, "Hyperlink", file_path)
if link_data:
links.append(link_data)
links.extend(extract_links_from_text(text, line_offset, links))
return links

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
                    if hasattr(para, 'hyperlinks'):  
                        for hyperlink in para.hyperlinks:  
                            for original, replacement, *_ in links_to_update:  
                                if hyperlink.address and original in hyperlink.address:  
                                    log(f"Replacing0 text in table: {hyperlink.address} => {replacement}")  
                                    hyperlink.address = replacement  
                                    log(f"Updating hyperlink in table: {original} => {replacement}")  
                                    updated = True  
                                      
                    # Then handle text replacements  
                    for original, replacement, *_ in links_to_update:  
                        if original in para.text:  
                            log(f"Replacing text in table: {original} => {replacement}")  
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
        log(f"Saving the DOCX file: {file_path}")  
        doc.save(file_path)  
        log(f"Saved updated DOCX file: {file_path}")  
    else:  
        log(f"No updates made to DOCX file: {file_path}")  

    return updated  
except Exception as e:  
    log(f"Error updating DOCX file {file_path}: {e}")  
    return False

def update_doc_file(file_path, links_to_update):
word = doc = None
try:
word = client.Dispatch("Word.Application")
word.Visible = False  # Run in background
doc = word.Documents.Open(os.path.abspath(file_path), ReadOnly=False, Visible=False)
updated = False

# Process ALL document parts (main, headers, footers, text-boxes)  
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

def extract_docx_links(file_path):
links = []
try:
doc = Document(file_path)
line_offset = 0
for para in doc.paragraphs:
links.extend(extract_paragraph_links(para, line_offset, file_path))
for link in links:
log(f"working with link {link}")
if is_local_file_url(link[0]):
replacement = get_qms_replacement(link[0])
if replacement:
# links.append((link[0], replacement, link[2], link[3], replacement))
log(f"it is preparing for {link[0]} => {replacement} (Display Name: {link[4]})")
line_offset += len(para.text.split('\n'))
for table in doc.tables:
for row in table.rows:
for cell in row.cells:
for para in cell.paragraphs:
links.extend(extract_paragraph_links(para, line_offset, file_path))
line_offset += len(para.text.split('\n'))
for section in doc.sections:
for part in (section.header, section.footer):
if part:
for para in part.paragraphs:
links.extend(extract_paragraph_links(para, line_offset, file_path))
line_offset += len(para.text.split('\n'))

except Exception as e:  
    log(f"Error extracting links from DOCX {file_path}: {e}")  
      
return links

def extract_doc_links(file_path):
links = []
word = doc = None
try:
word = client.Dispatch("Word.Application")
word.Visible = False
doc = word.Documents.Open(os.path.abspath(file_path), ReadOnly=True, Visible=False)
line_offset = 0
for para in doc.Paragraphs:
text = para.Range.Text.strip()
if text:
if hasattr(para.Range, 'Hyperlinks'):
for hyperlink in para.Range.Hyperlinks:
link_data = process_hyperlink(hyperlink, line_offset, "Hyperlink", file_path)
if link_data:
links.append(link_data)
links.extend(extract_links_from_text(text, line_offset, links))
line_offset += len(text.split('\n'))
for section in doc.Sections:
for hf in [section.Headers(1), section.Footers(1)]:
if hf:
if hasattr(hf.Range, 'Hyperlinks'):
for hyperlink in hf.Range.Hyperlinks:
link_data = process_hyperlink(hyperlink, line_offset, "Header/Footer", file_path)
if link_data:
links.append(link_data)
links.extend(extract_links_from_text(hf.Range.Text, line_offset, links))
line_offset += len(hf.Range.Text.split('\n'))
except Exception as e:
log(f"Error extracting links from DOC {file_path}: {e}")
finally:
if doc:
doc.Close(False)
if word:
word.Quit()
return links

def scan_and_update_documents(base_path):
processed = updated = total_replacements = 0
log(f"Starting scan in: {base_path}")
for root, _, files in os.walk(base_path):
for file in files:
# Skip temporary files
if file.startswith("~$"):
continue

ext = os.path.splitext(file)[1].lower()  
        if ext not in (".doc", ".docx"):  
            continue  

        full_path = os.path.join(root, file)  
        processed += 1  
        print(f"Processing: {full_path}")  
        log(f"Processing [{processed}]: {full_path}")  
        try:  
            extractor = extract_docx_links if ext == ".docx" else extract_doc_links  
            links = extractor(full_path)  
            if not links:  
                log("No links found.")  
                continue  

            replaceable_links = [(orig, repl) for orig, repl, *_ in links if repl]  
            if not replaceable_links:  
                log("No replaceable links found.")  
                continue  

            updater = update_docx_file if ext == ".docx" else update_doc_file  
            if updater(full_path, replaceable_links):  
                updated += 1  
                total_replacements += len(replaceable_links)  
                log(f"Updated {len(replaceable_links)} links.")  
        except Exception as e:  
            log(f"[ERROR] {file}: {e}")  

log("=== Scan Complete ===")  
log(f"Processed files: {processed}")  
log(f"Updated files: {updated}")  
log(f"Total replacements: {total_replacements}")  
write_log_to_html()  
write_log_to_file()

if name == "main":
folder_path = input("Enter folder path: ").strip()
if not folder_path or not os.path.exists(folder_path):
print("Invalid folder path.")
sys.exit(1)
scan_and_update_documents(folder_path)
print("Log written to link_update_log.html")

