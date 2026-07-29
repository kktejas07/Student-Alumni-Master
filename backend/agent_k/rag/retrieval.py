from typing import List, Dict, Any, Optional
from qdrant_client import models
from cachetools import TTLCache, cached
from .store import client, COLLECTION_NAME, init_collection

reranker_model = None

def get_reranker():
    global reranker_model
    if reranker_model is None:
        try:
            from fastembed import TextCrossEncoder
            reranker_model = TextCrossEncoder(model_name="BAAI/bge-reranker-base")
        except ImportError:
            reranker_model = False # Marker for not available
    return reranker_model

# Cache up to 100 unique queries for 1 hour
_query_cache = TTLCache(maxsize=100, ttl=3600)

class QdrantRetriever:
    @staticmethod
    @cached(cache=_query_cache)
    def query(text: str, top_k: int = 5, user_role: Optional[str] = None) -> List[Dict[str, Any]]:
        if not client.collection_exists(COLLECTION_NAME):
            return []
            
        candidate_limit = top_k * 3
        
        # Build query filter for role awareness
        query_filter = None
        if user_role:
            query_filter = models.Filter(
                should=[
                    models.FieldCondition(
                        key="allowed_roles",
                        match=models.MatchValue(value=user_role)
                    ),
                    models.IsEmptyCondition(
                        is_empty=models.PayloadField(key="allowed_roles")
                    )
                ]
            )
        
        results = client.query(
            collection_name=COLLECTION_NAME,
            query_text=text,
            query_filter=query_filter,
            limit=candidate_limit
        )
        
        if not results:
            return []
            
        documents = [res.document for res in results]
        reranker = get_reranker()
        
        top_results = []
        if reranker:
            # Rerank using cross encoder
            try:
                # API is typically list(reranker.rerank(query, documents))
                # yielding objects with .corpus_id and .score
                ranked = list(reranker.rerank(text, documents))
                for rank in ranked[:top_k]:
                    idx = rank.corpus_id
                    res = results[idx]
                    top_results.append({
                        "document_name": res.metadata.get("document_name", "Unknown"),
                        "section": res.metadata.get("section", ""),
                        "text": res.document,
                        "score": float(rank.score)
                    })
                return top_results
            except Exception as e:
                print(f"Reranking failed: {e}. Falling back to Qdrant hybrid scores.")
        
        # Fallback to hybrid scores
        for res in results[:top_k]:
            top_results.append({
                "document_name": res.metadata.get("document_name", "Unknown"),
                "section": res.metadata.get("section", ""),
                "text": res.document,
                "score": float(res.score)
            })
            
        return top_results
