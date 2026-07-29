from typing import List, Dict
from .base import BaseLLMProvider

class OpenAIProvider(BaseLLMProvider):
    """OpenAI provider."""
    
    async def generate_text(self, prompt: str, system: str = "") -> str:
        return f"[OpenAI] Generated response for: {prompt[:20]}..."
        
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        return f"[OpenAI] Chat response for {len(messages)} messages"

    async def stream_text(self, prompt: str, system: str = ""):
        yield f"[OpenAI] Stream chunk for: {prompt[:20]}..."
