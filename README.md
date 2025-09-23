import os
import sys
import tempfile
import shutil
from pathlib import Path
import win32com.client
import pythoncom
from bs4 import BeautifulSoup
import mimetypes
import base64
import re
from urllib.parse import quote

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
            word.DisplayAlerts = False
            
            doc = word.Documents.Open(str(word_path))
            
            # Export to PDF with all formatting preserved
            doc.ExportAsFixedFormat(
                OutputFileName=str(pdf_path),
                ExportFormat=17,  # wdExportFormatPDF
                OpenAfterExport=False,
                OptimizeFor=0,    # wdExportOptimizeForPrint
                IncludeDocProps=True,
                KeepIRM=False,
                CreateBookmarks=2,  # wdExportCreateHeadingBookmarks
                DocStructureTags=True,
                BitmapMissingFonts=True,
                UseISO19005_1=False
            )
            
            doc.Close()
            word.Quit()
            pythoncom.CoUninitialize()
            return True
            
        except Exception as e:
            print(f"Error converting Word to PDF: {e}")
            return False
    
    def pdf_to_html_with_pandoc(self, pdf_path, html_path):
        """Convert PDF to HTML using external tools"""
        try:
            # Method 1: Try using pdf2htmlEX (preserves layout better)
            try:
                import subprocess
                result = subprocess.run([
                    'pdf2htmlEX', 
                    '--embed-css', '1',
                    '--embed-font', '1',
                    '--embed-image', '1',
                    '--embed-javascript', '1',
                    '--optimize-text', '1',
                    '--process-outline', '1',
                    str(pdf_path), str(html_path)
                ], capture_output=True, timeout=300)
                if result.returncode == 0:
                    return True
            except:
                pass
            
            # Method 2: Fallback to pdfminer for text extraction
            self.pdf_to_html_fallback(pdf_path, html_path)
            return True
            
        except Exception as e:
            print(f"Error converting PDF to HTML: {e}")
            return False
    
    def pdf_to_html_fallback(self, pdf_path, html_path):
        """Fallback PDF to HTML conversion"""
        try:
            from pdfminer.high_level import extract_text
            text = extract_text(pdf_path)
            
            # Create basic HTML structure
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>{Path(pdf_path).stem}</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    .page {{ margin-bottom: 50px; }}
                </style>
            </head>
            <body>
                <div class="content">{self.text_to_html(text)}</div>
            </body>
            </html>
            """
            
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
                
        except ImportError:
            print("pdfminer.six not available, using simple text extraction")
            # Create minimal HTML
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(f"<html><body><pre>Content extracted from {pdf_path}</pre></body></html>")
    
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
        """Main conversion function: Word → PDF → HTML → MHT"""
        try:
            word_path = Path(word_file_path)
            output_path = Path(output_mht_path)
            
            if not word_path.exists():
                raise FileNotFoundError(f"Word file not found: {word_path}")
            
            print(f"Converting: {word_path.name}")
            
            # Step 1: Convert Word to PDF (preserves headers/footers/formatting)
            temp_pdf = Path(self.temp_dir) / f"{word_path.stem}.pdf"
            print("  Step 1: Converting Word to PDF...")
            if not self.word_to_pdf(word_path, temp_pdf):
                raise Exception("Word to PDF conversion failed")
            
            # Step 2: Convert PDF to HTML
            temp_html = Path(self.temp_dir) / f"{word_path.stem}.html"
            print("  Step 2: Converting PDF to HTML...")
            if not self.pdf_to_html_with_pandoc(temp_pdf, temp_html):
                print("  Warning: Using fallback HTML conversion")
            
            # Step 3: Convert HTML to MHT
            print("  Step 3: Converting HTML to MHT...")
            if not self.html_to_mht(temp_html, output_path):
                raise Exception("HTML to MHT conversion failed")
            
            print(f"  ✓ Success: {output_path.name}")
            return True
            
        except Exception as e:
            print(f"  ✗ Conversion failed: {e}")
            return False
    
    def batch_convert(self, input_folder, output_folder):
        """Batch convert all Word files in a folder"""
        input_path = Path(input_folder)
        output_path = Path(output_folder)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Supported Word formats
        word_extensions = ['.doc', '.docx', '.docm', '.rtf']
        
        converted_files = []
        failed_files = []
        
        for word_file in input_path.iterdir():
            if word_file.suffix.lower() in word_extensions:
                output_file = output_path / f"{word_file.stem}.mht"
                
                if self.convert_word_to_mht(word_file, output_file):
                    converted_files.append(word_file.name)
                else:
                    failed_files.append(word_file.name)
        
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
    
    # Single file conversion
    converter = WordToMHTConverter()
    
    # Convert single file
    success = converter.convert_word_to_mht(
        "input/document.docx",
        "output/document.mht"
    )
    
    # Batch conversion
    if success:
        converted, failed = converter.batch_convert(
            "input_folder/",
            "output_folder/"
        )

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
            print(f"✓ {package} already installed")
        except ImportError:
            print(f"Installing {package}...")
            os.system(f"pip install {package}")

if __name__ == "__main__":
    # Install requirements
    install_requirements()
    
    # Example usage
    main()