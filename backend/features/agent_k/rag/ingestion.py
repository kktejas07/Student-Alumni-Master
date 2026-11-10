import os
from pathlib import Path
from typing import List, Dict, Any

def parse_pdf(file_path: str) -> str:
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise RuntimeError("PyMuPDF is required for PDF parsing")
    
    doc = fitz.open(file_path)
    text = "\n".join([page.get_text() for page in doc])
    doc.close()
    return text

def parse_docx(file_path: str) -> str:
    try:
        import docx
    except ImportError:
        raise RuntimeError("python-docx is required for DOCX parsing")
        
    doc = docx.Document(file_path)
    return "\n".join([p.text for p in doc.paragraphs])

def parse_document(file_path: str) -> str:
    """Extracts text from a document based on its extension."""
    ext = Path(file_path).suffix.lower()
    if ext == ".md" or ext == ".txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    elif ext == ".pdf":
        return parse_pdf(file_path)
    elif ext == ".docx":
        return parse_docx(file_path)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")

def chunk_text(text: str, document_name: str, chunk_size: int = 1000, chunk_overlap: int = 200, allowed_roles: List[str] = None) -> List[Dict[str, Any]]:
    """Chunks text into manageable pieces with overlap."""
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
    except ImportError:
        raise RuntimeError("langchain-text-splitters is required for chunking text")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""]
    )
    
    # We could extract 'section' headers if needed, but for now we just use a basic text splitter
    chunks = splitter.split_text(text)
    
    docs = []
    for i, chunk in enumerate(chunks):
        docs.append({
            "text": chunk,
            "metadata": {
                "document_name": document_name,
                "section": f"Chunk {i+1}", # In a more complex setup, extract real Markdown headers
                "chunk_index": i,
                "allowed_roles": allowed_roles or []
            }
        })
    return docs
