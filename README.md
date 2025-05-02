import os
import base64
from bs4 import BeautifulSoup

def convert_image_to_base64(image_path):
    try:
        if not os.path.exists(image_path):
            print(f"Image not found: {image_path}")
            return None
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Error encoding {image_path}: {e}")
        return None

def process_html_file(file_path):
    with open(file_path, "r", encoding='utf-8') as file:
        soup = BeautifulSoup(file, "html.parser")

    images = soup.find_all("img")
    for img in images:
        src = img.get("src")
        if src and not src.startswith(('http://', 'https://')):
            image_path = os.path.join(os.path.dirname(file_path), src)
            base64_image = convert_image_to_base64(image_path)
            if base64_image:
                img['src'] = f"data:image/{os.path.splitext(src)[1][1:]};base64,{base64_image}"
            else:
                print(f"Skipping image {src} in {file_path} due to missing or unreadable image file.")

    with open(file_path, "w", encoding='utf-8') as file:
        file.write(str(soup))

def traverse_directory(base_directory):
    for root, dirs, files in os.walk(base_directory):
        for file in files:
            if file.lower().endswith(('.html', '.htm')):
                file_path = os.path.join(root, file)
                process_html_file(file_path)

if __name__ == "__main__":
    base_directory = input("Enter the base directory path: ")
    traverse_directory(base_directory)