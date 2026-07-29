from typing import List, Dict
from .base import BaseLLMProvider

class ClaudeProvider(BaseLLMProvider):
    """Anthropic Claude provider."""
    
    async def generate_text(self, prompt: str, system: str = "") -> str:
        return f"[Claude] Generated response for: {prompt[:20]}..."
        
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        return f"[Claude] Chat response for {len(messages)} messages"

    async def stream_text(self, prompt: str, system: str = ""):
        yield f"[Claude] Stream chunk for: {prompt[:20]}..."
