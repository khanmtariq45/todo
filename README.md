def extract_links_from_doc(path):
    word = None
    doc = None
    try:
        word = client.Dispatch("Word.Application")
        word.Visible = False
        word.DisplayAlerts = False  # Suppress alerts
        doc = word.Documents.Open(os.path.abspath(path), ReadOnly=True, Visible=False)
        
        # ... rest of your extraction code ...
        
    except Exception as e:
        raise Exception(f"DOC error: {e}")
    finally:
        try:
            if doc:
                doc.Close(SaveChanges=False)
        except Exception as e:
            print(f"Warning: Document close failed - {e}")
        
        try:
            if word:
                word.Quit()
                # Ensure COM objects are released
                del word
        except Exception as e:
            print(f"Warning: Word quit failed - {e}")
        
        # Force garbage collection
        import gc
        gc.collect()
    return links





try:
    doc = word.Documents.Open(os.path.abspath(path), 
                            ReadOnly=True, 
                            Visible=False,
                            ConfirmConversions=False,
                            NoEncodingDialog=True)
except Exception as e:
    print(f"Could not open {path}: {str(e)}")
    return []  # Return empty list instead of failing



try:
    doc = word.Documents.Open(os.path.abspath(path), 
                            ReadOnly=True, 
                            Visible=False)
except Exception as e:
    try:
        # Try opening with repair option
        doc = word.Documents.Open(os.path.abspath(path),
                                Repair=True,
                                ReadOnly=True,
                                Visible=False)
    except Exception as e2:
        print(f"Could not open {path} even with repair: {str(e2)}")
        return []





def extract_links_from_doc(path):
    word = None
    doc = None
    links = []
    
    try:
        word = client.DispatchEx("Word.Application")  # Use DispatchEx for better isolation
        word.Visible = False
        word.DisplayAlerts = False
        
        # Try multiple strategies to open the document
        try:
            doc = word.Documents.Open(
                FileName=os.path.abspath(path),
                ConfirmConversions=False,
                ReadOnly=True,
                AddToRecentFiles=False,
                Visible=False
            )
        except Exception as e:
            try:
                # Try with different parameters
                doc = word.Documents.Open(
                    FileName=os.path.abspath(path),
                    OpenAndRepair=True,
                    ReadOnly=True
                )
            except Exception as e2:
                raise Exception(f"Failed to open document: {str(e2)}")
        
        # Your link extraction logic here
        
    except Exception as e:
        raise Exception(f"DOC error: {e}")
    finally:
        # Cleanup in reverse order
        try:
            if doc:
                doc.Close(SaveChanges=False)
                del doc
        except Exception as e:
            print(f"Warning: Failed to close document - {e}")
        
        try:
            if word:
                word.Quit()
                del word
        except Exception as e:
            print(f"Warning: Failed to quit Word - {e}")
        
        # Release COM objects
        import pythoncom
        pythoncom.CoUninitialize()
    
    return links




import win32event
import win32api

# Set a 30-second timeout for document opening
timeout = 30000  # milliseconds
handle = win32event.CreateEvent(None, 0, 0, None)
win32event.WaitForSingleObject(handle, timeout)



import logging
logging.basicConfig(filename='word_link_extractor.log', level=logging.INFO)

try:
    # your code
except Exception as e:
    logging.error(f"Error processing {path}: {str(e)}")
    raise





def is_valid_word_file(path):
    try:
        return os.path.isfile(path) and os.path.splitext(path)[1].lower() in ('.doc', '.docx')
    except:
        return False



def safe_extract_links(path, max_retries=2):
    for attempt in range(max_retries):
        try:
            return extract_links_from_doc(path)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(1)  # Wait before retrying
