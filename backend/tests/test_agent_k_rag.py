import os
from pathlib import Path
import pytest
from unittest.mock import patch, MagicMock

from agent_k.rag.ingestion import parse_document, chunk_text
from agent_k.rag.retrieval import QdrantRetriever

@pytest.fixture
def sample_md():
    """Create a temporary markdown file for testing."""
    test_file = Path("test_sample.md")
    content = "# Title\n\nThis is a sample document for RAG testing. We need to ensure that the document parsing and chunking works as expected. RAG helps in retrieving relevant knowledge.\n\n## Section 2\n\nMore details."
    test_file.write_text(content, encoding="utf-8")
    yield test_file
    if test_file.exists():
        test_file.unlink()

def test_ingestion_accuracy(sample_md):
    """Test parsing and chunking of a markdown file."""
    text = parse_document(str(sample_md))
    assert "RAG testing" in text
    
    # Chunk with small size to force multiple chunks
    chunks = chunk_text(text, document_name="test_sample.md", chunk_size=50, chunk_overlap=10)
    
    assert len(chunks) > 1
    assert chunks[0]["metadata"]["document_name"] == "test_sample.md"
    assert "section" in chunks[0]["metadata"]
    assert "text" in chunks[0]

@patch("agent_k.rag.retrieval.client.collection_exists")
@patch("agent_k.rag.retrieval.client.query")
@patch("agent_k.rag.retrieval.get_reranker")
def test_retrieval_accuracy(mock_get_reranker, mock_query, mock_collection_exists):
    """Test the retrieval logic with a mocked Qdrant client."""
    mock_collection_exists.return_value = True
    
    # Mock Qdrant results
    mock_res = MagicMock()
    mock_res.document = "This is a sample document for RAG testing."
    mock_res.metadata = {"document_name": "test_sample.md", "section": "Chunk 1"}
    mock_res.score = 0.95
    
    mock_query.return_value = [mock_res]
    
    # Mock reranker to False to use fallback Qdrant scores
    mock_get_reranker.return_value = False
    
    results = QdrantRetriever.query("RAG testing", top_k=2)
    
    assert len(results) == 1
    assert results[0]["document_name"] == "test_sample.md"
    assert "RAG testing" in results[0]["text"]
    assert results[0]["score"] == 0.95

@patch("agent_k.rag.retrieval.client.collection_exists")
@patch("agent_k.rag.retrieval.client.query")
def test_no_relevant_result(mock_query, mock_collection_exists):
    """Test when no results match the query."""
    mock_collection_exists.return_value = True
    mock_query.return_value = []
    
    results = QdrantRetriever.query("something completely unrelated", top_k=2)
    
    assert isinstance(results, list)
    assert len(results) == 0
