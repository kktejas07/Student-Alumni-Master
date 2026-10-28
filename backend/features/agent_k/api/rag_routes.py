import os
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from core.deps import require_admin_role
from typing import Optional, List
from pydantic import BaseModel

from features.agent_k.rag.ingestion import parse_document, chunk_text
from features.agent_k.rag.store import upsert_chunks, delete_document

router = APIRouter(tags=["agent-k-rag"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
KNOWLEDGE_BASE_DIR = BASE_DIR / "knowledge_base"
try:
    os.makedirs(KNOWLEDGE_BASE_DIR, exist_ok=True)
except Exception as e:
    print(f"[RAG] Warning: Could not create knowledge_base directory ({e})")

def _safe_doc_id(doc_id: str) -> str:
    """Reject doc ids that contain path separators or traversal."""
    name = Path(doc_id).name
    if not name or name != doc_id or name in (".", ".."):
        raise HTTPException(400, "Invalid document id")
    return name


class ReindexResponse(BaseModel):
    status: str
    documents_indexed: int
    total_chunks: int

@router.post("/agent-k/rag/documents", dependencies=[Depends(require_admin_role)])
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

    from security_scanner import scan_file_for_viruses_async
    await scan_file_for_viruses_async(content)

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

@router.put("/agent-k/rag/documents/{doc_id}", dependencies=[Depends(require_admin_role)])
async def update_document(
    doc_id: str, 
    file: UploadFile = File(...),
    allowed_roles: Optional[str] = Form(None)
):
    """We use the original filename (doc_id) to replace the file."""
    doc_id = _safe_doc_id(doc_id)
    file_path = KNOWLEDGE_BASE_DIR / doc_id
    
    if not file_path.exists():
        raise HTTPException(404, "Document not found")
        
    ext = Path(file.filename).suffix.lower()
    if ext not in [".md", ".txt", ".pdf", ".docx"]:
        raise HTTPException(400, "Unsupported file format. Use .md, .txt, .pdf, or .docx")
        
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File exceeds maximum size of 10MB")

    from security_scanner import scan_file_for_viruses_async
    await scan_file_for_viruses_async(content)

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

@router.delete("/agent-k/rag/documents/{doc_id}", dependencies=[Depends(require_admin_role)])
async def remove_document(doc_id: str):
    doc_id = _safe_doc_id(doc_id)
    file_path = KNOWLEDGE_BASE_DIR / doc_id
    
    if not file_path.exists():
        raise HTTPException(404, "Document not found")
        
    os.remove(file_path)
    delete_document(doc_id)
    
    return {"status": "success", "message": f"Deleted {doc_id}"}

@router.post("/agent-k/rag/reindex", response_model=ReindexResponse, dependencies=[Depends(require_admin_role)])
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
        from features.agent_k.rag.store import client, COLLECTION_NAME, init_collection
        if client.collection_exists(COLLECTION_NAME):
            client.delete_collection(COLLECTION_NAME)
        init_collection()
    except Exception:
        pass
        
    paths_to_index = []
    if KNOWLEDGE_BASE_DIR.exists():
        paths_to_index.extend(KNOWLEDGE_BASE_DIR.rglob("*"))
        
    root_dir = KNOWLEDGE_BASE_DIR.parent
    for doc in ["PROJECT_FEATURES.md", "CHANGELOG.md", "DOKPLOY.md", "RELEASE_NOTES.md", "TEST_REPORT.md", "AGENTS.md", "backend/agent_k/README.md"]:
        p = root_dir / doc
        if p.exists():
            paths_to_index.append(p)

    for file_path in paths_to_index:
        if file_path.is_file() and file_path.suffix.lower() in [".md", ".txt", ".pdf", ".docx"]:
            try:
                text = parse_document(str(file_path))
                try:
                    doc_name = str(file_path.relative_to(root_dir))
                except ValueError:
                    doc_name = file_path.name
                chunks = chunk_text(text, document_name=doc_name)
                upsert_chunks(chunks)
                documents_indexed += 1
                total_chunks += len(chunks)
            except Exception as e:
                print(f"Skipping {file_path.name} due to error: {e}")
                
    return ReindexResponse(status="success", documents_indexed=documents_indexed, total_chunks=total_chunks)
