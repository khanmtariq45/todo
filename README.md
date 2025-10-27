import zipfile
import os
import shutil
import xml.etree.ElementTree as ET
import copy
import re
import time
import datetime
import concurrent.futures  # keep

try:
    import win32com.client as win32
except ImportError:
    win32 = None


# Precompiled regex (moved out of extract loop to avoid recompilation)
PAGE_PATTERN_RE = re.compile(r'^\s*\d+\s*/\s*\d+\s*$')
PAGE_OF_PATTERN_RE = re.compile(r'\bPage\s+\d+\s+of\s+\d+\b', re.IGNORECASE)
PAGE_WORD_PATTERN_RE = re.compile(r'\bpage\b', re.IGNORECASE)
# NEW: matches "1 of 12" (without the word Page)
DIGIT_OF_DIGIT_RE = re.compile(r'^\s*\d+\s+of\s+\d+\s*$', re.IGNORECASE)

# Supported extensions set (faster membership)
_SUPPORTED_DOC_EXT = {'.doc', '.docx', '.docm'}

PER_FILE_TIMEOUT = 180  # NEW: seconds before considering a file "stuck"
MAX_WORKERS = 10  # NEW: limit concurrent file processing


def is_supported_doc(filename):
    return os.path.splitext(filename)[1].lower() in _SUPPORTED_DOC_EXT


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
    except Exception:
        # Silent error handling
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
        # Silent error handling
        return False
    finally:
        app.Quit()


def create_fallback_plain_header(original_docx_path, header_text, out_ext=".docx"):
    # CHANGED: added out_ext parameter to preserve .docm where needed
    if not header_text:
        return None
    temp_dir_fb = "temp_docx_fallback"
    if os.path.exists(temp_dir_fb):
        shutil.rmtree(temp_dir_fb, ignore_errors=True)
    os.makedirs(temp_dir_fb)
    try:
        with zipfile.ZipFile(original_docx_path, 'r') as z:
            z.extractall(temp_dir_fb)
    except Exception:
        shutil.rmtree(temp_dir_fb, ignore_errors=True)
        return None
    doc_xml = os.path.join(temp_dir_fb, "word", "document.xml")
    if not os.path.exists(doc_xml):
        shutil.rmtree(temp_dir_fb, ignore_errors=True)
        return None
    w_ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    tree = ET.parse(doc_xml)
    root = tree.getroot()
    body = root.find(f"{{{w_ns}}}body")
    if body is None:
        shutil.rmtree(temp_dir_fb, ignore_errors=True)
        return None
    p = ET.Element(f"{{{w_ns}}}p")
    r = ET.SubElement(p, f"{{{w_ns}}}r")
    t = ET.SubElement(r, f"{{{w_ns}}}t")
    t.text = header_text
    body.insert(0, p)
    tree.write(doc_xml, xml_declaration=True, encoding="UTF-8", method="xml")
    base_name = os.path.splitext(os.path.basename(original_docx_path))[0]
    # Preserve requested extension
    fallback_path = os.path.join(os.path.dirname(original_docx_path), base_name + out_ext)
    with zipfile.ZipFile(fallback_path, 'w') as outzip:
        for folder, _, files in os.walk(temp_dir_fb):
            for f in files:
                fp = os.path.join(folder, f)
                outzip.write(fp, os.path.relpath(fp, temp_dir_fb))
    shutil.rmtree(temp_dir_fb, ignore_errors=True)
    return fallback_path

def safe_rmtree(path, retries=5, delay=0.25):
    # NEW: robust removal with retries (handles WinError 32)
    for attempt in range(retries):
        try:
            if os.path.isdir(path):
                shutil.rmtree(path)
            return True
        except Exception as e:
            if attempt == retries - 1:
                print(f"Warning: could not remove {path}: {e}")
                return False
            time.sleep(delay)
    return False


def save_as_web_archive(input_path, original_ext, skip_web_conversion, fallback_path=None):
    if win32 is None:
        return None
    out_ext = ".mht" if original_ext == ".doc" else ".mhtml"
    out_path = os.path.splitext(input_path)[0] + out_ext
    word = win32.DispatchEx("Word.Application")
    configure_word(word)
    try:
        try:
            doc = word.Documents.Open(input_path, OpenAndRepair=True, ConfirmConversions=False, AddToRecentFiles=False)
        except Exception:
            if fallback_path and fallback_path != input_path:
                # Silent retry with fallback
                doc = word.Documents.Open(fallback_path, OpenAndRepair=True, ConfirmConversions=False, AddToRecentFiles=False)
                out_path = os.path.splitext(fallback_path)[0] + out_ext
            else:
                return None
        if not skip_web_conversion:
            doc.SaveAs(out_path, FileFormat=9, AddToRecentFiles=False)
            doc.Saved = True
            doc.Close(SaveChanges=False)
        return out_path
    finally:
        word.Quit()


def collect_doc_files(input_root):
    """Single pass collection of files (replaces separate counting walk)."""
    files = []
    root_len = len(input_root.rstrip("\\/"))
    for root, _, fnames in os.walk(input_root):
        for f in fnames:
            if not is_supported_doc(f):
                continue
            full_path = os.path.join(root, f)
            rel_path = full_path[root_len+1:] if full_path.startswith(input_root) else os.path.relpath(full_path, input_root)
            ext = os.path.splitext(f)[1].lower()
            files.append((full_path, rel_path, ext))
    return files


def extract_header_to_body(docx_path, output_docx_path=None):
    original_ext = os.path.splitext(docx_path)[1].lower()
    if original_ext == ".doc":
        repaired = repair_docx_with_word(docx_path)
        valid = validate_docx_with_word(docx_path)
        final_doc = docx_path
        return final_doc, False, valid, None

    # NEW: unique temp working directory per file to prevent locking conflicts
    temp_dir = f"temp_docx_{int(time.time()*1000)}_{os.getpid()}"
    if os.path.exists(temp_dir):
        safe_rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)

    try:
        with zipfile.ZipFile(docx_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
    except Exception as e:
        safe_rmtree(temp_dir)
        return None, False, False, None
    word_dir = os.path.join(temp_dir, "word")
    document_path = os.path.join(word_dir, "document.xml")
    if not os.path.exists(document_path):
        shutil.rmtree(temp_dir)
        return None, False, False, None
    w_ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    r_ns = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    ET.register_namespace('w', w_ns)
    ET.register_namespace('r', r_ns)
    try:
        document_tree = ET.parse(document_path)
    except Exception as e:
        shutil.rmtree(temp_dir)
        return None, False, False, None
    document_root = document_tree.getroot()
    body = document_root.find(f"{{{w_ns}}}body")
    if body is None:
        shutil.rmtree(temp_dir)
        return None, False, False, None
    rels_path = os.path.join(word_dir, "_rels", "document.xml.rels")
    if not os.path.exists(rels_path):
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
            # Remove print statement
            pass
        return moved_children

    header_blocks = []
    if selected_header:
        blocks = merge_part(selected_header)
        if blocks:
            header_blocks.extend(blocks)

    # --- NEW (REPLACED): inject square logo + header text side-by-side if no image ---
    if not selected_header_has_image:
        logo_source_path = r"C:\Users\MuhammadTariqPKDev\Downloads\Teekay TOC Word Files\1\Input\logo.png"
        if os.path.isfile(logo_source_path):
            media_dir = os.path.join(word_dir, "media")
            os.makedirs(media_dir, exist_ok=True)
            # Force name TK-LOGO-GREY.png (add suffix if collision)
            base_name_img = "TK-LOGO-GREY"
            ext_img = ".png"
            i_cnt = 0
            while True:
                candidate = f"{base_name_img}{'' if i_cnt == 0 else '_' + str(i_cnt)}{ext_img}"
                candidate_full = os.path.join(media_dir, candidate)
                if not os.path.exists(candidate_full):
                    break
                i_cnt += 1
            shutil.copy2(logo_source_path, candidate_full)

            img_rel_type = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
            target_rel = f"media/{candidate}"
            sig = (img_rel_type, target_rel, None)
            if sig in rel_signature:
                img_rid = rel_signature[sig]
            else:
                img_rid = new_rel_id()
                rel_el = ET.Element("Relationship")
                rel_el.set("Id", img_rid)
                rel_el.set("Type", img_rel_type)
                rel_el.set("Target", target_rel)
                rels_root.append(rel_el)
                rel_signature[sig] = img_rid

            wp_ns = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            a_ns = "http://schemas.openxmlformats.org/drawingml/2006/main"
            pic_ns = "http://schemas.openxmlformats.org/drawingml/2006/picture"
            ET.register_namespace('wp', wp_ns)
            ET.register_namespace('a', a_ns)
            ET.register_namespace('pic', pic_ns)

            # Requested logo size: width=59.4pt, height=37.8pt
            # Convert points to EMUs (1pt = 12700 EMUs):
            # 59.4 * 12700 = 754380, 37.8 * 12700 = 480060
            EMU_W = "754380"
            EMU_H = "480060"

            # Try to find existing table (which will become MsoNormalTable in HTML)
            existing_table = None
            for blk in header_blocks:
                if blk.tag == f"{{{w_ns}}}tbl":
                    existing_table = blk
                    break

            # This flag & metadata allow deferred insertion if no table yet
            defer_logo_first_table = False
            logo_meta = {"rid": img_rid, "w": EMU_W, "h": EMU_H}

            if existing_table is not None:
                # Insert logo inside the first cell of the first row (no new column)
                first_tr = existing_table.find(f"{{{w_ns}}}tr")
                if first_tr is None:
                    first_tr = ET.SubElement(existing_table, f"{{{w_ns}}}tr")
                first_tc = None
                for c in list(first_tr):
                    if c.tag == f"{{{w_ns}}}tc":
                        first_tc = c
                        break
                if first_tc is None:
                    first_tc = ET.SubElement(first_tr, f"{{{w_ns}}}tc")
                    ET.SubElement(first_tc, f"{{{w_ns}}}tcPr")
                # Find or create first paragraph in the cell
                first_p = None
                for child in list(first_tc):
                    if child.tag == f"{{{w_ns}}}p":
                        first_p = child
                        break
                if first_p is None:
                    first_p = ET.SubElement(first_tc, f"{{{w_ns}}}p")
                # Avoid duplicating logo if already inserted (search for drawing with our alt name)
                already_has_logo = False
                for dr in first_p.iter(f"{{{w_ns}}}drawing"):
                    for dp in dr.iter(f"{{{wp_ns}}}docPr"):
                        if dp.get("name") == "TK-LOGO-GREY":
                            already_has_logo = True
                            break
                    if already_has_logo:
                        break
                if not already_has_logo:
                    r_img = ET.Element(f"{{{w_ns}}}r")
                    drawing_el = ET.SubElement(r_img, f"{{{w_ns}}}drawing")
                    inline_el = ET.SubElement(drawing_el, f"{{{wp_ns}}}inline", attrib={"distT":"0","distB":"0","distL":"0","distR":"0"})
                    ET.SubElement(inline_el, f"{{{wp_ns}}}extent", cx=EMU_W, cy=EMU_H)
                    ET.SubElement(inline_el, f"{{{wp_ns}}}docPr", id="1", name="TK-LOGO-GREY", descr="TK-LOGO-GREY")
                    ET.SubElement(inline_el, f"{{{wp_ns}}}cNvGraphicFramePr")
                    graphic_el = ET.SubElement(inline_el, f"{{{a_ns}}}graphic")
                    graphic_data = ET.SubElement(graphic_el, f"{{{a_ns}}}graphicData", uri="http://schemas.openxmlformats.org/drawingml/2006/picture")
                    pic_pic = ET.SubElement(graphic_data, f"{{{pic_ns}}}pic")
                    nvPicPr = ET.SubElement(pic_pic, f"{{{pic_ns}}}nvPicPr")
                    ET.SubElement(nvPicPr, f"{{{pic_ns}}}cNvPr", id="0", name="TK-LOGO-GREY")
                    ET.SubElement(nvPicPr, f"{{{pic_ns}}}cNvPicPr")
                    blipFill = ET.SubElement(pic_pic, f"{{{pic_ns}}}blipFill")
                    blip = ET.SubElement(blipFill, f"{{{a_ns}}}blip")
                    blip.set(f"{{{r_ns}}}embed", img_rid)
                    stretch = ET.SubElement(blipFill, f"{{{a_ns}}}stretch")
                    ET.SubElement(stretch, f"{{{a_ns}}}fillRect")
                    spPr = ET.SubElement(pic_pic, f"{{{pic_ns}}}spPr")
                    xfrm = ET.SubElement(spPr, f"{{{a_ns}}}xfrm")
                    ET.SubElement(xfrm, f"{{{a_ns}}}off", x="0", y="0")
                    ET.SubElement(xfrm, f"{{{a_ns}}}ext", cx=EMU_W, cy=EMU_H)
                    prstGeom = ET.SubElement(spPr, f"{{{a_ns}}}prstGeom", prst="rect")
                    ET.SubElement(prstGeom, f"{{{a_ns}}}avLst")
                    first_p.insert(0, r_img)
                    # CHANGED: spacer with preserved spaces
                    spacer_run = ET.Element(f"{{{w_ns}}}r")
                    spacer_t = ET.SubElement(spacer_run, f"{{{w_ns}}}t")
                    spacer_t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
                    spacer_t.text = "       "  # leading & trailing spaces kept
                    first_p.insert(1, spacer_run)

                selected_header_has_image = True
            else:
                # Defer insertion until we can see full body tables
                defer_logo_first_table = True
        else:
            print("Logo file not found; header image injection skipped.")
    # --- end NEW ---

    footer_files = sorted(f for f in os.listdir(word_dir) if f.startswith("footer") and f.endswith(".xml"))

    selected_footer = None
    selected_footer_text = ""
    # NEW: collect all footer texts
    footer_texts = []
    for ff in reversed(footer_files):
        ftxt = collect_text(os.path.join(word_dir, ff))
        if ftxt:
            ftxt = ftxt.strip().replace('\n', ' ')[:22]
            footer_texts.append((ff, ftxt))  # keep all with text
            if selected_footer is None:     # preserve original selection behavior
                selected_footer = ff
                selected_footer_text = ftxt
    footer_blocks = []
    if selected_footer:
        f_blocks = merge_part(selected_footer)
        if f_blocks:
            footer_blocks.extend(f_blocks)

    if footer_blocks:
        page_pattern = PAGE_PATTERN_RE
        page_of_pattern = PAGE_OF_PATTERN_RE
        page_word_pattern = PAGE_WORD_PATTERN_RE
        digit_of_digit_pattern = DIGIT_OF_DIGIT_RE  # NEW

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
                txt_strip = t.text.strip()
                if page_pattern.match(txt_strip):
                    return True
                if page_of_pattern.search(t.text):
                    return True
                if digit_of_digit_pattern.match(txt_strip):  # NEW
                    return True
            return False

        def cleanse_footer_block(block):
            for p in list(block.iter(f"{{{w_ns}}}p")):
                # NEW: remove fldSimple PAGE/NUMPAGES fields
                for fld_simple in list(p.findall(f"{{{w_ns}}}fldSimple")):
                    instr = fld_simple.get(f"{{{w_ns}}}instr")
                    if instr and any(k in instr.upper() for k in ("PAGE", "NUMPAGES")):
                        p.remove(fld_simple)

                runs = list(p.findall(f"{{{w_ns}}}r"))
                for r in runs:
                    t_el = r.find(f"{{{w_ns}}}t")
                    if t_el is not None and t_el.text:
                        original = t_el.text
                        # Remove "Page X of Y"
                        new_txt = page_of_pattern.sub("", original)
                        # Remove plain "X of Y"
                        if digit_of_digit_pattern.match(original.strip()):
                            new_txt = ""
                        if new_txt != original:
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
                        # Remove remaining standalone "of" if it was part of pagination
                        if t_el.text.strip().lower() == "of":
                            p.remove(r)
                            continue
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

    # Deferred logo insertion: find first table in body (likely top section) and inject into first cell
    try:
        if 'defer_logo_first_table' in locals() and defer_logo_first_table and 'logo_meta' in locals():
            first_tbl = None
            for child in list(body):  # only near top
                if child.tag == f"{{{w_ns}}}tbl":
                    first_tbl = child
                    break
            if first_tbl is not None:
                first_tr = first_tbl.find(f"{{{w_ns}}}tr")
                if first_tr is None:
                    first_tr = ET.SubElement(first_tbl, f"{{{w_ns}}}tr")
                first_tc = None
                for c in list(first_tr):
                    if c.tag == f"{{{w_ns}}}tc":
                        first_tc = c
                        break
                if first_tc is None:
                    first_tc = ET.SubElement(first_tr, f"{{{w_ns}}}tc")
                    ET.SubElement(first_tc, f"{{{w_ns}}}tcPr")
                # Find / create first paragraph
                first_p = None
                for el in list(first_tc):
                    if el.tag == f"{{{w_ns}}}p":
                        first_p = el
                        break
                if first_p is None:
                    first_p = ET.SubElement(first_tc, f"{{{w_ns}}}p")
                # Build run
                rid = logo_meta['rid']
                EMU_W = logo_meta['w']; EMU_H = logo_meta['h']
                # Prevent duplicates
                has_logo = False
                for d in first_p.iter(f"{{{w_ns}}}drawing"):
                    for dp in d.iter(f"{{{wp_ns}}}docPr"):
                        if dp.get('name') == 'TK-LOGO-GREY':
                            has_logo = True
                            break
                    if has_logo:
                        break
                if not has_logo:
                    r_img = ET.Element(f"{{{w_ns}}}r")
                    drawing_el = ET.SubElement(r_img, f"{{{w_ns}}}drawing")
                    inline_el = ET.SubElement(drawing_el, f"{{{wp_ns}}}inline", attrib={"distT":"0","distB":"0","distL":"0","distR":"0"})
                    ET.SubElement(inline_el, f"{{{wp_ns}}}extent", cx=EMU_W, cy=EMU_H)
                    ET.SubElement(inline_el, f"{{{wp_ns}}}docPr", id="1", name="TK-LOGO-GREY", descr="TK-LOGO-GREY")
                    ET.SubElement(inline_el, f"{{{wp_ns}}}cNvGraphicFramePr")
                    graphic_el = ET.SubElement(inline_el, f"{{{a_ns}}}graphic")
                    graphic_data = ET.SubElement(graphic_el, f"{{{a_ns}}}graphicData", uri="http://schemas.openxmlformats.org/drawingml/2006/picture")
                    pic_pic = ET.SubElement(graphic_data, f"{{{pic_ns}}}pic")
                    nvPicPr = ET.SubElement(pic_pic, f"{{{pic_ns}}}nvPicPr")
                    ET.SubElement(nvPicPr, f"{{{pic_ns}}}cNvPr", id="0", name="TK-LOGO-GREY")
                    ET.SubElement(nvPicPr, f"{{{pic_ns}}}cNvPicPr")
                    blipFill = ET.SubElement(pic_pic, f"{{{pic_ns}}}blipFill")
                    blip = ET.SubElement(blipFill, f"{{{a_ns}}}blip")
                    blip.set(f"{{{r_ns}}}embed", rid)
                    stretch = ET.SubElement(blipFill, f"{{{a_ns}}}stretch")
                    ET.SubElement(stretch, f"{{{a_ns}}}fillRect")
                    spPr = ET.SubElement(pic_pic, f"{{{pic_ns}}}spPr")
                    xfrm = ET.SubElement(spPr, f"{{{a_ns}}}xfrm")
                    ET.SubElement(xfrm, f"{{{a_ns}}}off", x="0", y="0")
                    ET.SubElement(xfrm, f"{{{a_ns}}}ext", cx=EMU_W, cy=EMU_H)
                    prstGeom = ET.SubElement(spPr, f"{{{a_ns}}}prstGeom", prst="rect")
                    ET.SubElement(prstGeom, f"{{{a_ns}}}avLst")
                    first_p.insert(0, r_img)

                    spacer_run = ET.Element(f"{{{w_ns}}}r")
                    spacer_t = ET.SubElement(spacer_run, f"{{{w_ns}}}t")
                    spacer_t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
                    # Add more spaces to ensure separation of logo and text
                    spacer_t.text = "          "
                    first_p.insert(1, spacer_run)

            else:
                # No table found; prepend paragraph with logo at very top
                rid = logo_meta['rid']
                EMU_W = logo_meta['w']; EMU_H = logo_meta['h']
                p_top = ET.Element(f"{{{w_ns}}}p")
                r_img = ET.SubElement(p_top, f"{{{w_ns}}}r")
                drawing_el = ET.SubElement(r_img, f"{{{w_ns}}}drawing")
                inline_el = ET.SubElement(drawing_el, f"{{{wp_ns}}}inline", attrib={"distT":"0","distB":"0","distL":"0","distR":"0"})
                ET.SubElement(inline_el, f"{{{wp_ns}}}extent", cx=EMU_W, cy=EMU_H)
                ET.SubElement(inline_el, f"{{{wp_ns}}}docPr", id="1", name="TK-LOGO-GREY", descr="TK-LOGO-GREY")
                ET.SubElement(inline_el, f"{{{wp_ns}}}cNvGraphicFramePr")
                graphic_el = ET.SubElement(inline_el, f"{{{a_ns}}}graphic")
                graphic_data = ET.SubElement(graphic_el, f"{{{a_ns}}}graphicData", uri="http://schemas.openxmlformats.org/drawingml/2006/picture")
                pic_pic = ET.SubElement(graphic_data, f"{{{pic_ns}}}pic")
                nvPicPr = ET.SubElement(pic_pic, f"{{{pic_ns}}}nvPicPr")
                ET.SubElement(nvPicPr, f"{{{pic_ns}}}cNvPr", id="0", name="TK-LOGO-GREY")
                ET.SubElement(nvPicPr, f"{{{pic_ns}}}cNvPicPr")
                blipFill = ET.SubElement(pic_pic, f"{{{pic_ns}}}blipFill")
                blip = ET.SubElement(blipFill, f"{{{a_ns}}}blip")
                blip.set(f"{{{r_ns}}}embed", rid)
                stretch = ET.SubElement(blipFill, f"{{{a_ns}}}stretch")
                ET.SubElement(stretch, f"{{{a_ns}}}fillRect")
                spPr = ET.SubElement(pic_pic, f"{{{pic_ns}}}spPr")
                xfrm = ET.SubElement(spPr, f"{{{a_ns}}}xfrm")
                ET.SubElement(xfrm, f"{{{a_ns}}}off", x="0", y="0")
                ET.SubElement(xfrm, f"{{{a_ns}}}ext", cx=EMU_W, cy=EMU_H)
                prstGeom = ET.SubElement(spPr, f"{{{a_ns}}}prstGeom", prst="rect")
                ET.SubElement(prstGeom, f"{{{a_ns}}}avLst")
                spacer_run = ET.SubElement(p_top, f"{{{w_ns}}}r")
                spacer_t = ET.SubElement(spacer_run, f"{{{w_ns}}}t")
                spacer_t.text = " "
                body.insert(0, p_top)
    except Exception:
        pass
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
    # When creating default output path ensure correct suffix
    if output_docx_path is None:
        base_name = os.path.splitext(os.path.basename(docx_path))[0]
        target_ext = ".docm" if original_ext == ".docm" else ".docx"
        output_docx_path = os.path.join(os.path.dirname(docx_path), f"{base_name}{target_ext}")
    else:
        # Append appropriate extension if missing
        if original_ext == ".docm":
            if not output_docx_path.lower().endswith(".docm"):
                output_docx_path += ".docm"
        else:
            if not output_docx_path.lower().endswith(".docx"):
                output_docx_path += ".docx"
    os.makedirs(os.path.dirname(output_docx_path), exist_ok=True)
    with zipfile.ZipFile(output_docx_path, 'w') as docx_out:
        for foldername, _, filenames in os.walk(temp_dir):
            for filename in filenames:
                file_path = os.path.join(foldername, filename)
                arcname = os.path.relpath(file_path, temp_dir)
                docx_out.write(file_path, arcname)
    safe_rmtree(temp_dir)  # REPLACED direct shutil.rmtree with safe_rmtree
    repaired = repair_docx_with_word(output_docx_path)
    merged_valid = validate_docx_with_word(output_docx_path)
    used_fallback = False
    final_docx_for_conversion = output_docx_path
    if not merged_valid:
        print(f"Validation failed after merge: {docx_path} -> trying fallback")
        fallback = create_fallback_plain_header(docx_path, selected_header_text,
                                                out_ext=(".docm" if original_ext == ".docm" else ".docx"))
        if fallback:
            repair_docx_with_word(fallback)
            final_docx_for_conversion = fallback
            used_fallback = True
            merged_valid = validate_docx_with_word(fallback)
            if not merged_valid:
                print(f"Fallback also failed validation: {fallback}")
        else:
            print("Fallback creation returned None (no header text or error).")
    return final_docx_for_conversion, used_fallback, merged_valid, selected_header_has_image


def _worker_process_core(file_entry, idx, total, input_root, output_root, docs_out_root, web_out_root, *_, **__):
    # Accept extra legacy args (ignored) to stay compatible with previously pickled tasks
    (src_path, rel_path, ext) = file_entry
    issues_local = []
    try:
        rel_dir = os.path.dirname(rel_path)
        filename = os.path.basename(src_path)
        base_no_ext = os.path.splitext(filename)[0]

        if ext in (".docx", ".docm"):
            dest_doc_path = os.path.join(docs_out_root, rel_dir, base_no_ext + ext)
        else:
            dest_doc_path = os.path.join(docs_out_root, rel_dir, filename)

        fallback_doc_path = os.path.join(os.path.dirname(src_path), base_no_ext + ".docx")
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] Processing file {idx}/{total} ({(idx/total)*100:.1f}%): {rel_path}")

        skip_web_conversion = base_no_ext.upper().startswith("FM")
        web_ext = ".mht" if ext == ".doc" else ".mhtml"
        dest_web_path = os.path.join(web_out_root, os.path.splitext(rel_path)[0] + web_ext)

        already_doc = os.path.exists(dest_doc_path) or os.path.exists(fallback_doc_path)
        already_web = os.path.exists(dest_web_path)

        if skip_web_conversion:
            if already_doc:
                print("  Skipping - FM doc already processed")
                return issues_local
        else:
            if already_web:
                print("  Skipping - web archive already present")
                return issues_local

        if ext in (".docx", ".docm"):
            repaired_path = os.path.join(docs_out_root, rel_dir, base_no_ext + ext)
            final_docx_path, used_fallback, valid, _ = extract_header_to_body(src_path, repaired_path)
        else:
            final_docx_path, used_fallback, valid, _ = extract_header_to_body(src_path, None)
            repaired_dir_full = os.path.join(docs_out_root, rel_dir)
            os.makedirs(repaired_dir_full, exist_ok=True)
            repaired_path = os.path.join(repaired_dir_full, filename)
            try:
                shutil.copy2(src_path, repaired_path)
            except Exception:
                valid = False

        if final_docx_path and not skip_web_conversion:
            web_temp = save_as_web_archive(final_docx_path, ext, skip_web_conversion, fallback_path=src_path)
            if web_temp:
                web_dest_path = os.path.join(web_out_root, os.path.splitext(rel_path)[0] + web_ext)
                os.makedirs(os.path.dirname(web_dest_path), exist_ok=True)
                try:
                    if os.path.abspath(web_temp) != os.path.abspath(web_dest_path):
                        os.replace(web_temp, web_dest_path)
                except Exception:
                    issues_local.append(f"Failed to move web archive for {rel_path}")
            else:
                issues_local.append(f"Failed to create web archive for {rel_path}")
        elif skip_web_conversion:
            print("  FM prefix detected - web archive generation skipped")

        if valid and not used_fallback:
            print("  Successfully processed")
        elif used_fallback and valid:
            print("  Warning: Used fallback header (initial merge invalid)")
        else:
            print("  Warning: Validation failed (final)")
        if not valid:
            issues_local.append(f"Validation failed: {rel_path}")
    except Exception as e:
        issues_local.append(f"Error processing {rel_path}: {str(e)}")
    return issues_local

# BACK-COMPAT: old pickled name (_worker_process) still referenced in spawned workers
def _worker_process(*args, **kwargs):
    # Gracefully pass through any legacy surplus args
    return _worker_process_core(*args, **kwargs)

def process_all(input_root, output_root, use_process_pool=True):
    issues = []
    docs_out_root = os.path.join(output_root, "repaired_docs1")
    web_out_root = os.path.join(output_root, "web_archives")
    os.makedirs(docs_out_root, exist_ok=True)
    os.makedirs(web_out_root, exist_ok=True)

    issues_file_path = os.path.join(output_root, f"issues_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
    file_entries = collect_doc_files(input_root)
    total_files = len(file_entries)
    print(f"Found {total_files} files to process")

    start_time = time.time()
    if use_process_pool and total_files > 0:
        try:
            with concurrent.futures.ProcessPoolExecutor(max_workers=MAX_WORKERS) as executor:
                future_map = {}
                for idx, entry in enumerate(file_entries, start=1):
                    fut = executor.submit(_worker_process_core, entry, idx, total_files, input_root, output_root, docs_out_root, web_out_root)
                    future_map[fut] = entry
                for fut in concurrent.futures.as_completed(future_map):
                    entry = future_map[fut]
                    rel_path = entry[1]
                    try:
                        result_issues = fut.result(timeout=PER_FILE_TIMEOUT)
                        issues.extend(result_issues)
                    except concurrent.futures.TimeoutError:
                        issues.append(f"Timeout (>{PER_FILE_TIMEOUT}s): {rel_path}")
                        print(f"  Timeout - {rel_path}")
                    except Exception as e:
                        issues.append(f"Worker error {rel_path}: {e}")
        except AttributeError as e:
            # Spawn pickle fallback (old function name mismatch) -> switch to sequential
            print(f"ProcessPool failed ({e}); falling back to sequential processing.")
            use_process_pool = False

    if not use_process_pool:
        for idx, entry in enumerate(file_entries, start=1):
            issues.extend(_worker_process_core(entry, idx, total_files, input_root, output_root, docs_out_root, web_out_root))

    end_time = time.time()
    total_time = end_time - start_time
    hours, remainder = divmod(total_time, 3600)
    minutes, seconds = divmod(remainder, 60)
    print("\nProcessing completed.")
    print(f"Processed {len(file_entries)} files out of {total_files} total files.")
    print(f"Total processing time: {int(hours)}h {int(minutes)}m {seconds:.2f}s")
    print(f"Average time per file: {(total_time/len(file_entries) if file_entries else 0):.2f} seconds")

    with open(issues_file_path, "w", encoding="utf-8") as f:
        for issue in issues:
            f.write(issue + "\n")
    print(f"Issues written to: {issues_file_path}")

    if issues:
        print("\nFiles with issues:")
        for issue in issues:
            print(f"  {issue}")
    else:
        print("\nNo issues detected.")


if __name__ == "__main__":
    input_root = input("Enter INPUT root folder path: ").strip('"')
    output_root = input("Enter OUTPUT root folder path: ").strip('"')
    if not os.path.isdir(input_root):
        print("Invalid input root.")
    else:
        os.makedirs(output_root, exist_ok=True)
        # Allow disabling multiprocessing via env var COPY_HEADER_NO_MP=1
        use_mp = os.environ.get("COPY_HEADER_NO_MP", "0") != "1"
        process_all(input_root, output_root, use_process_pool=use_mp)
