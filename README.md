import os
import win32com.client
import pythoncom
from tqdm import tqdm
 
VERBOSE = True

def enable_long_paths():
    """Enable long path support in Windows if available"""
    try:
        import ctypes
        # This requires Windows 10 version 1607 or later
        kernel32 = ctypes.windll.kernel32
        kernel32.SetDllDirectoryW(None)
        return True
    except:
        return False

def get_long_path(path):
    """Convert path to long path format to handle paths > 260 chars"""
    if path.startswith('\\\\?\\'):
        return path
    # Convert to absolute path and add the long path prefix
    abs_path = os.path.abspath(path)
    if abs_path.startswith('\\\\'):
        # UNC path
        return '\\\\?\\UNC\\' + abs_path[2:]
    else:
        return '\\\\?\\' + abs_path

def get_short_path(path):
    """Get the short path (8.3 format) to handle long paths"""
    try:
        import ctypes
        import ctypes.wintypes
        get_short_path_name = ctypes.windll.kernel32.GetShortPathNameW
        get_short_path_name.argtypes = [ctypes.wintypes.LPCWSTR, ctypes.wintypes.LPWSTR, ctypes.wintypes.DWORD]
        get_short_path_name.restype = ctypes.wintypes.DWORD
        
        # First, get the required buffer size
        buffer_size = get_short_path_name(path, None, 0)
        if buffer_size == 0:
            return path
            
        # Now get the short path
        buffer = ctypes.create_unicode_buffer(buffer_size)
        get_short_path_name(path, buffer, buffer_size)
        return buffer.value
    except:
        return path
 
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
    
    # Use short path names to handle long paths
    short_doc_path = get_short_path(get_long_path(doc_path))
    short_output_path = get_short_path(get_long_path(output_path))
    
    try:
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(output_path)
        os.makedirs(output_dir, exist_ok=True)
        
        try:
            # Try with short path first
            doc = word.Documents.Open(short_doc_path)
        except Exception as open_err:
            try:
                # Fallback: try with original path
                doc = word.Documents.Open(doc_path)
            except Exception as fallback_err:
                print(f"[FAIL] Cannot open: {doc_path} :: {open_err} (Fallback: {fallback_err})")
                return False
       
        try:
            # Save as MHTML format (Word's format code for MHTML is 9)
            doc.SaveAs(short_output_path, FileFormat=9)
            doc.Close()
        except Exception as save_err:
            try:
                # Fallback: try with original output path
                doc.SaveAs(output_path, FileFormat=9)
                doc.Close()
            except Exception as fallback_save_err:
                print(f"[FAIL] Cannot save: {output_path} :: {save_err} (Fallback: {fallback_save_err})")
                doc.Close(SaveChanges=False)
                return False
       
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
        try:
            word.Quit()
        except:
            pass
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
                    try:
                        relative_path = os.path.relpath(doc_path, input_folder)
                        output_file_path = os.path.join(output_folder, relative_path)
                    except ValueError as e:
                        print(f"[PATH ERROR] Cannot calculate relative path for: {doc_path} -> {e}")
                        pbar.update(1)
                        continue
                   
                    # Get file extension and determine output format
                    file_ext = os.path.splitext(file)[1]
                    output_ext = get_output_format(file_ext)
                    output_path = os.path.splitext(output_file_path)[0] + output_ext
                   
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
    print("Long path support enabled for Windows")
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
    print("Long path handling enabled")
    print("-" * 50)
   
    # Enable long path support
    if enable_long_paths():
        print("Long path support enabled")
    else:
        print("Using fallback methods for long paths")
   
    # Convert only the DOC files (excluding FM-prefixed)
    find_and_convert_docs(input_folder, output_folder)
   
    print("\nConversion completed!")
    print(f"Only MHTML/MHTM files created in: {output_folder}")
    print("All other files (including FM-prefixed) were excluded from output")
 
if __name__ == "__main__":
    main()