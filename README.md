remove the extra code also I don't want to present on terminal either file has header or footer just it should copy header and footer and place in body of the document other functionality will remain unchanged


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
        try:
            app.AutomationSecurity = 3  # msoAutomationSecurityForceDisable
        except Exception:
            pass
        try:
            app.NormalTemplate.Saved = True
        except Exception:
            pass
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
    except Exception as e:
        print(f"Repair failed for {path}: {e}")
        return False
    finally:
        app.Quit()


def validate_docx_with_word(path):
    if win32 is None:
        return True
    app = win32.DispatchEx("Word.Application")
    configure_word(app)
    try:
        try:
            doc = app.Documents.Open(path, ReadOnly=True, OpenAndRepair=True, ConfirmConversions=False, AddToRecentFiles=False)
            doc.Saved = True
            doc.Close(SaveChanges=False)
            return True
        except Exception as e:
            print(f"Validation failed for {path}: {e}")
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
    children = list(body)
    if children and children[0].tag == f"{{{w_ns}}}sectPr":
        body.insert(0, p)
    else:
        body.insert(0, p)
    tree.write(doc_xml, xml_declaration=True, encoding="UTF-8", method="xml")
    base_name = os.path.splitext(os.path.basename(original_docx_path))[0]
    # CHANGED: ensure proper fallback filename with extension
    fallback_path = os.path.join(os.path.dirname(original_docx_path), base_name + ".docx")
    with zipfile.ZipFile(fallback_path, 'w') as outzip:
        for folder, _, files in os.walk(temp_dir_fb):
            for f in files:
                fp = os.path.join(folder, f)
                outzip.write(fp, os.path.relpath(fp, temp_dir_fb))
    shutil.rmtree(temp_dir_fb)
    print(f"Created fallback DOCX (plain header text): {fallback_path}")
    return fallback_path


def save_as_web_archive(input_path, original_ext, fallback_path=None):
    if win32 is None:
        print("pywin32 not installed; skipping MHT/MHTML conversion.")
        return None
    out_ext = ".mht" if original_ext == ".doc" else ".mhtml"
    out_path = os.path.splitext(input_path)[0] + out_ext
    word = win32.DispatchEx("Word.Application")
    configure_word(word)
    try:
        try:
            doc = word.Documents.Open(input_path, OpenAndRepair=True, ConfirmConversions=False, AddToRecentFiles=False)
        except Exception as e:
            if fallback_path and fallback_path != input_path:
                print(f"Failed to open merged file for conversion ({e}). Retrying with original file.")
                doc = word.Documents.Open(fallback_path, OpenAndRepair=True, ConfirmConversions=False, AddToRecentFiles=False)
                out_path = os.path.splitext(fallback_path)[0] + out_ext
            else:
                print(f"Conversion aborted: cannot open file ({e}).")
                return None
        doc.SaveAs(out_path, FileFormat=9, AddToRecentFiles=False)
        doc.Saved = True
        doc.Close(SaveChanges=False)
        print(f"Saved Web Archive: {out_path}")
        return out_path
    finally:
        word.Quit()


def extract_header_to_body(docx_path, output_docx_path=None):
    original_ext = os.path.splitext(docx_path)[1].lower()
    if original_ext == ".doc":
        repaired = repair_docx_with_word(docx_path)
        valid = validate_docx_with_word(docx_path)
        print(f"HEADER IMAGE: SKIPPED (binary .doc) -> {docx_path}")
        final_doc = docx_path
        return final_doc, False, valid, None
    temp_dir = "temp_docx"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)
    try:
        with zipfile.ZipFile(docx_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
    except Exception as e:
        print(f"Failed to unzip {docx_path}: {e}")
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        return None, False, False, None
    word_dir = os.path.join(temp_dir, "word")
    document_path = os.path.join(word_dir, "document.xml")
    if not os.path.exists(document_path):
        print("document.xml missing.")
        shutil.rmtree(temp_dir)
        return None, False, False, None
    w_ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    r_ns = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    ET.register_namespace('w', w_ns)
    ET.register_namespace('r', r_ns)
    try:
        document_tree = ET.parse(document_path)
    except Exception as e:
        print(f"Parse error document.xml: {e}")
        shutil.rmtree(temp_dir)
        return None, False, False, None
    document_root = document_tree.getroot()
    body = document_root.find(f"{{{w_ns}}}body")
    if body is None:
        print("Body not found.")
        shutil.rmtree(temp_dir)
        return None, False, False, None
    rels_path = os.path.join(word_dir, "_rels", "document.xml.rels")
    if not os.path.exists(rels_path):
        print("document.xml.rels missing.")
        shutil.rmtree(temp_dir)
        return None, False, False, None
    rels_tree = ET.parse(rels_path)
    rels_root = rels_tree.getroot()
    existing_ids = set()
    rel_signature = {}
    for rel in list(rels_root):
        rid = rel.get("Id")
        if rid:
            existing_ids.add(rid)
        sig = (rel.get("Type"), rel.get("Target"), rel.get("TargetMode"))
        rel_signature[sig] = rid

    def new_rel_id(base="rId"):
        i = 1
        while f"{base}{i}" in existing_ids:
            i += 1
        rid = f"{base}{i}"
        existing_ids.add(rid)
        return rid

    header_files = sorted(f for f in os.listdir(word_dir) if f.startswith("header") and f.endswith(".xml"))

    def collect_text(part_path):
        try:
            tree = ET.parse(part_path)
            root = tree.getroot()
            texts = []
            for t in root.iter(f"{{{w_ns}}}t"):
                if t.text:
                    texts.append(t.text)
            return " ".join(texts).strip()
        except Exception:
            return ""

    def header_has_image_xml(part_root):
        img_tags_end = ("drawing", "imagedata", "pict", "pic", "blip")
        for el in part_root.iter():
            lg = el.tag.lower()
            if any(lg.endswith(suffix) for suffix in img_tags_end):
                return True
            # v:shape or w:pict containing image reference attributes
            for attr_v in ("{urn:schemas-microsoft-com:vml}imagedata",
                           "id", "r:embed", "r:link", "src", "data"):
                for attr_k, attr_val in el.attrib.items():
                    if any(keyfrag in attr_k.lower() for keyfrag in ("r:embed", "imagedata", "image")):
                        return True
        return False

    def header_rel_has_image(header_filename):
        rel_path = os.path.join(word_dir, "_rels", header_filename + ".rels")
        if not os.path.exists(rel_path):
            return False
        try:
            rtree = ET.parse(rel_path)
            for r in rtree.getroot():
                rtype = r.get("Type", "")
                if rtype.endswith("/image"):
                    return True
        except Exception:
            pass
        return False

    header_info = []  # [(filename, text, has_image)]
    for hf in header_files:
        part_path = os.path.join(word_dir, hf)
        txt = collect_text(part_path)
        has_img = False
        try:
            ptree = ET.parse(part_path)
            if header_has_image_xml(ptree.getroot()):
                has_img = True
        except Exception:
            pass
        if not has_img and header_rel_has_image(hf):
            has_img = True
        header_info.append((hf, txt, has_img))

    # Selection priority
    selected_header = None
    selected_header_text = ""
    selected_header_has_image = False
    # 1. text + image
    for hf, txt, himg in header_info:
        if txt and himg:
            selected_header, selected_header_text, selected_header_has_image = hf, txt, True
            break
    # 2. image only
    if not selected_header:
        for hf, txt, himg in header_info:
            if himg:
                selected_header, selected_header_text, selected_header_has_image = hf, txt, True
                break
    # 3. text only
    if not selected_header:
        for hf, txt, himg in header_info:
            if txt:
                selected_header, selected_header_text, selected_header_has_image = hf, txt, himg
                break
    # 4. fallback first
    if not selected_header and header_info:
        hf, txt, himg = header_info[0]
        selected_header, selected_header_text, selected_header_has_image = hf, txt, himg

    print(f"HEADER IMAGE: {'YES' if selected_header_has_image else 'NO'} -> {docx_path}")

    def merge_part(part_filename):
        part_path = os.path.join(word_dir, part_filename)
        if not os.path.exists(part_path):
            return
        try:
            part_tree = ET.parse(part_path)
        except ET.ParseError:
            return
        part_root = part_tree.getroot()
        part_rels_path = os.path.join(word_dir, "_rels", part_filename + ".rels")
        id_map = {}
        image_rel_count = 0  # NEW: count image rels pulled in
        if os.path.exists(part_rels_path):
            part_rels_tree = ET.parse(part_rels_path)
            part_rels_root = part_rels_tree.getroot()
            for rel in list(part_rels_root):
                old_id = rel.get("Id")
                sig = (rel.get("Type"), rel.get("Target"), rel.get("TargetMode"))
                if sig in rel_signature:
                    id_map[old_id] = rel_signature[sig]
                else:
                    new_id = new_rel_id()
                    clone = copy.deepcopy(rel)
                    clone.set("Id", new_id)
                    rels_root.append(clone)
                    rel_signature[sig] = new_id
                    id_map[old_id] = new_id
                # Count image relationships specifically
                rtype = rel.get("Type") or ""
                if rtype.endswith("/image"):
                    image_rel_count += 1
        moved_children = [copy.deepcopy(c) for c in list(part_root)]
        if id_map:
            for elem in moved_children:
                for el in elem.iter():
                    rid_attr = el.get(f"{{{r_ns}}}id")
                    if rid_attr and rid_attr in id_map:
                        el.set(f"{{{r_ns}}}id", id_map[rid_attr])
                    for attr_name, attr_val in list(el.attrib.items()):
                        if attr_val in id_map:
                            el.set(attr_name, id_map[attr_val])
        if image_rel_count:
            print(f"Merged {image_rel_count} image relationship(s) from {part_filename} into document.")
        return moved_children

    header_blocks = []
    if selected_header:
        blocks = merge_part(selected_header)
        if blocks:
            header_blocks.extend(blocks)

    footer_files = sorted(f for f in os.listdir(word_dir) if f.startswith("footer") and f.endswith(".xml"))
    selected_footer = None
    selected_footer_text = ""
    for ff in reversed(footer_files):
        ftxt = collect_text(os.path.join(word_dir, ff))
        if ftxt:
            selected_footer = ff
            selected_footer_text = ftxt
            break

    footer_blocks = []
    if selected_footer:
        f_blocks = merge_part(selected_footer)
        if f_blocks:
            footer_blocks.extend(f_blocks)

    if footer_blocks:
        page_pattern = re.compile(r'^\s*\d+\s*/\s*\d+\s*$')
        page_of_pattern = re.compile(r'\bPage\s+\d+\s+of\s+\d+\b', re.IGNORECASE)
        page_word_pattern = re.compile(r'\bpage\b', re.IGNORECASE)

        def is_page_field_run(run):
            for child in run:
                if child.tag == f"{{{w_ns}}}fldChar":
                    return True
                if child.tag == f"{{{w_ns}}}instrText":
                    txt = (child.text or "").upper()
                    if "PAGE" in txt or "NUMPAGES" in txt:
                        return True
            t = run.find(f"{{{w_ns}}}t")
            if t is not None and t.text:
                if page_pattern.match(t.text.strip()):
                    return True
                if page_of_pattern.search(t.text):
                    return True
            return False

        def cleanse_footer_block(block):
            for p in list(block.iter(f"{{{w_ns}}}p")):
                runs = list(p.findall(f"{{{w_ns}}}r"))
                for r in runs:
                    t_el = r.find(f"{{{w_ns}}}t")
                    if t_el is not None and t_el.text:
                        new_txt = page_of_pattern.sub("", t_el.text)
                        if new_txt != t_el.text:
                            new_txt = new_txt.strip()
                            if new_txt:
                                t_el.text = new_txt
                            else:
                                p.remove(r)
                                continue
                    if is_page_field_run(r):
                        p.remove(r)
                truncated = False
                for r in list(p.findall(f"{{{w_ns}}}r")):
                    if truncated:
                        p.remove(r)
                        continue
                    t_el = r.find(f"{{{w_ns}}}t")
                    if t_el is not None and t_el.text:
                        match = page_word_pattern.search(t_el.text)
                        if match:
                            before = t_el.text[:match.start()].rstrip()
                            if before:
                                t_el.text = before
                            else:
                                p.remove(r)
                            truncated = True

        for b in footer_blocks:
            cleanse_footer_block(b)

    sectPr_elements = list(document_root.iter(f"{{{w_ns}}}sectPr"))
    final_sectPr = None
    if len(body) and body[-1].tag == f"{{{w_ns}}}sectPr":
        final_sectPr = body[-1]
    else:
        for el in reversed(list(body)):
            if el.tag == f"{{{w_ns}}}sectPr":
                final_sectPr = el
                break

    for sp in sectPr_elements:
        for ref_tag in ("headerReference", "footerReference"):
            for ref in list(sp.findall(f"{{{w_ns}}}{ref_tag}")):
                sp.remove(ref)

    insert_index = 0
    for blk in header_blocks:
        body.insert(insert_index, blk)
        insert_index += 1
    if footer_blocks:
        if final_sectPr is not None and final_sectPr in list(body):
            insert_pos = list(body).index(final_sectPr)
            for blk in footer_blocks:
                body.insert(insert_pos, blk)
                insert_pos += 1
        else:
            for blk in footer_blocks:
                body.append(blk)
    w_sectPr = f"{{{w_ns}}}sectPr"
    if any(child.tag == w_sectPr for child in body):
        last_sect = None
        for child in list(body):
            if child.tag == w_sectPr:
                last_sect = child
        if last_sect is not None and body[-1] is not last_sect:
            body.remove(last_sect)
            body.append(last_sect)

    rels_tree.write(rels_path, xml_declaration=True, encoding="UTF-8", method="xml")
    document_tree.write(document_path, xml_declaration=True, encoding='UTF-8', method='xml')
    # When creating default output path ensure .docx suffix
    if output_docx_path is None:
        base_name = os.path.splitext(os.path.basename(docx_path))[0]
        output_docx_path = os.path.join(os.path.dirname(docx_path), f"{base_name}_with_header_footer_in_body.docx")
    else:
        # CHANGED: append .docx if missing
        if not output_docx_path.lower().endswith(".docx"):
            output_docx_path += ".docx"
    os.makedirs(os.path.dirname(output_docx_path), exist_ok=True)
    with zipfile.ZipFile(output_docx_path, 'w') as docx_out:
        for foldername, _, filenames in os.walk(temp_dir):
            for filename in filenames:
                file_path = os.path.join(foldername, filename)
                arcname = os.path.relpath(file_path, temp_dir)
                docx_out.write(file_path, arcname)
    shutil.rmtree(temp_dir)
    repaired = repair_docx_with_word(output_docx_path)
    merged_valid = validate_docx_with_word(output_docx_path)
    used_fallback = False
    final_docx_for_conversion = output_docx_path
    if not merged_valid:
        fallback = create_fallback_plain_header(docx_path, selected_header_text)
        if fallback:
            repair_docx_with_word(fallback)
            final_docx_for_conversion = fallback
            used_fallback = True
            merged_valid = validate_docx_with_word(fallback)
    return final_docx_for_conversion, used_fallback, merged_valid, selected_header_has_image


def process_all(input_root, output_root):
    manual_issues = []
    header_with_image = []
    header_without_image = []
    docs_out_root = os.path.join(output_root, "repaired_docs")
    web_out_root = os.path.join(output_root, "web_archives")
    for root, _, files in os.walk(input_root):
        for f in files:
            if not f.lower().endswith((".doc", ".docx", ".docm")):
                continue
            src_path = os.path.join(root, f)
            rel_path = os.path.relpath(src_path, input_root)
            rel_dir = os.path.dirname(rel_path)
            ext = os.path.splitext(f)[1].lower()
            
            # Check if filename starts with "FM" to skip MHT/MHTML conversion
            filename_base = os.path.splitext(os.path.basename(f))[0]
            skip_web_conversion = filename_base.upper().startswith("FM")
            
            if ext in (".docx", ".docm"):
                # CHANGED: ensure repaired path has suffix and extension
                repaired_path = os.path.join(docs_out_root, rel_dir, os.path.splitext(os.path.basename(f))[0] + ext)
                final_docx_path, used_fallback, valid, header_image = extract_header_to_body(src_path, repaired_path)
            else:
                final_docx_path, used_fallback, valid, header_image = extract_header_to_body(src_path, None)
                repaired_dir_full = os.path.join(docs_out_root, rel_dir)
                os.makedirs(repaired_dir_full, exist_ok=True)
                repaired_path = os.path.join(repaired_dir_full, os.path.basename(src_path))
                try:
                    shutil.copy2(src_path, repaired_path)
                except Exception as e:
                    print(f"Copy failed for {src_path}: {e}")
                    valid = False
            if header_image is True:
                header_with_image.append(src_path)
            elif header_image is False:
                header_without_image.append(src_path)
            web_created = None
            
            # Skip MHT/MHTML conversion for files starting with "FM"
            if skip_web_conversion:
                print(f"Skipping MHT/MHTML conversion for FM file: {src_path}")
                web_created = "skipped"  # Mark as handled but skipped
            elif final_docx_path:
                web_temp = save_as_web_archive(final_docx_path, ext, fallback_path=src_path)
                if web_temp:
                    web_rel_base = os.path.splitext(rel_path)[0]
                    web_ext = ".mht" if ext == ".doc" else ".mhtml"
                    web_dest_path = os.path.join(web_out_root, web_rel_base + web_ext)
                    os.makedirs(os.path.dirname(web_dest_path), exist_ok=True)
                    try:
                        if os.path.abspath(web_temp) != os.path.abspath(web_dest_path):
                            os.replace(web_temp, web_dest_path)
                        web_created = web_dest_path
                    except Exception as e:
                        print(f"Failed to move web archive {web_temp} -> {web_dest_path}: {e}")
                else:
                    valid = False
            else:
                valid = False
            issue = False
            if not valid or used_fallback or (web_created is None and not skip_web_conversion):
                issue = True
            if issue:
                manual_issues.append(src_path)
    print("\nBatch complete.")
    if manual_issues:
        print("Files needing manual check (excluding simple missing header/footer cases):")
        for p in manual_issues:
            print(p)
    else:
        print("No manual issue files detected.")
    print("\nHeader image summary:")
    print(f"With image ({len(header_with_image)}):")
    for p in header_with_image:
        print(p)
    print(f"Without image ({len(header_without_image)}):")
    for p in header_without_image:
        print(p)


if __name__ == "__main__":
    input_root = input("Enter INPUT root folder path: ").strip('"')
    output_root = input("Enter OUTPUT root folder path: ").strip('"')
    if not os.path.isdir(input_root):
        print("Invalid input root.")
    else:
        os.makedirs(output_root, exist_ok=True)
        process_all(input_root, output_root)

