import zipfile
import os
import shutil
import xml.etree.ElementTree as ET
import copy
import re
import time
import datetime
import concurrent.futures
import threading
from functools import partial

try:
    import win32com.client as win32
except ImportError:
    win32 = None

# Precompiled regex
PAGE_PATTERN_RE = re.compile(r'^\s*\d+\s*/\s*\d+\s*$')
PAGE_OF_PATTERN_RE = re.compile(r'\bPage\s+\d+\s+of\s+\d+\b', re.IGNORECASE)
PAGE_WORD_PATTERN_RE = re.compile(r'\bpage\b', re.IGNORECASE)
DIGIT_OF_DIGIT_RE = re.compile(r'^\s*\d+\s+of\s+\d+\s*$', re.IGNORECASE)

# Supported extensions set
_SUPPORTED_DOC_EXT = {'.doc', '.docx', '.docm'}

PER_FILE_TIMEOUT = 180
MAX_WORKERS = 4  # Reduced for stability with Word COM

# Thread-local storage for Word applications
thread_local = threading.local()

def get_word_app():
    """Get or create Word application instance for current thread"""
    if not hasattr(thread_local, 'word_app'):
        if win32 is None:
            thread_local.word_app = None
        else:
            try:
                app = win32.DispatchEx("Word.Application")
                configure_word(app)
                thread_local.word_app = app
            except Exception:
                thread_local.word_app = None
    return thread_local.word_app

def cleanup_thread_word_app():
    """Clean up Word application for current thread"""
    if hasattr(thread_local, 'word_app') and thread_local.word_app:
        try:
            thread_local.word_app.Quit()
        except Exception:
            pass
        thread_local.word_app = None

def configure_word(app):
    try:
        app.Visible = False
        app.DisplayAlerts = 0
        o = app.Options
        o.SaveNormalPrompt = False
        o.ConfirmConversions = False
        o.WarnBeforeSavingPrintingSendingMarkup = False
        try:
            app.AutomationSecurity = 3
        except Exception:
            pass
        try:
            app.NormalTemplate.Saved = True
        except Exception:
            pass
    except Exception:
        pass

def repair_docx_with_word(path):
    app = get_word_app()
    if app is None:
        return False
    try:
        doc = app.Documents.Open(path, ReadOnly=False, OpenAndRepair=True, ConfirmConversions=False, AddToRecentFiles=False)
        doc.Saved = True
        doc.Close(SaveChanges=True)
        return True
    except Exception:
        return False

def validate_docx_with_word(path):
    app = get_word_app()
    if app is None:
        return True
    try:
        doc = app.Documents.Open(path, ReadOnly=True, OpenAndRepair=True, ConfirmConversions=False, AddToRecentFiles=False)
        doc.Saved = True
        doc.Close(SaveChanges=False)
        return True
    except Exception:
        return False

def process_single_file(file_info, output_root, skip_web_conversion=False):
    """Process a single file - this function runs in worker threads"""
    full_path, rel_path, ext = file_info
    
    try:
        print(f"Processing: {rel_path}")
        start_time = time.time()
        
        # Your existing processing logic here
        result = extract_header_to_body(full_path)
        
        if result[0] is None:
            print(f"Failed to process: {rel_path}")
            return False, rel_path, "Extraction failed"
        
        # Continue with your existing processing logic...
        processing_time = time.time() - start_time
        print(f"Completed: {rel_path} in {processing_time:.2f}s")
        return True, rel_path, f"Success in {processing_time:.2f}s"
        
    except Exception as e:
        return False, rel_path, f"Error: {str(e)}"

def main_processing_function(input_root, output_root, skip_web_conversion=False):
    """Main function that uses multithreading"""
    
    # Collect all files first
    print("Collecting files...")
    files = collect_doc_files(input_root)
    total_files = len(files)
    print(f"Found {total_files} files to process")
    
    if total_files == 0:
        print("No files to process")
        return
    
    # Create output directory
    os.makedirs(output_root, exist_ok=True)
    
    # Process files with multithreading
    successful = 0
    failed = 0
    failed_files = []
    
    # Use ThreadPoolExecutor with proper resource management
    with concurrent.futures.ThreadPoolExecutor(
        max_workers=MAX_WORKERS,
        thread_name_prefix="DocProcessor"
    ) as executor:
        # Create partial function with fixed parameters
        process_func = partial(
            process_single_file,
            output_root=output_root,
            skip_web_conversion=skip_web_conversion
        )
        
        # Submit all tasks
        future_to_file = {
            executor.submit(process_func, file_info): file_info 
            for file_info in files
        }
        
        # Process completed tasks
        for future in concurrent.futures.as_completed(future_to_file):
            file_info = future_to_file[future]
            full_path, rel_path, ext = file_info
            
            try:
                success, filename, message = future.result(timeout=PER_FILE_TIMEOUT)
                if success:
                    successful += 1
                    print(f"✓ {message}")
                else:
                    failed += 1
                    failed_files.append((filename, message))
                    print(f"✗ {filename}: {message}")
                    
            except concurrent.futures.TimeoutError:
                failed += 1
                failed_files.append((rel_path, "Timeout"))
                print(f"✗ {rel_path}: Timeout after {PER_FILE_TIMEOUT}s")
                
            except Exception as e:
                failed += 1
                failed_files.append((rel_path, str(e)))
                print(f"✗ {rel_path}: {str(e)}")
            
            # Progress update
            processed = successful + failed
            print(f"Progress: {processed}/{total_files} ({processed/total_files*100:.1f}%)")
    
    # Clean up thread-local Word applications
    cleanup_thread_word_app()
    
    # Summary
    print(f"\nProcessing complete:")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    
    if failed_files:
        print("\nFailed files:")
        for filename, reason in failed_files:
            print(f"  {filename}: {reason}")

# Your existing functions (collect_doc_files, extract_header_to_body, etc.) remain the same
# but make sure to use get_word_app() instead of creating new Word instances

def collect_doc_files(input_root):
    """Single pass collection of files"""
    files = []
    root_len = len(input_root.rstrip("\\/"))
    for root, _, fnames in os.walk(input_root):
        for f in fnames:
            if not is_supported_doc(f):
                continue
            full_path = os.path.join(root, f)
            rel_path = full_path[root_len+1:] if full_path.startswith(input_root) else os.path.relpath(full_path, input_root)
            ext = os.path.splitext(f)[1].lower()
            files.append((full_path, rel_path, ext))
    return files

def is_supported_doc(filename):
    return os.path.splitext(filename)[1].lower() in _SUPPORTED_DOC_EXT

# Add this to your existing extract_header_to_body function
# Replace direct Word instance creation with get_word_app() calls

# ... rest of your existing functions (extract_header_to_body, etc.)