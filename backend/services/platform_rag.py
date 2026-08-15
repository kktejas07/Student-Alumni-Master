"""
backend/services/platform_rag.py

Platform-Wide Retrieval-Augmented Generation (RAG) Engine.
Indexes and retrieves entities across Jobs, Events, Courses, Alumni Profiles, Mentors, and Docs
using Qdrant vector search with Role-Based Access Control (RBAC) payload filtering.
"""

import os
import logging
from uuid import uuid4
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger("platform_rag")

HAS_QDRANT = False
QdrantClient: Any = None
PointStruct: Any = None

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue
    HAS_QDRANT = True
except Exception as e:
    logger.warning(f"[PlatformRAG] Qdrant import warning ({e})")

COLLECTION_NAME = "platform_rag_knowledge"
DEFAULT_DENSE_MODEL = "BAAI/bge-small-en-v1.5"

# In-memory fallback store when fastembed models are not loaded in Qdrant instance
_in_memory_index: List[Dict[str, Any]] = []

if HAS_QDRANT and QdrantClient is not None:
    _QDRANT_URL = os.environ.get("QDRANT_URL")
    try:
        if _QDRANT_URL:
            client = QdrantClient(url=_QDRANT_URL)
        else:
            local_path = str(Path(__file__).resolve().parent.parent / ".qdrant_local")
            try:
                client = QdrantClient(path=local_path)
            except Exception:
                client = QdrantClient(":memory:")

        if client is not None and hasattr(client, "set_model"):
            try:
                client.set_model(DEFAULT_DENSE_MODEL)
            except Exception as e:
                logger.warning(f"[PlatformRAG] Failed to set embedding model: {e}")
    except Exception as e:
        logger.warning(f"[PlatformRAG] Client initialization failed: {e}")
        client = None


class PlatformRAGEngine:
    """Enterprise RAG engine supporting multi-entity indexing, RBAC filtering, and semantic retrieval."""

    @staticmethod
    def init_collection():
        if client is None:
            return
        try:
            if hasattr(client, "collection_exists") and hasattr(client, "get_fastembed_vector_params"):
                if not client.collection_exists(COLLECTION_NAME):
                    client.create_collection(
                        collection_name=COLLECTION_NAME,
                        vectors_config=client.get_fastembed_vector_params()
                    )
                    logger.info(f"[PlatformRAG] Initialized vector collection '{COLLECTION_NAME}'")
        except Exception as e:
            logger.warning(f"[PlatformRAG] Collection init fallback: {e}")

    @staticmethod
    def index_entities(entities: List[Dict[str, Any]]) -> int:
        """
        Index a batch of entities. Each entity dict requires:
        - 'text': text representation for vector embedding
        - 'metadata': { 'entity_type': 'job'|'event'|'course'|'alumni'|'mentor'|'doc',
                        'title': str, 'entity_id': str, 'allowed_roles': list[str] }
        """
        if not entities:
            return 0

        indexed_count = 0
        documents = []
        metadata_list = []
        ids = []

        for ent in entities:
            text = ent.get("text", "").strip()
            if not text:
                continue
            meta = ent.get("metadata", {})
            meta["indexed_at"] = datetime.now(timezone.utc).isoformat()
            if "allowed_roles" not in meta:
                meta["allowed_roles"] = ["student", "alumni", "mentor", "college", "superadmin"]

            doc_item = {
                "text": text,
                "metadata": meta,
                "id": uuid4().hex
            }
            _in_memory_index.append(doc_item)
            documents.append(text)
            metadata_list.append(meta)
            ids.append(doc_item["id"])
            indexed_count += 1

        if client is not None and hasattr(client, "add") and documents:
            try:
                PlatformRAGEngine.init_collection()
                client.add(
                    collection_name=COLLECTION_NAME,
                    documents=documents,
                    metadata=metadata_list,
                    ids=ids
                )
            except Exception as e:
                logger.warning(f"[PlatformRAG] Qdrant add fallback: {e}")

        logger.info(f"[PlatformRAG] Indexed {indexed_count} items into RAG vector store.")
        return indexed_count

    @staticmethod
    def search(
        query: str,
        entity_type: Optional[str] = None,
        user_role: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic vector search with optional entity_type & RBAC role filter.
        """
        logger.debug(f"[PlatformRAG DEBUG] Search query='{query}' type={entity_type} role={user_role}")
        if not query.strip():
            return []

        out = []
        q_terms = [t.lower() for t in query.split() if len(t) > 2]

        # 1. Query Qdrant if fastembed client is active
        if client is not None and hasattr(client, "query") and hasattr(client, "collection_exists"):
            try:
                if client.collection_exists(COLLECTION_NAME):
                    results = client.query(
                        collection_name=COLLECTION_NAME,
                        query_text=query,
                        limit=top_k * 2
                    )
                    for res in results[:top_k]:
                        meta = getattr(res, "metadata", {}) or {}
                        allowed_roles = meta.get("allowed_roles") or []
                        if user_role and allowed_roles and user_role not in allowed_roles:
                            continue
                        if entity_type and entity_type.lower() != "all" and meta.get("entity_type") != entity_type.lower():
                            continue
                        out.append({
                            "entity_id": meta.get("entity_id", ""),
                            "entity_type": meta.get("entity_type", "general"),
                            "title": meta.get("title", "Result"),
                            "snippet": getattr(res, "document", ""),
                            "score": round(float(getattr(res, "score", 0.85)), 4),
                            "metadata": meta
                        })
            except Exception as e:
                logger.warning(f"[PlatformRAG] Qdrant search fallback: {e}")

        # 2. Fall back to internal RAG store matching if Qdrant didn't return results
        if not out and _in_memory_index:
            for item in _in_memory_index:
                meta = item["metadata"]
                text = item["text"].lower()

                if entity_type and entity_type.lower() != "all" and meta.get("entity_type") != entity_type.lower():
                    continue
                allowed_roles = meta.get("allowed_roles") or []
                if user_role and allowed_roles and user_role not in allowed_roles:
                    continue

                score = 0.0
                for term in q_terms:
                    if term in text:
                        score += 0.25

                if score > 0.0 or not q_terms:
                    out.append({
                        "entity_id": meta.get("entity_id", ""),
                        "entity_type": meta.get("entity_type", "general"),
                        "title": meta.get("title", "Result"),
                        "snippet": item["text"],
                        "score": round(min(0.95, 0.65 + score), 4),
                        "metadata": meta
                    })

            out = sorted(out, key=lambda x: x["score"], reverse=True)[:top_k]

        logger.info(f"[PlatformRAG] Query '{query}' yielded {len(out)} semantic matches.")
        return out


async def index_all_platform_data(db) -> int:
    """Scans MongoDB collections and populates platform RAG vector store."""
    total_indexed = 0
    batch = []

    # 1. Index Events
    try:
        async for ev in db.echo_showcases.find({"is_active": True}).limit(100):
            text = f"Event: {ev.get('title')} | Category: {ev.get('category')} | Description: {ev.get('description')} | Mode: {ev.get('mode')} | Tags: {', '.join(ev.get('tags') or [])}"
            batch.append({
                "text": text,
                "metadata": {
                    "entity_type": "event",
                    "entity_id": str(ev.get("slug") or ev.get("_id")),
                    "title": ev.get("title"),
                    "allowed_roles": ["student", "alumni", "mentor", "college", "superadmin"]
                }
            })
    except Exception as e:
        logger.warning(f"[PlatformRAG] Error fetching events for indexing: {e}")

    # 2. Index Jobs / Internships
    try:
        async for job in db.jobs_cache.find({}).limit(100):
            text = f"Job: {job.get('title')} | Company: {job.get('company')} | Location: {job.get('location')} | Summary: {job.get('description') or job.get('summary')}"
            batch.append({
                "text": text,
                "metadata": {
                    "entity_type": "job",
                    "entity_id": str(job.get("dedup_hash") or job.get("_id")),
                    "title": job.get("title"),
                    "allowed_roles": ["student", "alumni", "superadmin"]
                }
            })
    except Exception as e:
        logger.warning(f"[PlatformRAG] Error fetching jobs for indexing: {e}")

    # 3. Index Courses
    try:
        async for course in db.courses.find({"status": "published"}).limit(50):
            text = f"Course: {course.get('title')} | Summary: {course.get('summary')} | Fee: ₹{course.get('fee_inr')}"
            batch.append({
                "text": text,
                "metadata": {
                    "entity_type": "course",
                    "entity_id": str(course.get("_id")),
                    "title": course.get("title"),
                    "allowed_roles": ["student", "alumni", "mentor", "college", "superadmin"]
                }
            })
    except Exception as e:
        logger.warning(f"[PlatformRAG] Error fetching courses for indexing: {e}")

    if batch:
        total_indexed = PlatformRAGEngine.index_entities(batch)

    return total_indexed
