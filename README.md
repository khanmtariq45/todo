import os
import base64
import re
from bs4 import BeautifulSoup
from urllib.parse import unquote
import imghdr

# Terminal color codes
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"

def get_image_mime_type(image_path):
    """Get proper MIME type by checking image content"""
    try:
        with open(image_path, "rb") as f:
            header = f.read(32)  # Read first 32 bytes to determine type
            img_type = imghdr.what(None, header)
            if img_type == "jpeg":
                return "jpeg"
            elif img_type == "png":
                return "png"
            elif img_type == "gif":
                return "gif"
            elif img_type == "bmp":
                return "bmp"
            elif img_type == "tiff":
                return "tiff"
    except:
        pass
    return "png"  # default fallback

def convert_image_to_base64(image_path):
    """Convert image to base64 with proper MIME type detection"""
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
    """Try multiple encodings to read HTML file"""
    encodings = ["utf-8", "utf-8-sig", "cp1252", "latin-1"]
    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                return f.read(), enc
        except UnicodeDecodeError:
            continue
    raise UnicodeDecodeError(f"Could not decode {file_path} with tried encodings")

def process_html_file(file_path):
    """Process a single HTML file to convert images to base64"""
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
        
        # Skip already processed images to avoid duplicates
        if image_path in processed_images:
            continue
        processed_images.add(image_path)

        base64_image, mime_type = convert_image_to_base64(image_path)
        if base64_image:
            base64_src = f"data:image/{mime_type};base64,{base64_image}"
            replacements.append((re.escape(src), base64_src))
        else:
            image_errors.append(decoded_src)

    # Make replacements in the original HTML content (not the soup)
    for pattern, replacement in replacements:
        html_content = re.sub(
            rf'(<img[^>]*src\s*=\s*["\']){pattern}(["\'][^>]*>)',
            rf'\1{replacement}\2',
            html_content,
            flags=re.IGNORECASE
        )

    # Additional Word compatibility fixes
    html_content = html_content.replace("<o:p></o:p>", "")
    html_content = re.sub(r'<!--(\[if.*?\]>|<!\[endif\])-->', '', html_content, flags=re.DOTALL)

    try:
        # Save with original encoding and line endings
        with open(file_path, "w", encoding=encoding, newline='') as f:
            f.write(html_content)
        
        print(f"{GREEN}Successfully processed: {file_path}{RESET}")
        if replacements:
            print(f"{BLUE}Converted {len(replacements)} images to base64{RESET}")
        for img_src in image_errors:
            print(f"{YELLOW}Missing image: {img_src}{RESET}")
    except Exception as e:
        print(f"{RED}Error saving {file_path}: {str(e)}{RESET}")

def traverse_directory(base_directory):
    """Recursively process all HTML files in directory"""
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
    print(f"{BLUE}HTML Image Embedder v2.0{RESET}")
    print(f"{BLUE}Converts local images to base64 for better portability{RESET}")
    base_directory = input("Enter the base directory path: ")
    traverse_directory(base_directory)