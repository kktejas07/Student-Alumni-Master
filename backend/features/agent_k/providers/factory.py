from typing import Optional
from core.db import db as _db
from core.security import decrypt_value

from .base import BaseLLMProvider
from .featherless import FeatherlessProvider
from .openai import OpenAIProvider
from .claude import ClaudeProvider
from .gemini import GeminiProvider
from .groq import GroqProvider

class LLMFactory:
    """Factory to return the appropriate LLM provider based on user settings."""
    
    @staticmethod
    async def get_provider(user_id: str) -> BaseLLMProvider:
        """
        Retrieves the AI settings for the user and returns an initialized 
        concrete LLM provider instance.
        """
        settings = await _db.user_ai_settings.find_one({"user_id": user_id})
        if not settings:
            raise ValueError(f"No AI settings found for user {user_id}")
            
        provider_name = settings.get("provider", "").lower()
        model = settings.get("model", "")
        
        # Featherless is special, might not need an API key if it's our own
        if provider_name == "featherless":
            # Might use a system-level key or none depending on implementation
            return FeatherlessProvider(api_key="", model=model)
            
        # BYOK providers
        encrypted_key = settings.get("encrypted_api_key")
        if not encrypted_key:
            raise ValueError(f"Missing API key for provider {provider_name}")
            
        api_key = decrypt_value(encrypted_key)
        if not api_key:
            raise ValueError("Failed to decrypt API key or key is invalid.")
            
        if provider_name == "openai":
            return OpenAIProvider(api_key=api_key, model=model)
        elif provider_name == "claude":
            return ClaudeProvider(api_key=api_key, model=model)
        elif provider_name == "gemini":
            return GeminiProvider(api_key=api_key, model=model)
        elif provider_name == "groq":
            return GroqProvider(api_key=api_key, model=model)
        else:
            raise ValueError(f"Unsupported provider: {provider_name}")
