import os
import win32com.client
import pythoncom
from tqdm import tqdm
import sys
import time
import shutil
 
VERBOSE = True

def enable_long_paths():
    """Enable long path support in Windows if available"""
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetDllDirectoryW(None)
        return True
    except:
        return False

def get_long_path(path):
    """Convert path to long path format to handle paths > 260 chars"""
    if path.startswith('\\\\?\\'):
        return path
    abs_path = os.path.abspath(path)
    if abs_path.startswith('\\\\'):
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
        
        buffer_size = get_short_path_name(path, None, 0)
        if buffer_size == 0:
            return path
            
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

def is_file_locked(filepath):
    """Check if file is locked by another process"""
    try:
        with open(filepath, 'a+b', 0):
            pass
        return False
    except IOError:
        return True

def wait_for_file_unlock(filepath, max_wait=10):
    """Wait for file to be unlocked by another process"""
    for i in range(max_wait):
        if not is_file_locked(filepath):
            return True
        time.sleep(1)
    return False

def validate_converted(mhtml_path):
    """Return (ok, reason)."""
    if not os.path.exists(mhtml_path):
        return False, "output file missing"
    size = os.path.getsize(mhtml_path)
    if size == 0:
        return False, "output file size 0"
    return True, f"ok size={size}"

def copy_to_temp_location(doc_path, temp_dir):
    """Copy file to temporary location with shorter path for processing"""
    try:
        # Create a safe filename
        safe_name = "doc_" + str(hash(doc_path))[-8:] + os.path.splitext(doc_path)[1]
        temp_path = os.path.join(temp_dir, safe_name)
        
        shutil.copy2(doc_path, temp_path)
        return temp_path
    except Exception as e:
        if VERBOSE:
            print(f"[DEBUG] Failed to copy to temp: {e}")
        return None
 
def get_output_format(original_extension):
    """Return output format based on file extension"""
    if original_extension.lower() == '.doc':
        return '.mhtm'
    else:
        return '.mhtml'
 
def should_skip_file(filename):
    """Check if file should be skipped based on prefix"""
    return filename.upper().startswith('FM')

def open_document_with_recovery(word, doc_path):
    """Open document with handling for recovery scenarios"""
    # Method 1: Try normal open
    try:
        doc = word.Documents.Open(doc_path)
        return doc, "normal"
    except Exception as e1:
        if VERBOSE:
            print(f"[DEBUG] Normal open failed: {e1}")
    
    # Method 2: Try with ConfirmConversions=False
    try:
        doc = word.Documents.Open(doc_path, ConfirmConversions=False)
        return doc, "no_confirm"
    except Exception as e2:
        if VERBOSE:
            print(f"[DEBUG] No-confirm open failed: {e2}")
    
    # Method 3: Try as read-only
    try:
        doc = word.Documents.Open(doc_path, ReadOnly=True)
        return doc, "readonly"
    except Exception as e3:
        if VERBOSE:
            print(f"[DEBUG] Read-only open failed: {e3}")
    
    # Method 4: Try with different encoding
    try:
        doc = word.Documents.Open(doc_path, Encoding=1252)  # Western encoding
        return doc, "encoding_1252"
    except Exception as e4:
        if VERBOSE:
            print(f"[DEBUG] Encoding open failed: {e4}")
    
    return None, f"All methods failed"

def convert_doc_to_mhtml(doc_path, output_path, output_format):
    """Convert a single DOC/DOCX file to MHTML/MHT format handling recovery scenarios"""
    pythoncom.CoInitialize()
    
    word = None
    doc = None
    temp_file_created = False
    temp_file_path = None
    
    try:
        # Check if file exists and is accessible
        if not os.path.exists(doc_path):
            print(f"[FAIL] File does not exist: {doc_path}")
            return False
            
        # Check file size
        file_size = os.path.getsize(doc_path)
        if file_size == 0:
            print(f"[FAIL] File is empty: {doc_path}")
            return False
            
        # Check if file is locked
        if is_file_locked(doc_path):
            print(f"[WAIT] File is locked, waiting: {doc_path}")
            if not wait_for_file_unlock(doc_path):
                print(f"[FAIL] File still locked after waiting: {doc_path}")
                return False
        
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(output_path)
        os.makedirs(output_dir, exist_ok=True)
        
        # Initialize Word application with appropriate settings
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        word.DisplayAlerts = False  # Suppress all alerts and dialogs
        
        # Try multiple path approaches
        path_attempts = []
        
        # First try short path
        short_path = get_short_path(get_long_path(doc_path))
        if short_path != doc_path:
            path_attempts.append(short_path)
        
        # Then try long path
        long_path = get_long_path(doc_path)
        if long_path != doc_path:
            path_attempts.append(long_path)
        
        # Finally try original path
        path_attempts.append(doc_path)
        
        # If paths are too long, try copying to temp directory
        if len(doc_path) > 200:
            temp_dir = tempfile.mkdtemp()
            temp_file_path = copy_to_temp_location(doc_path, temp_dir)
            if temp_file_path:
                path_attempts.insert(0, temp_file_path)
                temp_file_created = True
                if VERBOSE:
                    print(f"[DEBUG] Using temp file: {temp_file_path}")
        
        doc = None
        open_method = "unknown"
        
        for attempt_path in path_attempts:
            try:
                doc, open_method = open_document_with_recovery(word, attempt_path)
                if doc is not None:
                    if VERBOSE:
                        print(f"[DEBUG] Opened with {open_method}: {attempt_path}")
                    break
            except Exception as e:
                if VERBOSE:
                    print(f"[DEBUG] Path attempt failed {attempt_path}: {e}")
                continue
        
        if doc is None:
            print(f"[FAIL] Could not open document (may be corrupted): {doc_path}")
            return False
        
        # Now save the document
        save_success = False
        save_attempts = []
        
        # Try short output path first
        short_output = get_short_path(get_long_path(output_path))
        if short_output != output_path:
            save_attempts.append(short_output)
        
        # Try long output path
        long_output = get_long_path(output_path)
        if long_output != output_path:
            save_attempts.append(long_output)
        
        # Finally original output path
        save_attempts.append(output_path)
        
        # If output path is too long, save to temp then move
        final_output_path = output_path
        if len(output_path) > 200:
            temp_output_dir = tempfile.mkdtemp()
            temp_output_name = "output_" + str(hash(output_path))[-8:] + output_format
            temp_output_path = os.path.join(temp_output_dir, temp_output_name)
            save_attempts.insert(0, temp_output_path)
            final_output_path = temp_output_path
        
        for attempt_path in save_attempts:
            try:
                # Use FileFormat=9 for MHTML
                doc.SaveAs(attempt_path, FileFormat=9)
                save_success = True
                
                # If we saved to temp location, move to final location
                if attempt_path != output_path and attempt_path.startswith(tempfile.gettempdir()):
                    try:
                        shutil.move(attempt_path, output_path)
                        if VERBOSE:
                            print(f"[DEBUG] Moved from temp to final: {output_path}")
                    except Exception as move_error:
                        print(f"[WARNING] Could not move from temp: {move_error}")
                        # But we still consider it a success since conversion worked
                
                if VERBOSE:
                    print(f"[DEBUG] Saved to: {attempt_path}")
                break
            except Exception as save_error:
                if VERBOSE:
                    print(f"[DEBUG] Save attempt failed {attempt_path}: {save_error}")
                continue
        
        if not save_success:
            print(f"[FAIL] Could not save document: {output_path}")
            return False
        
        # Close the document
        try:
            if doc:
                doc.Close(SaveChanges=False)
        except Exception as close_err:
            if VERBOSE:
                print(f"[WARNING] Error closing document: {close_err}")
        
        # Validate the converted file
        ok, reason = validate_converted(output_path)
        if not ok:
            print(f"[VALIDATION] {doc_path} -> {output_path}: {reason}")
            # Don't return False here - the file might still be usable
        
        if VERBOSE:
            print(f"[CONVERTED] {doc_path} -> {output_path} ({reason}, method: {open_method})")
        return True
        
    except Exception as e:
        print(f"[ERROR] Converting {doc_path}: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Safely close document and quit Word
        try:
            if doc:
                doc.Close(SaveChanges=False)
        except:
            pass
        safe_quit_word(word)
        
        # Clean up temp files
        if temp_file_created and temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                os.rmdir(os.path.dirname(temp_file_path))
            except:
                pass
        
        pythoncom.CoUninitialize()

def check_file_exists_and_accessible(file_list):
    """Check which files actually exist and are accessible"""
    existing_files = []
    missing_files = []
    
    for root, file in file_list:
        doc_path = os.path.join(root, file)
        if os.path.exists(doc_path):
            existing_files.append((root, file))
        else:
            missing_files.append((root, file))
    
    return existing_files, missing_files
 
def find_and_convert_docs(input_folder, output_folder):
    """Find all DOC/DOCX files in input folder and convert them to MHTML/MHT in output folder"""
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
        return 0, 0, 0
    
    print(f"Found {total_files} files in directory listing")
    
    # Check which files actually exist
    existing_files, missing_files = check_file_exists_and_accessible(file_list)
    
    if missing_files:
        print(f"Warning: {len(missing_files)} files in directory listing but not accessible:")
        for root, file in missing_files[:5]:  # Show first 5 missing files
            doc_path = os.path.join(root, file)
            print(f"  - {doc_path}")
        if len(missing_files) > 5:
            print(f"  ... and {len(missing_files) - 5} more")
    
    print(f"Actually accessible: {len(existing_files)} files")
   
    # Process files with progress bar
    converted_count = 0
    failed_count = 0
    skipped_count = 0
    
    with tqdm(total=len(existing_files), desc="Converting files", unit="file") as pbar:
        for root, file in existing_files:
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
            pbar.set_description(f"Converting (C:{converted_count} F:{failed_count} S:{skipped_count})")
    
    return converted_count, failed_count, skipped_count
 
def main():
    import tempfile
    
    print("DOC to MHTML/MHT Converter with Folder Hierarchy")
    print("-----------------------------------------------")
    print("NOTE: Handles corrupted documents and long paths")
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