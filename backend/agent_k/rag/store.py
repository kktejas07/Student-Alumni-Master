import os
from uuid import uuid4
from typing import List, Dict, Any, Optional
from pathlib import Path

HAS_QDRANT = False
QdrantClient: Any = None
PointStruct: Any = None

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import PointStruct
    HAS_QDRANT = True
except Exception as e:
    print(f"[Qdrant] Warning: Qdrant client import failed ({e})")

DEFAULT_DENSE_MODEL = "BAAI/bge-small-en-v1.5"
DEFAULT_SPARSE_MODEL = "Qdrant/bm25"
COLLECTION_NAME = "agent_k_knowledge"

client: Any = None

if HAS_QDRANT and QdrantClient is not None:
    _QDRANT_URL = os.environ.get("QDRANT_URL")
    try:
        if _QDRANT_URL:
            client = QdrantClient(url=_QDRANT_URL)
        else:
            local_path = str(Path(__file__).resolve().parent.parent.parent.parent / ".qdrant_local")
            try:
                client = QdrantClient(path=local_path)
            except Exception as e:
                print(f"[Qdrant] Persistent storage lock error ({e}), falling back to in-memory instance.")
                client = QdrantClient(":memory:")

        if client is not None:
            try:
                client.set_model(DEFAULT_DENSE_MODEL)
                client.set_sparse_model(DEFAULT_SPARSE_MODEL)
            except Exception as e:
                print(f"[Qdrant] Warning: Failed to set embedding models ({e})")
    except Exception as e:
        print(f"[Qdrant] Warning: Failed to initialize Qdrant client ({e})")
        client = None

def init_collection(dense_model: str = DEFAULT_DENSE_MODEL, sparse_model: str = DEFAULT_SPARSE_MODEL):
    """Sets up the collection if it doesn't exist, using fastembed integration."""
    if client is None:
        return
    try:
        if not client.collection_exists(COLLECTION_NAME):
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=client.get_fastembed_vector_params(),
                sparse_vectors_config=client.get_fastembed_sparse_vector_params()
            )
    except Exception as e:
        print(f"[Qdrant] init_collection error: {e}")

def upsert_chunks(chunks: List[Dict[str, Any]]):
    """
    Takes a list of dicts with 'text' and 'metadata', 
    and inserts them into Qdrant using hybrid embeddings.
    """
    if not chunks or client is None:
        return
        
    try:
        init_collection()
        documents = [chunk["text"] for chunk in chunks]
        metadata = [chunk["metadata"] for chunk in chunks]
        ids = [uuid4().hex for _ in chunks]
        
        client.add(
            collection_name=COLLECTION_NAME,
            documents=documents,
            metadata=metadata,
            ids=ids
        )
    except Exception as e:
        print(f"[Qdrant] upsert_chunks error: {e}")

def delete_document(document_name: str):
    """Deletes all chunks associated with a specific document."""
    if client is None:
        return
    try:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        if not client.collection_exists(COLLECTION_NAME):
            return
            
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="document_name",
                        match=MatchValue(value=document_name)
                    )
                ]
            )
        )
    except Exception as e:
        print(f"[Qdrant] delete_document error: {e}")
