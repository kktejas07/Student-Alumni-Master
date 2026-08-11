import asyncio
from typing import Optional, List, Dict, AsyncGenerator
from core.db import db as _db
from core.security import decrypt_value

from .base import BaseLLMProvider
from .featherless import FeatherlessProvider
from .openai import OpenAIProvider
from .claude import ClaudeProvider
from .gemini import GeminiProvider
from .groq import GroqProvider

class EmergentProvider(BaseLLMProvider):
    """Default high-availability provider using emergentintegrations multi-tier chat engine."""
    
    def __init__(self, api_key: str = "", model: str = "claude-sonnet-4-5-20250929"):
        super().__init__(api_key, model)

    async def generate_text(self, prompt: str, system: str = "") -> str:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=self.api_key, system_message=system)
        return await chat.send_message(UserMessage(text=prompt))

    async def chat(self, messages: List[Dict[str, str]]) -> str:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        system = ""
        user_texts = []
        for m in messages:
            if m.get("role") == "system":
                system = m.get("content", "")
            else:
                user_texts.append(m.get("content", ""))
        combined_prompt = "\n".join(user_texts)
        chat = LlmChat(api_key=self.api_key, system_message=system)
        return await chat.send_message(UserMessage(text=combined_prompt))

    async def stream_text(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        text = await self.generate_text(prompt, system)
        chunk_size = 8
        for i in range(0, len(text), chunk_size):
            yield text[i:i+chunk_size]
            await asyncio.sleep(0.01)


class LLMFactory:
    """Factory to return the appropriate LLM provider based on user settings."""
    
    @staticmethod
    async def get_provider(user_id: str) -> BaseLLMProvider:
        """
        Retrieves the AI settings for the user and returns an initialized 
        concrete LLM provider instance, or a robust default provider.
        """
        try:
            settings = await _db.user_ai_settings.find_one({"user_id": user_id})
        except Exception:
            settings = None
            
        if not settings:
            return EmergentProvider()
            
        provider_name = settings.get("provider", "").lower()
        model = settings.get("model", "")
        
        if not provider_name or provider_name in ("emergent", "default", "auto", "free"):
            return EmergentProvider(model=model or "claude-sonnet-4-5-20250929")

        if provider_name == "featherless":
            return FeatherlessProvider(api_key="", model=model)
            
        # BYOK providers
        encrypted_key = settings.get("encrypted_api_key")
        if not encrypted_key:
            return EmergentProvider(model=model or "claude-sonnet-4-5-20250929")
            
        api_key = decrypt_value(encrypted_key)
        if not api_key:
            return EmergentProvider(model=model or "claude-sonnet-4-5-20250929")
            
        if provider_name == "openai":
            return OpenAIProvider(api_key=api_key, model=model)
        elif provider_name == "claude":
            return ClaudeProvider(api_key=api_key, model=model)
        elif provider_name == "gemini":
            return GeminiProvider(api_key=api_key, model=model)
        elif provider_name == "groq":
            return GroqProvider(api_key=api_key, model=model)
        else:
            return EmergentProvider(model=model or "claude-sonnet-4-5-20250929")
