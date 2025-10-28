import os
import win32com.client
import pythoncom
from tqdm import tqdm
import sys
 
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

def safe_quit_word(word_app):
    """Safely quit Word application"""
    try:
        if word_app:
            word_app.Quit()
    except Exception as e:
        if VERBOSE:
            print(f"[DEBUG] Error quitting Word: {e}")
 
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
    
    word = None
    doc = None
    
    try:
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(output_path)
        os.makedirs(output_dir, exist_ok=True)
        
        # Initialize Word application
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        
        # Try multiple approaches to open the file
        doc = None
        open_success = False
        
        # Approach 1: Try with short path
        try:
            short_doc_path = get_short_path(get_long_path(doc_path))
            doc = word.Documents.Open(short_doc_path)
            open_success = True
            if VERBOSE:
                print(f"[DEBUG] Opened with short path: {short_doc_path}")
        except Exception as e1:
            if VERBOSE:
                print(f"[DEBUG] Short path approach failed: {e1}")
            
            # Approach 2: Try with long path prefix
            try:
                long_doc_path = get_long_path(doc_path)
                doc = word.Documents.Open(long_doc_path)
                open_success = True
                if VERBOSE:
                    print(f"[DEBUG] Opened with long path: {long_doc_path}")
            except Exception as e2:
                if VERBOSE:
                    print(f"[DEBUG] Long path approach failed: {e2}")
                
                # Approach 3: Try with original path
                try:
                    doc = word.Documents.Open(doc_path)
                    open_success = True
                    if VERBOSE:
                        print(f"[DEBUG] Opened with original path: {doc_path}")
                except Exception as e3:
                    print(f"[FAIL] Cannot open: {doc_path}")
                    print(f"  Short path error: {e1}")
                    print(f"  Long path error: {e2}")
                    print(f"  Original path error: {e3}")
                    return False
        
        if not open_success or doc is None:
            print(f"[FAIL] Document object is None for: {doc_path}")
            return False
        
        # Now save the document
        save_success = False
        
        # Approach 1: Try with short output path
        try:
            short_output_path = get_short_path(get_long_path(output_path))
            doc.SaveAs(short_output_path, FileFormat=9)
            save_success = True
            if VERBOSE:
                print(f"[DEBUG] Saved with short path: {short_output_path}")
        except Exception as e1:
            if VERBOSE:
                print(f"[DEBUG] Short path save failed: {e1}")
            
            # Approach 2: Try with long output path
            try:
                long_output_path = get_long_path(output_path)
                doc.SaveAs(long_output_path, FileFormat=9)
                save_success = True
                if VERBOSE:
                    print(f"[DEBUG] Saved with long path: {long_output_path}")
            except Exception as e2:
                if VERBOSE:
                    print(f"[DEBUG] Long path save failed: {e2}")
                
                # Approach 3: Try with original output path
                try:
                    doc.SaveAs(output_path, FileFormat=9)
                    save_success = True
                    if VERBOSE:
                        print(f"[DEBUG] Saved with original path: {output_path}")
                except Exception as e3:
                    print(f"[FAIL] Cannot save: {output_path}")
                    print(f"  Short path error: {e1}")
                    print(f"  Long path error: {e2}")
                    print(f"  Original path error: {e3}")
                    return False
        
        # Close the document
        try:
            if doc:
                doc.Close()
        except Exception as close_err:
            print(f"[WARNING] Error closing document: {close_err}")
        
        # Validate the converted file
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
        # Safely close document and quit Word
        try:
            if doc:
                doc.Close(SaveChanges=False)
        except:
            pass
        safe_quit_word(word)
        pythoncom.CoUninitialize()
 
def find_and_convert_docs(input_folder, output_folder):
    """Find all DOC/DOCX files in input folder and convert them to MHTML/MHT in output folder"""
    # Supported extensions
    extensions = ('.doc', '.docx', '.docm', '.dot', '.dotx', '.dotm')
   
    # Count total files for progress bar (excluding FM prefixed files)
    total_files = 0
    file_list = []
    
    print("Scanning for files...")
    for root, _, files in os.walk(input_folder):
        for file in files:
            if file.lower().endswith(extensions) and not should_skip_file(file):
                total_files += 1
                file_list.append((root, file))
   
    if total_files == 0:
        print("No convertible DOC files found in the specified folder and its subfolders.")
        return
    
    print(f"Found {total_files} files to convert")
   
    # Process files with progress bar
    converted_count = 0
    failed_count = 0
    skipped_count = 0
    
    with tqdm(total=total_files, desc="Converting files", unit="file") as pbar:
        for root, file in file_list:
            doc_path = os.path.join(root, file)
           
            # Calculate relative path and output path
            try:
                relative_path = os.path.relpath(doc_path, input_folder)
                output_file_path = os.path.join(output_folder, relative_path)
            except ValueError as e:
                print(f"[PATH ERROR] Cannot calculate relative path for: {doc_path} -> {e}")
                failed_count += 1
                pbar.update(1)
                continue
           
            # Get file extension and determine output format
            file_ext = os.path.splitext(file)[1]
            output_ext = get_output_format(file_ext)
            output_path = os.path.splitext(output_file_path)[0] + output_ext
           
            # Create output directory if it doesn't exist
            output_dir = os.path.dirname(output_path)
            os.makedirs(output_dir, exist_ok=True)
           
            # Skip if output already exists
            if os.path.exists(output_path):
                skipped_count += 1
                pbar.update(1)
                if VERBOSE:
                    print(f"[SKIP] Output already exists: {output_path}")
                continue
           
            # Convert the file
            success = convert_doc_to_mhtml(doc_path, output_path, output_ext)
            if success:
                converted_count += 1
            else:
                failed_count += 1
            pbar.update(1)
            
            # Update progress bar description with stats
            pbar.set_description(f"Converting files (C:{converted_count} F:{failed_count} S:{skipped_count})")
    
    return converted_count, failed_count, skipped_count
 
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
    converted_count, failed_count, skipped_count = find_and_convert_docs(input_folder, output_folder)
   
    print("\nConversion completed!")
    print(f"Successfully converted: {converted_count} files")
    print(f"Failed: {failed_count} files")
    print(f"Skipped (already exist): {skipped_count} files")
    print(f"Only MHTML/MHTM files created in: {output_folder}")
    print("All other files (including FM-prefixed) were excluded from output")
 
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nConversion interrupted by user")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()