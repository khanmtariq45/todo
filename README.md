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

def convert_doc_to_mhtml(doc_path, mhtml_path):
    """Convert a single DOC/DOCX file to MHTML format using Word's SaveAs function"""
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
        doc.SaveAs(mhtml_path, FileFormat=9)
        doc.Close()
        ok, reason = validate_converted(mhtml_path)
        if not ok:
            print(f"[VALIDATION] {doc_path} -> {mhtml_path}: {reason}")
            return False
        if VERBOSE:
            print(f"[CONVERTED] {doc_path} -> {mhtml_path} ({reason})")
        return True
    except Exception as e:
        print(f"[ERROR] Converting {doc_path}: {e}")
        return False
    finally:
        word.Quit()
        pythoncom.CoUninitialize()

def find_and_convert_docs(root_folder):
    """Find all DOC/DOCX files in root folder and convert them to MHTML"""
    # Supported extensions
    extensions = ('.doc', '.docx')
    
    # Count total files for progress bar
    total_files = 0
    for root, _, files in os.walk(root_folder):
        for file in files:
            if file.lower().endswith(extensions):
                total_files += 1
    
    if total_files == 0:
        print("No DOC/DOCX files found in the specified folder and its subfolders.")
        return
    
    # Process files with progress bar
    with tqdm(total=total_files, desc="Converting files", unit="file") as pbar:
        for root, _, files in os.walk(root_folder):
            for file in files:
                if file.lower().endswith(extensions):
                    doc_path = os.path.join(root, file)
                    mhtml_path = os.path.splitext(doc_path)[0] + '.mht'
                    
                    # Skip if MHTML already exists
                    if os.path.exists(mhtml_path):
                        pbar.update(1)
                        continue
                    
                    # Convert the file
                    convert_doc_to_mhtml(doc_path, mhtml_path)
                    pbar.update(1)

def main():
    print("DOC/DOCX to MHTML Converter")
    print("--------------------------")
    root_folder = input("Enter the root folder path: ").strip('"')
    
    if not os.path.isdir(root_folder):
        print("Error: The specified path is not a valid directory.")
        return
    
    find_and_convert_docs(root_folder)
    print("\nConversion completed!")

if __name__ == "__main__":
    main()
