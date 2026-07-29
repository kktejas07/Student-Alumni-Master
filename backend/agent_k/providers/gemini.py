from typing import List, Dict
from .base import BaseLLMProvider

class GeminiProvider(BaseLLMProvider):
    """Google Gemini provider."""
    
    async def generate_text(self, prompt: str, system: str = "") -> str:
        return f"[Gemini] Generated response for: {prompt[:20]}..."
        
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        return f"[Gemini] Chat response for {len(messages)} messages"

    async def stream_text(self, prompt: str, system: str = ""):
        yield f"[Gemini] Stream chunk for: {prompt[:20]}..."
