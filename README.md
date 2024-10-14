import os
import re

def find_a_tags_with_href(directory, output_file):
    a_tag_pattern = re.compile(r'<a\s+[^>]*href=[\'"][^\'"]+[\'"]', re.IGNORECASE)

    with open(output_file, 'w') as f_out:
        for foldername, subfolders, filenames in os.walk(directory):
            for filename in filenames:
                if filename.endswith(".html"):
                    file_path = os.path.join(foldername, filename)
                    with open(file_path, 'r', encoding='utf-8') as f_in:
                        for line_num, line in enumerate(f_in, 1):
                            if a_tag_pattern.search(line):
                                f_out.write(f'{file_path}, Line: {line_num}\n')

if __name__ == "__main__":
    folder_path = input("Enter the folder path: ")
    output_file = 'a_tags_with_href.txt'
    find_a_tags_with_href(folder_path, output_file)
    print(f"Results saved to {output_file}")