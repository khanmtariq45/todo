import zipfile
import os
import shutil
import xml.etree.ElementTree as ET
import copy
import re

try:
    import win32com.client as win32
except ImportError:
    win32 = None


def configure_word(app):
    try:
        app.Visible = False
        app.DisplayAlerts = 0
        o = app.Options
        o.SaveNormalPrompt = False
        o.ConfirmConversions = False
        o.WarnBeforeSavingPrintingSendingMarkup = False
        app.AutomationSecurity = 3  # msoAutomationSecurityForceDisable
        app.NormalTemplate.Saved = True
    except Exception:
        pass


def repair_docx_with_word(path):
    if win32 is None:
        return False
    app = win32.DispatchEx("Word.Application")
    configure_word(app)
    try:
        doc = app.Documents.Open(path, ReadOnly=False, OpenAndRepair=True, ConfirmConversions=False, AddToRecentFiles=False)
        doc.Saved = True
        doc.Close(SaveChanges=True)
        return True
    except Exception:
        return False
    finally:
        app.Quit()


def validate_docx_with_word(path):
    if win32 is None:
        return True
    app = win32.DispatchEx("Word.Application")
    configure_word(app)
    try:
        doc = app.Documents.Open(path, ReadOnly=True, OpenAndRepair=True, ConfirmConversions=False, AddToRecentFiles=False)
        doc.Saved = True
        doc.Close(SaveChanges=False)
        return True
    except Exception:
        return False
    finally:
        app.Quit()


def create_fallback_plain_header(original_docx_path, header_text):
    if not header_text:
        return None
    temp_dir_fb = "temp_docx_fallback"
    if os.path.exists(temp_dir_fb):
        shutil.rmtree(temp_dir_fb)
    os.makedirs(temp_dir_fb)
    with zipfile.ZipFile(original_docx_path, 'r') as z:
        z.extractall(temp_dir_fb)
    doc_xml = os.path.join(temp_dir_fb, "word", "document.xml")
    if not os.path.exists(doc_xml):
        shutil.rmtree(temp_dir_fb)
        return None
    w_ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    tree = ET.parse(doc_xml)
    root = tree.getroot()
    body = root.find(f"{{{w_ns}}}body")
    if body is None:
        shutil.rmtree(temp_dir_fb)
        return None
    p = ET.Element(f"{{{w_ns}}}p")
    r = ET.SubElement(p, f"{{{w_ns}}}r")
    t = ET.SubElement(r, f"{{{w_ns}}}t")
    t.text = header_text
    body.insert(0, p)
    tree.write(doc_xml, xml_declaration=True, encoding="UTF-8", method="xml")
    base_name = os.path.splitext(os.path.basename(original_docx_path))[0]
    fallback_path = os.path.join(os.path.dirname(original_docx_path), base_name + ".docx")
    with zipfile.ZipFile(fallback_path, 'w') as outzip:
        for folder, _, files in os.walk(temp_dir_fb):
            for f in files:
                fp = os.path.join(folder, f)
                outzip.write(fp, os.path.relpath(fp, temp_dir_fb))
    shutil.rmtree(temp_dir_fb)
    return fallback_path


def save_as_web_archive(input_path, original_ext, fallback_path=None):
    if win32 is None:
        return None
    out_ext = ".mht" if original_ext == ".doc" else ".mhtml"
    out_path = os.path.splitext(input_path)[0] + out_ext
    word = win32.DispatchEx("Word.Application")
    configure_word(word)
    try:
        doc = word.Documents.Open(input_path, OpenAndRepair=True, ConfirmConversions=False, AddToRecentFiles=False)
        doc.SaveAs(out_path, FileFormat=9, AddToRecentFiles=False)
        doc.Saved = True
        doc.Close(SaveChanges=False)
        return out_path
    finally:
        word.Quit()


def extract_header_to_body(docx_path, output_docx_path=None):
    original_ext = os.path.splitext(docx_path)[1].lower()
    if original_ext == ".doc":
        repaired = repair_docx_with_word(docx_path)
        valid = validate_docx_with_word(docx_path)
        final_doc = docx_path
        return final_doc, False, valid, None
    temp_dir = "temp_docx"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)
    try:
        with zipfile.ZipFile(docx_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
    except Exception:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        return None, False, False, None
    document_path = os.path.join(temp_dir, "word", "document.xml")
    if not os.path.exists(document_path):
        shutil.rmtree(temp_dir)
        return None, False, False, None
    w_ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    ET.register_namespace('w', w_ns)
    try:
        document_tree = ET.parse(document_path)
    except Exception:
        shutil.rmtree(temp_dir)
        return None, False, False, None
    document_root = document_tree.getroot()
    body = document_root.find(f"{{{w_ns}}}body")
    if body is None:
        shutil.rmtree(temp_dir)
        return None, False, False, None

    header_files = sorted(f for f in os.listdir(os.path.join(temp_dir, "word")) if f.startswith("header") and f.endswith(".xml"))
    selected_header = None
    selected_header_text = ""
    for hf in header_files:
        part_path = os.path.join(temp_dir, "word", hf)
        try:
            tree = ET.parse(part_path)
            root = tree.getroot()
            texts = [t.text for t in root.iter(f"{{{w_ns}}}t") if t.text]
            header_text = " ".join(texts).strip()
            if header_text:
                selected_header = hf
                selected_header_text = header_text
                break
        except Exception:
            continue

    footer_files = sorted(f for f in os.listdir(os.path.join(temp_dir, "word")) if f.startswith("footer") and f.endswith(".xml"))
    selected_footer = None
    selected_footer_text = ""
    for ff in reversed(footer_files):
        part_path = os.path.join(temp_dir, "word", ff)
        try:
            tree = ET.parse(part_path)
            root = tree.getroot()
            texts = [t.text for t in root.iter(f"{{{w_ns}}}t") if t.text]
            footer_text = " ".join(texts).strip()
            if footer_text:
                selected_footer = ff
                selected_footer_text = footer_text
                break
        except Exception:
            continue

    header_blocks = []
    if selected_header:
        header_path = os.path.join(temp_dir, "word", selected_header)
        header_tree = ET.parse(header_path)
        header_root = header_tree.getroot()
        header_blocks.extend(list(header_root))

    footer_blocks = []
    if selected_footer:
        footer_path = os.path.join(temp_dir, "word", selected_footer)
        footer_tree = ET.parse(footer_path)
        footer_root = footer_tree.getroot()
        footer_blocks.extend(list(footer_root))

    for blk in header_blocks:
        body.insert(0, blk)
    for blk in footer_blocks:
        body.append(blk)

    if output_docx_path is None:
        base_name = os.path.splitext(os.path.basename(docx_path))[0]
        output_docx_path = os.path.join(os.path.dirname(docx_path), f"{base_name}_with_header_footer_in_body.docx")

    os.makedirs(os.path.dirname(output_docx_path), exist_ok=True)
    with zipfile.ZipFile(output_docx_path, 'w') as docx_out:
        for foldername, _, filenames in os.walk(temp_dir):
            for filename in filenames:
                file_path = os.path.join(foldername, filename)
                arcname = os.path.relpath(file_path, temp_dir)
                docx_out.write(file_path, arcname)

    shutil.rmtree(temp_dir)
    repaired = repair_docx_with_word(output_docx_path)
    valid = validate_docx_with_word(output_docx_path)
    return output_docx_path, False, valid, False


def process_all(input_root, output_root):
    for root, _, files in os.walk(input_root):
        for f in files:
            if not f.lower().endswith((".doc", ".docx", ".docm")):
                continue
            src_path = os.path.join(root, f)
            final_docx_path, _, valid, _ = extract_header_to_body(src_path, None)
            if not valid:
                continue


if __name__ == "__main__":
    input_root = input("Enter INPUT root folder path: ").strip('"')
    output_root = input("Enter OUTPUT root folder path: ").strip('"')
    if os.path.isdir(input_root):
        os.makedirs(output_root, exist_ok=True)
        process_all(input_root, output_root)
