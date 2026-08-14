import os
import sys
import subprocess

def install_and_import(package):
    try:
        __import__(package)
    except ImportError:
        print(f"Installing {package}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# Make sure pypdf is installed
install_and_import("pypdf")

import pypdf

def extract_text_from_pdf(pdf_path, txt_path):
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} not found.")
        sys.exit(1)
        
    print(f"Parsing {pdf_path}...")
    reader = pypdf.PdfReader(pdf_path)
    text = ""
    for idx, page in enumerate(reader.pages):
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
            
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(text)
        
    print(f"Successfully extracted {len(text)} characters to {txt_path}.")
    print("\n--- FIRST 500 CHARACTERS ---")
    print(text[:500])
    print("----------------------------\n")

if __name__ == "__main__":
    extract_text_from_pdf("my_resume.pdf", "resume_parsed.txt")
