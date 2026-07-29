import pytest
from unittest.mock import patch, AsyncMock

from agent_k.providers.base import BaseLLMProvider
from agent_k.providers.featherless import FeatherlessProvider
from agent_k.providers.openai import OpenAIProvider
from agent_k.providers.claude import ClaudeProvider
from agent_k.providers.gemini import GeminiProvider
from agent_k.providers.groq import GroqProvider
from agent_k.providers.factory import LLMFactory

@pytest.fixture
def mock_db():
    with patch("agent_k.providers.factory._db", new_callable=AsyncMock) as mock:
        yield mock

@pytest.fixture
def mock_decrypt():
    with patch("agent_k.providers.factory.decrypt_value") as mock:
        mock.return_value = "decrypted_test_key"
        yield mock

@pytest.mark.anyio
async def test_factory_featherless(mock_db):
    mock_db.user_ai_settings.find_one.return_value = {
        "provider": "featherless",
        "model": "featherless-default"
    }
    
    provider = await LLMFactory.get_provider("user_1")
    
    assert isinstance(provider, FeatherlessProvider)
    assert provider.model == "featherless-default"
    assert provider.api_key == ""

@pytest.mark.anyio
async def test_factory_openai_byok(mock_db, mock_decrypt):
    mock_db.user_ai_settings.find_one.return_value = {
        "provider": "openai",
        "model": "gpt-4o",
        "encrypted_api_key": "enc::something"
    }
    
    provider = await LLMFactory.get_provider("user_1")
    
    assert isinstance(provider, OpenAIProvider)
    assert provider.model == "gpt-4o"
    assert provider.api_key == "decrypted_test_key"
    mock_decrypt.assert_called_once_with("enc::something")

@pytest.mark.anyio
async def test_factory_missing_settings(mock_db):
    mock_db.user_ai_settings.find_one.return_value = None
    
    with pytest.raises(ValueError, match="No AI settings found"):
        await LLMFactory.get_provider("user_1")

@pytest.mark.anyio
async def test_factory_missing_key_for_byok(mock_db):
    mock_db.user_ai_settings.find_one.return_value = {
        "provider": "openai",
        "model": "gpt-4o"
    }
    
    with pytest.raises(ValueError, match="Missing API key"):
        await LLMFactory.get_provider("user_1")

@pytest.mark.anyio
async def test_factory_invalid_provider(mock_db, mock_decrypt):
    mock_db.user_ai_settings.find_one.return_value = {
        "provider": "unknown",
        "model": "unknown",
        "encrypted_api_key": "enc::something"
    }
    
    with pytest.raises(ValueError, match="Unsupported provider: unknown"):
        await LLMFactory.get_provider("user_1")

@pytest.mark.anyio
async def test_provider_interface_compliance():
    """Test that all providers implement the BaseLLMProvider interface."""
    providers = [
        FeatherlessProvider("", "test"),
        OpenAIProvider("key", "test"),
        ClaudeProvider("key", "test"),
        GeminiProvider("key", "test"),
        GroqProvider("key", "test")
    ]
    
    for provider in providers:
        assert isinstance(provider, BaseLLMProvider)
        assert hasattr(provider, "generate_text")
        assert hasattr(provider, "chat")
        
        # Test basic mock return formats
        res_text = await provider.generate_text("Hello")
        assert "Generated response for: Hello" in res_text
        
        res_chat = await provider.chat([{"role": "user", "content": "Hi"}])
        assert "Chat response for 1 messages" in res_chat
