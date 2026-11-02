import os
from uuid import uuid4

from core.db import db as _db

async def get_best_ai_key() -> tuple:
    """Returns (api_key, model_name, provider) from best available source.
    Priority: Marketplace installed tools > Emergent env var."""
    # 1. Check marketplace for Claude/Anthropic
    claude = await _db.installed_tools.find_one({"tool_id": "claude", "status": "connected"})
    if claude and claude.get("credentials", {}).get("api_key"):
        return (claude["credentials"]["api_key"],
                "claude-sonnet-4-5-20250929", "anthropic")

    # 2. Check for OpenAI
    openai = await _db.installed_tools.find_one({"tool_id": "openai", "status": "connected"})
    if openai and openai.get("credentials", {}).get("api_key"):
        return (openai["credentials"]["api_key"],
                "gpt-4o", "openai")

    # 3. Check for Gemini
    gemini = await _db.installed_tools.find_one({"tool_id": "gemini", "status": "connected"})
    if gemini and gemini.get("credentials", {}).get("api_key"):
        return (gemini["credentials"]["api_key"],
                "gemini-1.5-flash", "google")

    # 4. Fall back to Emergent env var
    emergent = os.environ.get("EMERGENT_LLM_KEY")
    if emergent:
        return (emergent, "claude-sonnet-4-5-20250929", "anthropic")

    return ("", "", "")

async def generate_text(prompt: str, system: str = "You are a helpful drafting assistant.") -> str:
    """Helper: ask Claude to generate a short piece of text and return it raw."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        return "(LLM unavailable in this environment.)"
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return "(EMERGENT_LLM_KEY missing.)"
    chat = (
        LlmChat(api_key=api_key, session_id=f"agentk-draft-{uuid4().hex[:8]}", system_message=system)
        .with_model("anthropic", "claude-sonnet-4-5-20250929")
    )
    try:
        return ((await chat.send_message(UserMessage(text=prompt))) or "").strip()
    except Exception as e:
        return f"(Draft generation failed: {e})"
