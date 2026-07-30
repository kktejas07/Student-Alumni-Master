import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from agent_k.memory.history import ChatMemory
from agent_k.rag.retrieval import QdrantRetriever
from cachetools import TTLCache

@pytest.mark.anyio
async def test_dashboard_metrics():
    with patch("agent_k.memory.history._db.agent_k_chat_history") as mock_coll:
        mock_cursor = AsyncMock()
        mock_cursor.to_list.return_value = [{
            "overall": [{"chat_count": 10, "avg_latency": 1000, "rag_hits": 5, "total_rag_score": 4.5}],
            "providers": [{"_id": "FeatherlessProvider", "count": 10}],
            "top_questions": [{"_id": "Hi", "count": 2}],
            "failed_searches": [{"_id": "bad", "count": 1}]
        }]
        mock_coll.aggregate.return_value = mock_cursor
        
        memory = ChatMemory()
        metrics = await memory.get_dashboard_metrics()
        
        assert metrics["chat_count"] == 10
        assert metrics["rag_hit_rate"] == 0.5
        assert metrics["avg_latency"] == 1000
        assert metrics["avg_retrieval_score"] == 0.9
        assert metrics["trial_usage"] == 10
        assert metrics["top_questions"] == [{"question": "Hi", "count": 2}]

@pytest.mark.anyio
async def test_add_feedback():
    with patch("agent_k.memory.history._db.agent_k_chat_history") as mock_coll:
        mock_result = MagicMock()
        mock_result.modified_count = 1
        mock_coll.update_one = AsyncMock(return_value=mock_result)
        
        memory = ChatMemory()
        success = await memory.add_feedback("123", True, "Great")
        
        assert success is True
        mock_coll.update_one.assert_called_once_with(
            {"_id": "123"},
            {"$set": {"feedback": {"is_helpful": True, "comment": "Great"}}}
        )

def test_retriever_caching():
    with patch("agent_k.rag.retrieval.client") as mock_client:
        mock_client.collection_exists.return_value = True
        mock_client.query.return_value = []
        
        # Clear cache in case other tests polluted it
        from agent_k.rag.retrieval import _query_cache
        _query_cache.clear()
        
        QdrantRetriever.query("test_cache", 5, "admin")
        QdrantRetriever.query("test_cache", 5, "admin") # Should hit cache
        
        mock_client.query.assert_called_once()
