import litellm

class UserMessage:
    def __init__(self, text: str):
        self.text = text

class LlmChat:
    def __init__(self, api_key: str, session_id: str, system_message: str):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self.model = "gemini/gemini-1.5-flash"

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

    async def send_message(self, message: UserMessage):
        messages = [
            {"role": "system", "content": self.system_message},
            {"role": "user", "content": message.text}
        ]
        try:
            response = await litellm.acompletion(
                model=self.model,
                messages=messages,
                api_key=self.api_key
            )
            return response.choices[0].message.content
        except Exception as e:
            raise RuntimeError(f"LLM Chat Error: {e}")
