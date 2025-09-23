import os
import tempfile
import shutil
import re
import pythoncom
import win32com.client
from datetime import datetime

def install_requirements():
    """Install required packages with better error handling"""
    requirements = {
        "pywin32": "pywin32",
        "beautifulsoup4": "beautifulsoup4", 
        "pdfminer.six": "pdfminer.six",
        "pypandoc": "pypandoc"
    }
    
    print("Checking required packages...")
    for package, install_name in requirements.items():
        try:
            if package == "pythoncom":
                __import__("pythoncom")
            else:
                __import__(package.replace('-', '_'))
            print(f"✓ {package} already installed")
        except ImportError:
            print(f"Installing {package}...")
            try:
                os.system(f"pip install {install_name}")
                print(f"✓ {package} installed successfully")
            except Exception as e:
                print(f"✗ Failed to install {package}: {e}")

class ConverterConfig:
    """Configuration settings for the converter"""
    def __init__(self):
        self.supported_word_extensions = ['.doc', '.docx', '.docm', '.rtf']
        self.pdf_format_code = 17  # wdFormatPDF
        self.web_archive_format_code = 9  # wdFormatWebArchive
        self.word_visible = False
        self.cleanup_temp_files = True

class WordToMHTConverter:
    def __init__(self, config=None):
        self.temp_dir = tempfile.mkdtemp()
        self.config = config or ConverterConfig()
        
    def __del__(self):
        """Cleanup temporary files"""
        if os.path.exists(self.temp_dir) and self.config.cleanup_temp_files:
            try:
                shutil.rmtree(self.temp_dir)
            except:
                pass
    
    def word_to_pdf(self, word_path, pdf_path):
        """Convert Word to PDF preserving all formatting"""
        try:
            pythoncom.CoInitialize()
            word = win32com.client.Dispatch("Word.Application")
            word.Visible = self.config.word_visible
            
            # Check if file exists
            if not os.path.exists(word_path):
                raise FileNotFoundError(f"Word file not found: {word_path}")
            
            doc = word.Documents.Open(word_path)
            doc.SaveAs(pdf_path, FileFormat=self.config.pdf_format_code)
            doc.Close(False)
            word.Quit()
            pythoncom.CoUninitialize()
            print(f"✓ Word to PDF conversion successful: {pdf_path}")
            return True
        except Exception as e:
            print(f"✗ Word to PDF conversion failed: {e}")
            # Ensure cleanup on failure
            try:
                word.Quit()
                pythoncom.CoUninitialize()
            except:
                pass
            return False

    def pdf_to_mht(self, pdf_path, mht_path):
        """Convert PDF to MHT using pypandoc"""
        try:
            import pypandoc
            # Check if PDF file exists
            if not os.path.exists(pdf_path):
                raise FileNotFoundError(f"PDF file not found: {pdf_path}")
                
            pypandoc.convert_file(pdf_path, 'mht', outputfile=mht_path)
            print(f'✓ PDF to MHT conversion successful: {mht_path}')
            return True
        except ImportError:
            print("✗ pypandoc not available. Trying alternative method...")
            return self.pdf_to_mht_alternative(pdf_path, mht_path)
        except Exception as e:
            print(f'✗ PDF to MHT conversion failed: {e}')
            return False
    
    def pdf_to_mht_alternative(self, pdf_path, mht_path):
        """Alternative PDF to MHT conversion using basic HTML"""
        try:
            # Simple fallback - create basic MHT from PDF text extraction
            from pdfminer.high_level import extract_text
            
            text = extract_text(pdf_path)
            html_content = self.text_to_html(text)
            mht_content = self.create_mht_file(html_content, pdf_path)
            
            with open(mht_path, 'w', encoding='utf-8') as f:
                f.write(mht_content)
            print(f'✓ Alternative PDF to MHT conversion successful: {mht_path}')
            return True
        except Exception as e:
            print(f'✗ Alternative PDF to MHT conversion failed: {e}')
            return False
    
    def text_to_html(self, text):
        """Convert plain text to basic HTML formatting"""
        # Preserve line breaks and basic formatting
        html_text = text.replace('\n', '<br>\n')
        html_text = re.sub(r'(\b[A-Z][A-Z0-9 ]{5,}\b)', r'<strong>\1</strong>', html_text)
        
        # Basic HTML structure
        html_template = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Converted Document</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        strong {{ font-weight: bold; }}
    </style>
</head>
<body>
{html_text}
</body>
</html>"""
        return html_template
    
    def create_mht_file(self, html_content, original_path):
        """Create MHT file format with proper headers"""
        boundary = "----=_NextPart_000_0000_01D123456789ABCD"
        
        mht_parts = [
            "From: <Saved by Python Converter>",
            "Subject: Converted Document",
            "Date: " + self.get_current_time(),
            "MIME-Version: 1.0",
            "Content-Type: multipart/related;",
            f'    type="text/html";',
            f'    boundary="{boundary}"',
            "",
            f"--{boundary}",
            "Content-Type: text/html;",
            '    charset="utf-8"',
            "Content-Transfer-Encoding: 7bit",
            "Content-Location: " + os.path.basename(original_path),
            "",
            html_content,
            "",
            f"--{boundary}--"
        ]
        
        return "\n".join(mht_parts)
    
    def get_current_time(self):
        """Get current time in MHT format"""
        return datetime.now().strftime("%a, %d %b %Y %H:%M:%S +0000")
    
    def convert_word_to_mht(self, word_file_path, output_mht_path):
        """Main conversion function: Word → PDF → MHT"""
        try:
            if not os.path.exists(word_file_path):
                raise FileNotFoundError(f"Word file not found: {word_file_path}")
            
            # Validate file extension
            file_ext = os.path.splitext(word_file_path)[1].lower()
            if file_ext not in self.config.supported_word_extensions:
                raise ValueError(f"Unsupported file format: {file_ext}")
            
            print(f"Converting: {os.path.basename(word_file_path)}")
            
            # Step 1: Convert Word to PDF
            print("  Step 1: Converting Word to PDF...")
            temp_pdf = os.path.join(self.temp_dir, 
                                  os.path.splitext(os.path.basename(word_file_path))[0] + ".pdf")
            
            if not self.word_to_pdf(word_file_path, temp_pdf):
                raise Exception("Word to PDF conversion failed")
            
            # Step 2: Convert PDF to MHT
            print("  Step 2: Converting PDF to MHT...")
            if not self.pdf_to_mht(temp_pdf, output_mht_path):
                raise Exception("PDF to MHT conversion failed")
            
            # Cleanup temporary PDF
            if self.config.cleanup_temp_files:
                try:
                    os.remove(temp_pdf)
                except:
                    pass
            
            print(f"  ✓ Success: {os.path.basename(output_mht_path)}")
            return True
            
        except Exception as e:
            print(f"  ✗ Conversion failed: {e}")
            return False
    
    def batch_convert(self, input_folder, output_folder):
        """Batch convert all Word files in a folder"""
        if not os.path.exists(input_folder):
            print(f"Input folder not found: {input_folder}")
            return [], []
            
        if not os.path.exists(output_folder):
            os.makedirs(output_folder)
        
        converted_files = []
        failed_files = []
        
        for word_file in os.listdir(input_folder):
            file_ext = os.path.splitext(word_file)[1].lower()
            if file_ext in self.config.supported_word_extensions:
                output_file = os.path.join(output_folder, 
                                         os.path.splitext(word_file)[0] + ".mht")
                word_file_path = os.path.join(input_folder, word_file)
                
                print(f"\nProcessing: {word_file}")
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

def convert_word_to_mht_direct(word_path, mht_path):
    """Direct Word to MHT conversion using Word's built-in capability"""
    try:
        pythoncom.CoInitialize()
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        
        # Check if file exists
        if not os.path.exists(word_path):
            raise FileNotFoundError(f"Word file not found: {word_path}")
        
        doc = word.Documents.Open(word_path)
        # 9 = wdFormatWebArchive (MHTML format)
        doc.SaveAs(mht_path, FileFormat=9)
        doc.Close(False)
        word.Quit()
        pythoncom.CoUninitialize()
        print(f'✓ Direct MHT conversion successful: {mht_path}')
        return True
    except Exception as e:
        print(f'✗ Direct Word to MHT conversion failed: {e}')
        # Ensure cleanup on failure
        try:
            word.Quit()
            pythoncom.CoUninitialize()
        except:
            pass
        return False

def main():
    """Main function with user interface"""
    try:
        install_requirements()
        
        print("=" * 50)
        print("      WORD TO MHT CONVERTER")
        print("=" * 50)
        print("1. Single file conversion (Word → PDF → MHT)")
        print("2. Batch conversion (Folder)")
        print("3. Direct conversion (Word → MHT)")
        print("4. Exit")
        
        choice = input("\nSelect option (1-4): ").strip()
        
        if choice == "1":
            # Single file conversion
            word_file = input('Enter the path to the Word file: ').strip('"')
            
            if not os.path.isfile(word_file):
                print(f'✗ Word file not found: {word_file}')
                return
            
            output_mht = os.path.splitext(word_file)[0] + '.mht'
            converter = WordToMHTConverter()
            
            if converter.convert_word_to_mht(word_file, output_mht):
                print(f'\n✓ Conversion completed: {output_mht}')
            else:
                print('\n✗ Conversion failed')
                
        elif choice == "2":
            # Batch conversion
            input_folder = input('Enter input folder path: ').strip('"')
            output_folder = input('Enter output folder path: ').strip('"')
            
            converter = WordToMHTConverter()
            converted, failed = converter.batch_convert(input_folder, output_folder)
            
        elif choice == "3":
            # Direct conversion
            word_file = input('Enter the path to the Word file: ').strip('"')
            
            if not os.path.isfile(word_file):
                print(f'✗ Word file not found: {word_file}')
                return
            
            output_mht = os.path.splitext(word_file)[0] + '.mht'
            
            if convert_word_to_mht_direct(word_file, output_mht):
                print(f'\n✓ Direct conversion completed: {output_mht}')
            else:
                print('\n✗ Direct conversion failed')
                
        elif choice == "4":
            print("Goodbye!")
            return
        else:
            print("Invalid option selected.")
            
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")

def quick_convert(word_file_path):
    """Quick conversion function for programmatic use"""
    converter = WordToMHTConverter()
    output_path = os.path.splitext(word_file_path)[0] + '.mht'
    return converter.convert_word_to_mht(word_file_path, output_path)

# Example usage
if __name__ == '__main__':
    main()
    
    # Example of programmatic usage:
    # quick_convert("C:/path/to/your/document.docx")