import os
import pythoncom
from win32com import client

def convert_to_mhtm(root_folder):
    # Initialize COM
    pythoncom.CoInitialize()  
    word_app = client.Dispatch('Word.Application')
    word_app.Visible = False  # Keep Word application hidden

    for dirpath, _, filenames in os.walk(root_folder):
        for filename in filenames:
            if filename.endswith('.doc') or filename.endswith('.docx'):
                full_path = os.path.join(dirpath, filename)

                # Create output file path
                if filename.endswith('.doc'):
                    mhtm_filename = filename.replace('.doc', '.mht')
                else:
                    mhtm_filename = filename.replace('.docx', '.mhtml')

                mhtm_full_path = os.path.join(dirpath, mhtm_filename)

                try:
                    # Open the Word document
                    doc = word_app.Documents.Open(full_path)
                    # Save it as MHTM/MHTML
                    doc.SaveAs(mhtm_full_path, FileFormat=69)  # 69 is the file format for MHTML
                    doc.Close()
                    print(f"Converted: {full_path} to {mhtm_full_path}")
                except Exception as e:
                    print(f"Failed to convert {full_path}. Error: {str(e)}")

    # Quit Word application
    word_app.Quit()

if __name__ == "__main__":
    root_folder = input("Enter the root folder path: ")
    convert_to_mhtm(root_folder)
