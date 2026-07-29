import os
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, List
from pydantic import BaseModel

from agent_k.rag.ingestion import parse_document, chunk_text
from agent_k.rag.store import upsert_chunks, delete_document

router = APIRouter(tags=["agent-k-rag"])

KNOWLEDGE_BASE_DIR = Path("knowledge_base")
os.makedirs(KNOWLEDGE_BASE_DIR, exist_ok=True)

class ReindexResponse(BaseModel):
    status: str
    documents_indexed: int
    total_chunks: int

@router.post("/agent-k/rag/documents")
async def upload_document(
    file: UploadFile = File(...),
    allowed_roles: Optional[str] = Form(None)
):
    if not file.filename:
        raise HTTPException(400, "Filename is required")
        
    ext = Path(file.filename).suffix.lower()
    if ext not in [".md", ".txt", ".pdf", ".docx"]:
        raise HTTPException(400, "Unsupported file format. Use .md, .txt, .pdf, or .docx")
        
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File exceeds maximum size of 10MB")
        
    if ext == ".pdf" and not content.startswith(b"%PDF"):
        raise HTTPException(400, "Invalid PDF format")
    elif ext == ".docx" and not content.startswith(b"PK"):
        raise HTTPException(400, "Invalid DOCX format")
    elif ext in [".md", ".txt"]:
        text_preview = content.decode('utf-8', errors='ignore').lower()
        if "<script" in text_preview or "javascript:" in text_preview:
            raise HTTPException(400, "Malicious content detected")
            
    file_path = KNOWLEDGE_BASE_DIR / file.filename
    
    with open(file_path, "wb") as f:
        f.write(content)
        
    # Process
    try:
        text = parse_document(str(file_path))
        roles_list = [r.strip() for r in allowed_roles.split(",")] if allowed_roles else []
        chunks = chunk_text(text, document_name=file.filename, allowed_roles=roles_list)
        upsert_chunks(chunks)
    except Exception as e:
        # Cleanup on failure
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(500, f"Error processing document: {str(e)}")
        
    return {"status": "success", "filename": file.filename, "chunks": len(chunks)}

@router.put("/agent-k/rag/documents/{doc_id}")
async def update_document(
    doc_id: str, 
    file: UploadFile = File(...),
    allowed_roles: Optional[str] = Form(None)
):
    """We use the original filename (doc_id) to replace the file."""
    file_path = KNOWLEDGE_BASE_DIR / doc_id
    
    if not file_path.exists():
        raise HTTPException(404, "Document not found")
        
    ext = Path(file.filename).suffix.lower()
    if ext not in [".md", ".txt", ".pdf", ".docx"]:
        raise HTTPException(400, "Unsupported file format. Use .md, .txt, .pdf, or .docx")
        
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File exceeds maximum size of 10MB")
        
    if ext == ".pdf" and not content.startswith(b"%PDF"):
        raise HTTPException(400, "Invalid PDF format")
    elif ext == ".docx" and not content.startswith(b"PK"):
        raise HTTPException(400, "Invalid DOCX format")
    elif ext in [".md", ".txt"]:
        text_preview = content.decode('utf-8', errors='ignore').lower()
        if "<script" in text_preview or "javascript:" in text_preview:
            raise HTTPException(400, "Malicious content detected")
            
    # Delete old chunks
    delete_document(doc_id)
    
    # Save new file
    with open(file_path, "wb") as f:
        f.write(content)
        
    # Process
    try:
        text = parse_document(str(file_path))
        roles_list = [r.strip() for r in allowed_roles.split(",")] if allowed_roles else []
        chunks = chunk_text(text, document_name=doc_id, allowed_roles=roles_list)
        upsert_chunks(chunks)
    except Exception as e:
        raise HTTPException(500, f"Error processing document: {str(e)}")
        
    return {"status": "success", "filename": doc_id, "chunks": len(chunks)}

@router.delete("/agent-k/rag/documents/{doc_id}")
async def remove_document(doc_id: str):
    file_path = KNOWLEDGE_BASE_DIR / doc_id
    
    if not file_path.exists():
        raise HTTPException(404, "Document not found")
        
    os.remove(file_path)
    delete_document(doc_id)
    
    return {"status": "success", "message": f"Deleted {doc_id}"}

@router.post("/agent-k/rag/reindex", response_model=ReindexResponse)
async def reindex_all():
    """Reindexes all files currently in the knowledge_base directory."""
    documents_indexed = 0
    total_chunks = 0
    
    # Simple strategy: just re-parse everything and add. 
    # Since Qdrant client add with FastEmbed does not automatically dedup by metadata,
    # we should ideally clear the collection. For this phase, we assume the collection 
    # can be cleared or we just recreate the IDs based on content hash. 
    # Here we just delete everything and re-add.
    try:
        from agent_k.rag.store import client, COLLECTION_NAME, init_collection
        if client.collection_exists(COLLECTION_NAME):
            client.delete_collection(COLLECTION_NAME)
        init_collection()
    except Exception:
        pass
        
    for file_path in KNOWLEDGE_BASE_DIR.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in [".md", ".txt", ".pdf", ".docx"]:
            try:
                text = parse_document(str(file_path))
                chunks = chunk_text(text, document_name=file_path.name)
                upsert_chunks(chunks)
                documents_indexed += 1
                total_chunks += len(chunks)
            except Exception as e:
                print(f"Skipping {file_path.name} due to error: {e}")
                
    return ReindexResponse(status="success", documents_indexed=documents_indexed, total_chunks=total_chunks)
