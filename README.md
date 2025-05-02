import os
import base64
from bs4 import BeautifulSoup
from urllib.parse import unquote

# Terminal color codes
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"

def convert_image_to_base64(image_path):
    try:
        if not os.path.exists(image_path):
            return None
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode('utf-8')
    except:
        return None

def try_open_html(file_path):
    encodings = ['utf-8', 'cp1252', 'latin-1']
    for enc in encodings:
        try:
            with open(file_path, 'r', encoding=enc) as f:
                return f.read()
        except:
            continue
    raise UnicodeDecodeError("Encoding failed")

def process_html_file(file_path):
    print(f"{GREEN}Processing: {file_path}{RESET}")
    try:
        content = try_open_html(file_path)
        soup = BeautifulSoup(content, "html.parser")
    except Exception:
        print(f"{RED}Error reading: {file_path} (please check manually){RESET}")
        return

    had_image_error = False

    for img in soup.find_all("img"):
        src = img.get("src")
        if src and not src.startswith(('http://', 'https://', 'data:')):
            decoded_src = unquote(src)
            image_path = os.path.normpath(os.path.join(os.path.dirname(file_path), decoded_src))
            base64_image = convert_image_to_base64(image_path)
            if base64_image:
                ext = os.path.splitext(decoded_src)[1][1:] or 'png'
                img['src'] = f"data:image/{ext};base64,{base64_image}"
            else:
                had_image_error = True

    try:
        with open(file_path, "w", encoding='utf-8') as file:
            file.write(str(soup))
        print(f"{GREEN}Done: {file_path}{RESET}")
        if had_image_error:
            print(f"{YELLOW}Some images could not be read in: {file_path} (please check manually){RESET}")
    except:
        print(f"{RED}Error saving: {file_path} (please check manually){RESET}")

def traverse_directory(base_directory):
    base_directory = base_directory.strip().strip('"')
    found_html = False

    for root, _, files in os.walk(base_directory):
        for file in files:
            if file.lower().endswith(('.html', '.htm')):
                found_html = True
                file_path = os.path.join(root, file)
                process_html_file(file_path)

    if not found_html:
        print(f"{YELLOW}No HTML/HTM files found.{RESET}")

if __name__ == "__main__":
    base_directory = input("Enter the base directory path: ")
    traverse_directory(base_directory)