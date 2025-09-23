
import os
import pythoncom
import win32com.client

def convert_word_to_pdf(word_path, pdf_path):
    try:
        pythoncom.CoInitialize()
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(word_path)
        doc.SaveAs(pdf_path, FileFormat=17)  # 17 = wdFormatPDF
        doc.Close(False)
        word.Quit()
        pythoncom.CoUninitialize()
        print(f'PDF file saved as: {pdf_path}')
        return True
    except Exception as e:
        print(f'Word to PDF conversion failed: {e}')
        return False

def convert_pdf_to_mht(pdf_path, mht_path):
    try:
        import pypandoc
        pypandoc.convert_file(pdf_path, 'mht', outputfile=mht_path)
        print(f'MHT file saved as: {mht_path}')
        return True
    except Exception as e:
        print(f'PDF to MHT conversion failed: {e}')
        return False

def main():
    word_file = input('Enter the path to the Word (.doc or .docx) file: ').strip('"')
    if not os.path.isfile(word_file):
        print(f'Word file not found: {word_file}')
        return
    base = os.path.splitext(os.path.basename(word_file))[0]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_file = os.path.join(script_dir, base + '.pdf')
    mht_file = os.path.join(script_dir, base + '.mht')

    if convert_word_to_pdf(word_file, pdf_file):
        convert_pdf_to_mht(pdf_file, mht_file)

if __name__ == '__main__':
    main()

class WordToMHTConverter:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
        
    def __del__(self):
        """Cleanup temporary files"""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def word_to_pdf(self, word_path, pdf_path):
        """Convert Word to PDF preserving all formatting"""
        try:
            pythoncom.CoInitialize()
            word = win32com.client.Dispatch("Word.Application")
            word.Visible = False
            doc = word.Documents.Open(word_path)
            doc.SaveAs(pdf_path, FileFormat=17)  # 17 = wdFormatPDF
            doc.Close(False)
            word.Quit()
            pythoncom.CoUninitialize()
            return True
        except Exception as e:
            print(f"Word to PDF conversion failed: {e}")
            return False

    def pdf_to_mht(self, pdf_path, mht_path):
        """Convert PDF to MHT using pypandoc (if available)"""
        try:
            import pypandoc
            pypandoc.convert_file(pdf_path, 'mht', outputfile=mht_path)
            print(f'PDF to MHT file saved as: {mht_path}')
            return True
        except Exception as e:
            print(f'PDF to MHT conversion failed: {e}')
            return False
    
    def text_to_html(self, text):
        """Convert plain text to basic HTML formatting"""
        # Preserve line breaks and basic formatting
        html_text = text.replace('\n', '<br>\n')
        html_text = re.sub(r'(\b[A-Z][A-Z0-9 ]{5,}\b)', r'<strong>\1</strong>', html_text)
        return html_text
    
    def html_to_mht(self, html_path, mht_path):
        """Convert HTML file to MHT format with embedded resources"""
        try:
            with open(html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # Create MHT content
            mht_content = self.create_mht_file(html_content, html_path)
            
            with open(mht_path, 'w', encoding='utf-8') as f:
                f.write(mht_content)
            return True
            
        except Exception as e:
            print(f"Error creating MHT file: {e}")
            return False
    
    def create_mht_file(self, html_content, original_path):
        """Create MHT file format with proper headers"""
        
        boundary = "----=_NextPart_000_0000_01D123456789ABCD"
        
        mht_parts = [
            "From: <Saved by Python Converter>",
            "Subject: Converted Document",
            "Date: " + self.get_current_time(),
            "MIME-Version: 1.0",
            "Content-Type: multipart/related;",
            f'	type="text/html";',
            f'	boundary="{boundary}"',
            "",
            f"--{boundary}",
            "Content-Type: text/html;",
            '	charset="utf-8"',
            "Content-Transfer-Encoding: 7bit",
            "Content-Location: " + original_path,
            "",
            html_content,
            "",
            f"--{boundary}--"
        ]
        
        return "\n".join(mht_parts)
    
    def get_current_time(self):
        """Get current time in MHT format"""
        from datetime import datetime
        return datetime.now().strftime("%a, %d %b %Y %H:%M:%S +0000")
    
    def convert_word_to_mht(self, word_file_path, output_mht_path):
        """Main conversion function: Word → PDF → MHT"""
        try:
            word_path = word_file_path
            output_path = output_mht_path
            if not os.path.exists(word_path):
                raise FileNotFoundError(f"Word file not found: {word_path}")
            print(f"Converting: {os.path.basename(word_path)}")
            # Step 1: Convert Word to PDF (preserves headers/footers/formatting)
            temp_pdf = os.path.join(self.temp_dir, os.path.splitext(os.path.basename(word_path))[0] + ".pdf")
            print("  Step 1: Converting Word to PDF...")
            if not self.word_to_pdf(word_path, temp_pdf):
                raise Exception("Word to PDF conversion failed")
            # Step 2: Convert PDF to MHT
            print("  Step 2: Converting PDF to MHT...")
            if not self.pdf_to_mht(temp_pdf, output_path):
                raise Exception("PDF to MHT conversion failed")
            print(f"  ✓ Success: {os.path.basename(output_path)}")
            return True
        except Exception as e:
            print(f"  ✗ Conversion failed: {e}")
            return False
    
    def batch_convert(self, input_folder, output_folder):
        """Batch convert all Word files in a folder"""
        input_path = input_folder
        output_path = output_folder
        if not os.path.exists(output_path):
            os.makedirs(output_path)
        # Supported Word formats
        word_extensions = ['.doc', '.docx', '.docm', '.rtf']
        converted_files = []
        failed_files = []
        for word_file in os.listdir(input_path):
            if os.path.splitext(word_file)[1].lower() in word_extensions:
                output_file = os.path.join(output_path, os.path.splitext(word_file)[0] + ".mht")
                word_file_path = os.path.join(input_path, word_file)
                if self.convert_word_to_mht(word_file_path, output_file):
                    converted_files.append(word_file)
                else:
                    failed_files.append(word_file)
        # Print summary
        print(f"\n{'='*50}")
        print("CONVERSION SUMMARY")
        print(f"{'='*50}")
        print(f"Successfully converted: {len(converted_files)} files")
        print(f"Failed: {len(failed_files)} files")
        if failed_files:
            print(f"\nFailed files:")
            for file in failed_files:
                print(f"  - {file}")
        return converted_files, failed_files

# Alternative approach using direct Word to HTML conversion
class DirectWordToMHTConverter:
    """Alternative converter using Word's built-in HTML export"""
    
    def convert_word_to_html_direct(self, word_path, output_path):
        """Use Word's built-in HTML export capability"""
        try:
            pythoncom.CoInitialize()
            word = win32com.client.Dispatch("Word.Application")
            word.Visible = False
            
            doc = word.Documents.Open(str(word_path))
            
            # Save as filtered HTML (better format preservation)
            html_path = str(output_path.with_suffix('.html'))
            doc.SaveAs(
                FileName=html_path,
                FileFormat=10,  # wdFormatFilteredHTML
                Encoding=65001  # UTF-8
            )
            
            doc.Close()
            word.Quit()
            pythoncom.CoUninitialize()
            
            # Convert HTML to MHT
            converter = WordToMHTConverter()
            with open(html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            mht_content = converter.create_mht_file(html_content, html_path)
            output_path.write_text(mht_content, encoding='utf-8')
            
            # Cleanup temporary HTML
            os.remove(html_path)
            
            return True
            
        except Exception as e:
            print(f"Direct conversion error: {e}")
            return False

# Usage Examples
def main():
    """Example usage of the converter"""
    
    # Single file conversion using user input
    converter = WordToMHTConverter()
    word_file = input('Enter the path to the Word (.docx) file: ').strip('"')
    if not os.path.isfile(word_file):
        print(f'Word file not found: {word_file}')
        return
    output_mht = os.path.splitext(word_file)[0] + '.mht'
    success = converter.convert_word_to_mht(word_file, output_mht)
    if success:
        print(f'Converted to: {output_mht}')

# Installation requirements function
def install_requirements():
    """Install required packages"""
    requirements = [
        "pywin32",
        "beautifulsoup4",
        "pdfminer.six",
        "pythoncom"
    ]
    
    for package in requirements:
        try:
            __import__(package.replace('-', '_'))
            # print(f"✓ {package} already installed")
        except ImportError:
            print(f"Installing {package}...")
            os.system(f"pip install {package}")

if __name__ == "__main__":
    # Install requirements
    install_requirements()
    
    # Example usage
    main()
