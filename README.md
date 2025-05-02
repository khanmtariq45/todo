import os
import base64
from bs4 import BeautifulSoup

def convert_image_to_base64(image_path):
    try:
        if not os.path.exists(image_path):
            print(f"[Image Missing] {image_path}")
            return None
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode('utf-8')
    except Exception as e:
        print(f"[Error Reading Image] {image_path}: {e}")
        return None

def process_html_file(file_path):
    print(f"\n--- Processing: {file_path} ---")
    try:
        with open(file_path, "r", encoding='utf-8') as file:
            soup = BeautifulSoup(file, "html.parser")
    except Exception as e:
        print(f"[Error Opening File] {file_path}: {e}")
        return

    images = soup.find_all("img")
    if not images:
        print("No <img> tags found.")

    for img in images:
        src = img.get("src")
        if src and not src.startswith(('http://', 'https://', 'data:')):
            image_path = os.path.join(os.path.dirname(file_path), src)
            print(f"  Found image: {src}")
            base64_image = convert_image_to_base64(image_path)
            if base64_image:
                ext = os.path.splitext(src)[1][1:] or 'png'
                img['src'] = f"data:image/{ext};base64,{base64_image}"
                print(f"  -> Replaced with Base64.")
            else:
                print(f"  -> Skipped (image missing or unreadable).")

    try:
        with open(file_path, "w", encoding='utf-8') as file:
            file.write(str(soup))
        print(f"--- Done: {file_path} ---")
    except Exception as e:
        print(f"[Error Saving File] {file_path}: {e}")

def traverse_directory(base_directory):
    base_directory = base_directory.strip().strip('"')  # Clean up quotes/spaces
    found_html = False

    for root, dirs, files in os.walk(base_directory):
        for file in files:
            if file.lower().endswith(('.html', '.htm')):
                found_html = True
                file_path = os.path.join(root, file)
                process_html_file(file_path)

    if not found_html:
        print("\n[No HTML/HTM files found in the specified directory]")

if __name__ == "__main__":
    base_directory = input("Enter the base directory path: ")
    traverse_directory(base_directory)