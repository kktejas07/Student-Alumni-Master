from abc import ABC, abstractmethod
from typing import List, Dict, AsyncGenerator

class BaseLLMProvider(ABC):
    """Abstract base class for all LLM providers in Agent K."""
    
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @abstractmethod
    async def generate_text(self, prompt: str, system: str = "") -> str:
        """Simple text generation given a prompt and optional system message."""
        pass
        
    @abstractmethod
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        """Chat completion. messages is a list of dicts with 'role' and 'content'."""
        pass
        
    @abstractmethod
    async def stream_text(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        """Streams text generation chunks."""
        pass

