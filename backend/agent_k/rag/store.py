import os
from uuid import uuid4
from typing import List, Dict, Any, Optional

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import PointStruct
except ImportError:
    pass  # We will handle missing dependency gracefully or just let it crash at runtime if not installed

# For testing, allow falling back to in-memory, but prefer a persistent DB or host if configured
_QDRANT_URL = os.environ.get("QDRANT_URL")
if _QDRANT_URL:
    client = QdrantClient(url=_QDRANT_URL)
else:
    # Use memory for local testing/dev if no URL provided
    client = QdrantClient(":memory:")

# Configure the embedding models. 
# fastembed will download these locally on first use.
DEFAULT_DENSE_MODEL = "BAAI/bge-small-en-v1.5"
DEFAULT_SPARSE_MODEL = "Qdrant/bm25"
COLLECTION_NAME = "agent_k_knowledge"

def init_collection(dense_model: str = DEFAULT_DENSE_MODEL, sparse_model: str = DEFAULT_SPARSE_MODEL):
    """Sets up the collection if it doesn't exist, using fastembed integration."""
    client.set_model(dense_model)
    client.set_sparse_model(sparse_model)
    
    if not client.collection_exists(COLLECTION_NAME):
        # Using the fastembed integration to auto-configure vector sizes
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=client.get_fastembed_vector_params(),
            sparse_vectors_config=client.get_fastembed_sparse_vector_params()
        )

def upsert_chunks(chunks: List[Dict[str, Any]]):
    """
    Takes a list of dicts with 'text' and 'metadata', 
    and inserts them into Qdrant using hybrid embeddings.
    """
    if not chunks:
        return
        
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

def delete_document(document_name: str):
    """Deletes all chunks associated with a specific document."""
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
