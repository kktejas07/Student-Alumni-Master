import asyncio
from typing import List, Dict, AsyncGenerator
from .base import BaseLLMProvider

class FeatherlessProvider(BaseLLMProvider):
    """Featherless trial provider. Usually OpenAI compatible."""
    
    async def generate_text(self, prompt: str, system: str = "") -> str:
        return f"[Featherless] Generated response for: {prompt[:20]}..."
        
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        return f"[Featherless] Chat response for {len(messages)} messages"

    async def stream_text(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        response = f"[Featherless] Generated streamed response for: {prompt[:20]}..."
        chunk_size = 5
        for i in range(0, len(response), chunk_size):
            yield response[i:i+chunk_size]
            await asyncio.sleep(0.05)
