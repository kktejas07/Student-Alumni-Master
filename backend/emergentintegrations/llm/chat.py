import os
from typing import Optional

import litellm


class UserMessage:
    def __init__(self, text: str):
        self.text = text


def _anthropic_base_url() -> Optional[str]:
    """Route anthropic/* models through ANTHROPIC_BASE_URL when set (e.g. BroCode)."""
    base = os.environ.get("ANTHROPIC_BASE_URL")
    return base.rstrip("/") if base and base != "https://api.anthropic.com" else None

class LlmChat:
    def __init__(self, api_key: str, session_id: str, system_message: str):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self.model = "gemini/gemini-1.5-flash"
        self.max_tokens = None

    def with_model(self, provider: str, model_name: str):
        if provider in ("anthropic", "claude"):
            self.model = f"anthropic/{model_name}"
        elif provider == "openai":
            self.model = f"openai/{model_name}"
        elif provider == "gemini":
            self.model = f"gemini/{model_name}"
        else:
            self.model = f"{provider}/{model_name}"
        return self

    def with_max_tokens(self, max_tokens: int):
        self.max_tokens = max_tokens
        return self

    async def send_message(self, message: UserMessage):
        messages = [
            {"role": "system", "content": self.system_message},
            {"role": "user", "content": message.text}
        ]
        kwargs = {
            "model": self.model,
            "messages": messages,
            "api_key": self.api_key,
        }
        if self.max_tokens:
            kwargs["max_tokens"] = self.max_tokens
        if _anthropic_base_url() and self.model.startswith("anthropic/"):
            kwargs["api_base"] = _anthropic_base_url()
        try:
            response = await litellm.acompletion(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            raise RuntimeError(f"LLM Chat Error: {e}")
