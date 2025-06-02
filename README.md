import os
import win32com.client
import pythoncom
from tqdm import tqdm

def convert_doc_to_mhtml(doc_path, mhtml_path):
    """Convert a single DOC/DOCX file to MHTML format using Word's SaveAs function"""
    pythoncom.CoInitialize()
    try:
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False  # Run Word in the background
        doc = word.Documents.Open(doc_path)
        
        # Save as MHTML format (Word's format code for MHTML is 9)
        doc.SaveAs(mhtml_path, FileFormat=9)
        doc.Close()
        return True
    except Exception as e:
        print(f"Error converting {doc_path}: {str(e)}")
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
                    success = convert_doc_to_mhtml(doc_path, mhtml_path)
                    if success:
                        pbar.set_postfix(file=os.path.basename(doc_path))
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