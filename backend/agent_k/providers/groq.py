from typing import List, Dict
from .base import BaseLLMProvider

class GroqProvider(BaseLLMProvider):
    """Groq provider."""
    
    async def generate_text(self, prompt: str, system: str = "") -> str:
        return f"[Groq] Generated response for: {prompt[:20]}..."
        
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        return f"[Groq] Chat response for {len(messages)} messages"

    async def stream_text(self, prompt: str, system: str = ""):
        yield f"[Groq] Stream chunk for: {prompt[:20]}..."
