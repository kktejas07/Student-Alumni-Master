import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from agent_k.core.engine import process_message, REFUSAL_MESSAGE

@pytest.fixture
def mock_provider():
    provider = AsyncMock()
    provider.generate_text.return_value = "Mocked LLM Response"
    return provider

@pytest.fixture
def mock_memory():
    with patch("agent_k.core.engine.ChatMemory") as mock:
        memory_instance = AsyncMock()
        memory_instance.format_history_string.return_value = "User: Hello\nAssistant: Hi"
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
async def test_process_message_application_no_context(mock_intent, mock_factory, mock_memory, mock_retriever, mock_provider):
    """If intent is application and RAG returns nothing, refuse."""
    mock_intent.return_value = "application"
    mock_retriever.query.return_value = []
    
    response = await process_message("user_1", "How do I reset my password?")
    
    assert response == REFUSAL_MESSAGE
    # Should not call the LLM to generate a response
    mock_provider.generate_text.assert_not_called()

@pytest.mark.anyio
@patch("agent_k.core.engine.classify_intent")
async def test_process_message_application_low_score(mock_intent, mock_factory, mock_memory, mock_retriever, mock_provider):
    """If intent is application and RAG returns low scores, refuse."""
    mock_intent.return_value = "application"
    mock_retriever.query.return_value = [
        {"document_name": "doc1.md", "section": "1", "text": "Something unrelated", "score": 0.2}
    ]
    
    response = await process_message("user_1", "How do I reset my password?")
    
    assert response == REFUSAL_MESSAGE
    mock_provider.generate_text.assert_not_called()

@pytest.mark.anyio
@patch("agent_k.core.engine.classify_intent")
async def test_process_message_application_good_score(mock_intent, mock_factory, mock_memory, mock_retriever, mock_provider):
    """If intent is application and RAG returns good scores, call LLM."""
    mock_intent.return_value = "application"
    mock_retriever.query.return_value = [
        {"document_name": "doc1.md", "section": "1", "text": "To reset password, go to settings.", "score": 0.85}
    ]
    
    response = await process_message("user_1", "How do I reset my password?")
    
    assert response == "Mocked LLM Response"
    mock_provider.generate_text.assert_called_once()
    
    # Check that context was injected into the prompt
    args, kwargs = mock_provider.generate_text.call_args
    prompt = args[0]
    assert "To reset password" in prompt

@pytest.mark.anyio
@patch("agent_k.core.engine.classify_intent")
async def test_process_message_general(mock_intent, mock_factory, mock_memory, mock_retriever, mock_provider):
    """If intent is general, do not call RAG, call LLM directly."""
    mock_intent.return_value = "general"
    
    response = await process_message("user_1", "What is the capital of France?")
    
    assert response == "Mocked LLM Response"
    mock_retriever.query.assert_not_called()
    mock_provider.generate_text.assert_called_once()
