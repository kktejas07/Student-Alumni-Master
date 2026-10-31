# Agent K

Agent K is the central AI module for the Student Alumni Platform. It provides intelligent routing, role-aware Retrieval-Augmented Generation (RAG), conversational memory, and Bring-Your-Own-Key (BYOK) capabilities for multiple LLMs.

## Features
- **Intelligent Intent Routing**: Dynamically classifies messages as `application` (strict RAG), `general`, `mixed`, `greeting`, or `feedback`.
- **Hybrid RAG**: Uses Qdrant for both dense vector search and BM25 keyword matching, running entirely locally without external embedding API calls.
- **Provider Factory**: Modular LLM integration supporting Featherless (default), OpenAI, Claude, Gemini, and Groq.
- **Role-Aware Context**: RAG strictly filters document retrieval based on the user's role (`student`, `alumni`, `mentor`, `admin`).
- **SSE Streaming**: Supports true Server-Sent Events streaming for lowest time-to-first-byte latency.

## Setup & Environment Variables
The module relies on the global backend setup, but requires specific environment variables depending on your infrastructure.

### Required Environment Variables
- `MONGO_URL`: Connection string for MongoDB (required for chat memory and AI settings).
- `JWT_SECRET`: Secret used to decode JWTs for user resolution.
- `FERNET_KEY`: (Optional but highly recommended) Encryption key used to encrypt API keys at rest. If omitted, a dummy key is generated for dev mode.

### Database Collections
Agent K automatically uses the following MongoDB collections:
- `user_ai_settings`: Stores per-user provider preferences and encrypted keys.
- `agent_k_chat_history`: Stores conversational memory and metrics.

## How to Add a New LLM Provider
The provider layer uses the Factory pattern. To add a new provider (e.g., DeepSeek):

1. **Create the Provider Class**:
   Create a new file `backend/agent_k/providers/deepseek.py`:
   ```python
   from .base import BaseLLMProvider
   import openai # if deepseek is OpenAI compatible

   class DeepSeekProvider(BaseLLMProvider):
       def __init__(self, api_key: str, model: str = "deepseek-chat"):
           self.client = openai.AsyncOpenAI(api_key=api_key, base_url="https://api.deepseek.com")
           self.model = model

       async def generate_text(self, prompt: str, system: str = "") -> str:
           res = await self.client.chat.completions.create(
               model=self.model,
               messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}]
           )
           return res.choices[0].message.content

       async def stream_text(self, prompt: str, system: str = ""):
           res = await self.client.chat.completions.create(
               model=self.model,
               messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
               stream=True
           )
           async for chunk in res:
               if chunk.choices[0].delta.content:
                   yield chunk.choices[0].delta.content
   ```

2. **Register it in `LLMFactory`**:
   Open `backend/agent_k/providers/factory.py`.
   Import the new provider: `from .deepseek import DeepSeekProvider`.
   Add it to the `if/elif` block:
   ```python
   elif provider_name == "deepseek":
       return DeepSeekProvider(api_key=api_key, model=model)
   ```

3. **Frontend (Optional)**:
   Add the provider enum to the UI dropdown in the Marketplace settings so users can select it.

## How to Add a New Knowledge-Base Document Type
Agent K supports Markdown, TXT, PDF, and DOCX natively. To add a new type (e.g., `.csv`):

1. Open `backend/agent_k/api/rag_routes.py`.
2. Add `.csv` to the allowed extensions list in both the `POST /documents` and `PUT /documents/{id}` endpoints.
3. Open `backend/agent_k/rag/ingestion.py`.
4. Add parsing logic in `ingest_file()` for `.csv` files using standard Python CSV parsing or Pandas, and chunk the text accordingly.
