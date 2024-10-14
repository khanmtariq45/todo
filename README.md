import os
import re
import PyPDF2

def find_a_tags_with_href(directory, output_file, error_file):
    a_tag_pattern = re.compile(r'<a\s+[^>]*href=[\'"][^\'"]+[\'"]', re.IGNORECASE)

    with open(output_file, 'w', encoding='utf-8') as f_out, open(error_file, 'w', encoding='utf-8') as f_err:
        for foldername, subfolders, filenames in os.walk(directory):
            for filename in filenames:
                file_path = os.path.join(foldername, filename)

                # Process HTML files
                if filename.endswith(".html"):
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f_in:
                            found_a_tag = False
                            for line_num, line in enumerate(f_in, 1):
                                if a_tag_pattern.search(line):
                                    f_out.write(f'{file_path}, Line: {line_num}\n')
                                    found_a_tag = True
                            # If no <a> tag is found, ignore this file
                    except Exception as e:
                        # Log files that couldn't be decoded
                        f_err.write(f"Error decoding file {file_path}: {e}\n")

                # Process PDF files
                elif filename.endswith(".pdf"):
                    try:
                        with open(file_path, 'rb') as f_pdf:
                            reader = PyPDF2.PdfReader(f_pdf)
                            for page_num, page in enumerate(reader.pages, 1):
                                text = page.extract_text()
                                if a_tag_pattern.search(text):  # Simple check for <a> tags in text
                                    f_out.write(f'{file_path}, Page: {page_num}\n')
                    except Exception as e:
                        # Log PDFs that couldn't be processed
                        f_err.write(f"Error processing PDF file {file_path}: {e}\n")

if __name__ == "__main__":
    folder_path = input("Enter the folder path: ")
    output_file = 'a_tags_with_href.txt'
    error_file = 'decoding_errors.txt'
    find_a_tags_with_href(folder_path, output_file, error_file)
    print(f"Results saved to {output_file}")
    print(f"Files with errors are listed in {error_file}")