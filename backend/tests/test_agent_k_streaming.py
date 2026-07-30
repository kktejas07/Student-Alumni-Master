import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from agent_k.core.engine import stream_message, REFUSAL_MESSAGE
import json

@pytest.fixture
def mock_provider():
    provider = AsyncMock()
    
    async def fake_stream(prompt, system=""):
        yield "Hello"
        yield " World"
        
    provider.stream_text = fake_stream
    return provider

@pytest.fixture
def mock_memory():
    with patch("agent_k.core.engine.ChatMemory") as mock:
        memory_instance = AsyncMock()
        memory_instance.format_history_string.return_value = ""
        mock.return_value = memory_instance
        yield memory_instance

@pytest.fixture
def mock_retriever():
    with patch("agent_k.core.engine.QdrantRetriever") as mock:
        yield mock

@pytest.fixture
def mock_factory(mock_provider):
    with patch("agent_k.core.engine.LLMFactory.get_provider", new_callable=AsyncMock) as mock:
        mock.return_value = mock_provider
        yield mock

@pytest.mark.anyio
@patch("agent_k.core.engine.classify_intent")
async def test_stream_message_general(mock_intent, mock_factory, mock_memory, mock_retriever, mock_provider):
    """Test that stream_message properly yields chunks for general intent."""
    mock_intent.return_value = "general"
    
    chunks = []
    async for chunk in stream_message("user_1", "Hi", "student"):
        chunks.append(chunk)
        
    assert chunks[1:] == ["Hello", " World"]
    args = mock_memory.add_interaction.call_args[0]
    assert args[:3] == ("user_1", "Hi", "Hello World")
    mock_retriever.query.assert_not_called()

@pytest.mark.anyio
@patch("agent_k.core.engine.classify_intent")
async def test_stream_message_application_refusal(mock_intent, mock_factory, mock_memory, mock_retriever, mock_provider):
    """Test that application intent with no context yields refusal directly."""
    mock_intent.return_value = "application"
    mock_retriever.query.return_value = []
    
    chunks = []
    async for chunk in stream_message("user_1", "How do I do X?", "student"):
        chunks.append(chunk)
        
    assert chunks[1:] == [REFUSAL_MESSAGE]
    args = mock_memory.add_interaction.call_args[0]
    assert args[:3] == ("user_1", "How do I do X?", REFUSAL_MESSAGE)

@pytest.mark.anyio
@patch("agent_k.core.engine.classify_intent")
async def test_stream_message_application_role_aware(mock_intent, mock_factory, mock_memory, mock_retriever, mock_provider):
    """Test that user_role is passed correctly to retriever."""
    mock_intent.return_value = "application"
    mock_retriever.query.return_value = [
        {"document_name": "doc1", "section": "1", "text": "context", "score": 0.9}
    ]
    
    chunks = []
    async for chunk in stream_message("user_1", "How do I do X?", "admin"):
        chunks.append(chunk)
        
    assert chunks[1:] == ["Hello", " World"]
    mock_retriever.query.assert_called_once_with("How do I do X?", top_k=3, user_role="admin")
