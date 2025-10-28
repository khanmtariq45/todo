Converting files:   0%|                                                                                                           | 0/60 [00:00<?, ?file/s][FAIL] Cannot open (returned None): C:\Users\MuhammadTariqPKDev\Documents\testing teekay file path root to child folders path\testing teekay file path root to child folders path 1\testing teekay file path root to child folders path 2\testing teekay file path root to child folders\FN0006-LTI Fleet Notice - First Incident Notification - Lost Time Injury in 2008_V1.docx
Converting files:   2%|█▋                                                                                                 | 1/60 [00:09<09:04,  9.22s/file][FAIL] Cannot open (returned None): C:\Users\MuhammadTariqPKDev\Documents\testing teekay file path root to child folders path\testing teekay file path root to child folders path 1\testing teekay file path root to child folders path 2\testing teekay file path root to child folders\FN0023-LTI Fleet Notice - Second Incident Notification - Lost Time Injury in 2008_V1.docx
Converting files:   3%|███▎    

import os
import win32com.client
import pythoncom
from tqdm import tqdm
 
VERBOSE = True
 
def validate_converted(mhtml_path):
    """Return (ok, reason)."""
    if not os.path.exists(mhtml_path):
        return False, "output file missing"
    size = os.path.getsize(mhtml_path)
    if size == 0:
        return False, "output file size 0"
    return True, f"ok size={size}"
 
def get_output_format(original_extension):
    """Return output format based on file extension"""
    if original_extension.lower() == '.doc':
        return '.mhtm'
    else:
        return '.mhtml'
 
def should_skip_file(filename):
    """Check if file should be skipped based on prefix"""
    return filename.upper().startswith('FM')
 
def convert_doc_to_mhtml(doc_path, output_path, output_format):
    """Convert a single DOC/DOCX file to MHTML/MHT format using Word's SaveAs function"""
    pythoncom.CoInitialize()
    try:
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        try:
            doc = word.Documents.Open(doc_path)
        except Exception as open_err:
            print(f"[FAIL] Cannot open: {doc_path} :: {open_err}")
            return False
       
        # Save as MHTML format (Word's format code for MHTML is 9)
        doc.SaveAs(output_path, FileFormat=9)
        doc.Close()
       
        ok, reason = validate_converted(output_path)
        if not ok:
            print(f"[VALIDATION] {doc_path} -> {output_path}: {reason}")
            return False
       
        if VERBOSE:
            print(f"[CONVERTED] {doc_path} -> {output_path} ({reason})")
        return True
    except Exception as e:
        print(f"[ERROR] Converting {doc_path}: {e}")
        return False
    finally:
        word.Quit()
        pythoncom.CoUninitialize()
 
def find_and_convert_docs(input_folder, output_folder):
    """Find all DOC/DOCX files in input folder and convert them to MHTML/MHT in output folder"""
    # Supported extensions
    extensions = ('.doc', '.docx', '.docm', '.dot', '.dotx', '.dotm')
   
    # Count total files for progress bar (excluding FM prefixed files)
    total_files = 0
    for root, _, files in os.walk(input_folder):
        for file in files:
            if file.lower().endswith(extensions) and not should_skip_file(file):
                total_files += 1
   
    if total_files == 0:
        print("No convertible DOC files found in the specified folder and its subfolders.")
        return
   
    # Process files with progress bar
    with tqdm(total=total_files, desc="Converting files", unit="file") as pbar:
        for root, _, files in os.walk(input_folder):
            for file in files:
                if file.lower().endswith(extensions) and not should_skip_file(file):
                    doc_path = os.path.join(root, file)
                   
                    # Calculate relative path and output path
                    relative_path = os.path.relpath(doc_path, input_folder)
                    output_file_path = os.path.join(output_folder, relative_path)
                   
                    # Get file extension and determine output format
                    file_ext = os.path.splitext(file)[1]
                    output_ext = get_output_format(file_ext)
                    output_path = os.path.splitext(output_file_path)[0] + output_ext
                   
                    # Create output directory if it doesn't exist
                    output_dir = os.path.dirname(output_path)
                    os.makedirs(output_dir, exist_ok=True)
                   
                    # Skip if output already exists
                    if os.path.exists(output_path):
                        pbar.update(1)
                        if VERBOSE:
                            print(f"[SKIP] Output already exists: {output_path}")
                        continue
                   
                    # Convert the file
                    success = convert_doc_to_mhtml(doc_path, output_path, output_ext)
                    pbar.update(1)
 
def main():
    print("DOC to MHTML/MHT Converter with Folder Hierarchy")
    print("-----------------------------------------------")
    print("NOTE: Output folder will contain ONLY MHTML/MHTM files")
    print("Files with 'FM' prefix will be completely excluded")
    print("-" * 50)
   
    input_folder = input("Enter the input folder path: ").strip('"')
    output_folder = input("Enter the output folder path: ").strip('"')
   
    if not os.path.isdir(input_folder):
        print("Error: The specified input path is not a valid directory.")
        return
   
    # Create output folder if it doesn't exist
    os.makedirs(output_folder, exist_ok=True)
   
    print(f"\nInput folder: {input_folder}")
    print(f"Output folder: {output_folder}")
    print("Skipping files with 'FM' prefix")
    print("Converting .doc files to .mhtm and other DOC formats to .mhtml")
    print("Output folder will contain ONLY MHTML/MHTM files")
    print("-" * 50)
   
    # Convert only the DOC files (excluding FM-prefixed)
    find_and_convert_docs(input_folder, output_folder)
   
    print("\nConversion completed!")
    print(f"Only MHTML/MHTM files created in: {output_folder}")
    print("All other files (including FM-prefixed) were excluded from output")
 
if __name__ == "__main__":
    main()
