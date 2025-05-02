import os
import base64
import re
from bs4 import BeautifulSoup
from urllib.parse import unquote
from PIL import Image

# Terminal color codes
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"

def get_image_mime_type(image_path):
    try:
        with Image.open(image_path) as img:
            format = img.format.lower()
            if format in ["jpeg", "png", "gif", "bmp", "tiff"]:
                return format
    except Exception as e:
        print(f"{YELLOW}MIME detection error ({image_path}): {str(e)}{RESET}")
    return "png"

def convert_image_to_base64(image_path):
    try:
        if not os.path.exists(image_path):
            return None, None
        mime_type = get_image_mime_type(image_path)
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode("utf-8"), mime_type
    except Exception as e:
        print(f"{YELLOW}Image conversion error ({image_path}): {str(e)}{RESET}")
        return None, None

def try_open_html(file_path):
    encodings = ["utf-8", "utf-8-sig", "cp1252", "latin-1"]
    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                content = f.read()
                return content, enc
        except UnicodeDecodeError:
            continue
    raise UnicodeDecodeError(f"Could not decode {file_path} with tried encodings")

def remove_trailing_dots(soup):
    for tag in reversed(soup.find_all(['p', 'div'])):
        if tag.text.strip() == ".":
            tag.decompose()
        else:
            break

def ensure_utf8_meta_tag(soup):
    if not soup.find("meta", attrs={"charset": True}):
        head = soup.head or soup.new_tag("head")
        meta = soup.new_tag("meta", charset="utf-8")
        head.insert(0, meta)
        if not soup.head:
            soup.insert(0, head)

def process_html_file(file_path):
    print(f"{GREEN}Processing: {file_path}{RESET}")
    try:
        html_content, encoding = try_open_html(file_path)
    except Exception as e:
        print(f"{RED}Error reading {file_path}: {str(e)}{RESET}")
        return

    soup = BeautifulSoup(html_content, "html.parser")
    image_errors = []
    replacements = []
    processed_images = set()

    for img in soup.find_all("img"):
        src = img.get("src", "").strip()
        if not src or src.startswith(("http://", "https://", "data:")):
            continue

        decoded_src = unquote(src)
        image_path = os.path.normpath(os.path.join(os.path.dirname(file_path), decoded_src))
        
        if image_path in processed_images:
            continue
        processed_images.add(image_path)

        base64_image, mime_type = convert_image_to_base64(image_path)
        if base64_image:
            base64_src = f"data:image/{mime_type};base64,{base64_image}"
            replacements.append((re.escape(src), base64_src))
        else:
            image_errors.append(decoded_src)

    html_content = str(soup)
    for pattern, replacement in replacements:
        html_content = re.sub(
            rf'(<img[^>]*src\s*=\s*["\']){pattern}(["\'][^>]*>)',
            rf'\1{replacement}\2',
            html_content,
            flags=re.IGNORECASE
        )

    # Word-specific cleanup
    html_content = re.sub(r"<o:p>(\.?)</o:p>", r"\1", html_content)
    html_content = re.sub(r'<!--(if.*?>|<!endif)-->', '', html_content, flags=re.DOTALL)

    # Re-parse, clean trailing dots, and ensure meta tag
    soup = BeautifulSoup(html_content, "html.parser")
    remove_trailing_dots(soup)
    ensure_utf8_meta_tag(soup)

    html_content = str(soup).rstrip(' .\t\n\r')

    try:
        with open(file_path, "w", encoding="utf-8", newline='') as f:
            f.write(html_content)
            f.write('\n')
        
        print(f"{GREEN}Successfully processed: {file_path}{RESET}")
        if replacements:
            print(f"{BLUE}Converted {len(replacements)} images to base64{RESET}")
        if image_errors:
            print(f"{RED}Missing images in file: {file_path}{RESET}")
            for img_src in image_errors:
                print(f"{YELLOW} - {img_src}{RESET}")
    except Exception as e:
        print(f"{RED}Error saving {file_path}: {str(e)}{RESET}")

def traverse_directory(base_directory):
    base_directory = base_directory.strip().strip('"')
    if not os.path.isdir(base_directory):
        print(f"{RED}Error: Directory not found - {base_directory}{RESET}")
        return

    found_html = False
    for root, _, files in os.walk(base_directory):
        for file in files:
            if file.lower().endswith((".html", ".htm")):
                found_html = True
                file_path = os.path.join(root, file)
                process_html_file(file_path)

    if not found_html:
        print(f"{YELLOW}No HTML/HTM files found in {base_directory}{RESET}")

if __name__ == "__main__":
    print(f"{BLUE}HTML Image Embedder v2.1{RESET}")
    print(f"{BLUE}Converts local images to base64 for better portability{RESET}")
    base_directory = input("Enter the base directory path: ")
    traverse_directory(base_directory)