import os
from typing import List, Dict, Optional
from .base import BaseLLMProvider
import litellm


def _anthropic_base_url() -> Optional[str]:
    """Route Claude calls through ANTHROPIC_BASE_URL when set (e.g. BroCode gateway)."""
    base = os.environ.get("ANTHROPIC_BASE_URL")
    return base.rstrip("/") if base and base != "https://api.anthropic.com" else None


class ClaudeProvider(BaseLLMProvider):
    """Anthropic Claude provider."""

    def _get_model_name(self) -> str:
        if not self.model.startswith("anthropic/"):
            return f"anthropic/{self.model}"
        return self.model

    def _llm_kwargs(self, **extra) -> dict:
        kwargs = {"model": self._get_model_name(), "api_key": self.api_key}
        base = _anthropic_base_url()
        if base:
            kwargs["api_base"] = base
        kwargs.update(extra)
        return kwargs

    async def generate_text(self, prompt: str, system: str = "") -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = await litellm.acompletion(**self._llm_kwargs(messages=messages))
        return response.choices[0].message.content

    async def chat(self, messages: List[Dict[str, str]]) -> str:
        response = await litellm.acompletion(**self._llm_kwargs(messages=messages))
        return response.choices[0].message.content

    async def stream_text(self, prompt: str, system: str = ""):
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = await litellm.acompletion(**self._llm_kwargs(messages=messages, stream=True))
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
