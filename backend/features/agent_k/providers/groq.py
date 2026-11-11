from typing import List, Dict
from .base import BaseLLMProvider
import litellm

class GroqProvider(BaseLLMProvider):
    """Groq provider."""
    
    def _get_model_name(self) -> str:
        if not self.model.startswith("groq/"):
            return f"groq/{self.model}"
        return self.model
    
    async def generate_text(self, prompt: str, system: str = "") -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        response = await litellm.acompletion(
            model=self._get_model_name(),
            messages=messages,
            api_key=self.api_key
        )
        return response.choices[0].message.content
        
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        response = await litellm.acompletion(
            model=self._get_model_name(),
            messages=messages,
            api_key=self.api_key
        )
        return response.choices[0].message.content

    async def stream_text(self, prompt: str, system: str = ""):
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        response = await litellm.acompletion(
            model=self._get_model_name(),
            messages=messages,
            api_key=self.api_key,
            stream=True
        )
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
