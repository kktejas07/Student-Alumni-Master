import uuid
import time
import json
from typing import Optional, AsyncGenerator
from agent_k.providers.factory import LLMFactory
from agent_k.memory.history import ChatMemory
from agent_k.core.intent import classify_intent
from agent_k.core.security import check_prompt_injection
from agent_k.rag.retrieval import QdrantRetriever
from bson import ObjectId
from core.db import db as _db
from agent_k.prompts.templates import (
    APPLICATION_PROMPT,
    GENERAL_PROMPT,
    MIXED_PROMPT,
    SYSTEM_PROMPT
)

# Threshold for refusing to answer an application question
RAG_CONFIDENCE_THRESHOLD = 0.5
REFUSAL_MESSAGE = "I couldn't find this information in the application documentation."

async def process_message(user_id: str, message: str, session_id: str = None) -> str:
    """
    Main entry point for Agent K.
    Classifies intent, fetches memory, routes to RAG if necessary, and returns a response.
    """
    start_time = time.time()
    
    try:
        check_prompt_injection(message)
    except ValueError as e:
        return str(e)
        
    try:
        provider = await LLMFactory.get_provider(user_id)
        provider_name = provider.__class__.__name__
    except Exception as e:
        return f"Error initializing AI provider: {str(e)}"
        
    memory = ChatMemory()
    history_str = await memory.format_history_string(user_id)
    
    intent = await classify_intent(provider, message, history_str)
    
    metrics = {
        "intent": intent,
        "provider": provider_name,
        "rag_hit": False,
        "rag_avg_score": 0.0,
        "latency_ms": 0
    }
    
    prompt = ""
    if intent in ("application", "mixed", "general"):
        metrics["rag_hit"] = True
        # Retrieve context
        results = QdrantRetriever.query(message, top_k=3)
        
        if results:
            metrics["rag_avg_score"] = sum(r["score"] for r in results) / len(results)
            max_score = max([r["score"] for r in results])
            if max_score >= 0.6:
                intent = "application"
        
        # Check confidence for strict application queries
        if intent == "application":
            if not results:
                intent = "general"
            else:
                max_score = max([r["score"] for r in results])
                if max_score < RAG_CONFIDENCE_THRESHOLD:
                    intent = "general"
                
        # Format context
        context_parts = []
        for r in results:
            context_parts.append(f"--- Document: {r['document_name']} | Section: {r['section']} ---\n{r['text']}")
        context_str = "\n\n".join(context_parts)
        
        if intent == "application":
            prompt = APPLICATION_PROMPT.format(context=context_str, history=history_str, message=message)
        elif intent == "general":
            prompt = GENERAL_PROMPT.format(history=history_str, message=message)
        else:
            prompt = MIXED_PROMPT.format(context=context_str, history=history_str, message=message)
            
    else:
        # For greeting, feedback, unknown -> Route to General Prompt
        prompt = GENERAL_PROMPT.format(history=history_str, message=message)
        
    # Fetch profile
    try:
        user_doc = await _db.users.find_one({"_id": ObjectId(user_id)}) or {}
    except Exception:
        user_doc = {}
        
    profile_info = {
        "full_name": user_doc.get("full_name"),
        "role": user_doc.get("role"),
        "skills": user_doc.get("skills", []),
        "student_info": user_doc.get("student_info", {}),
        "alumni_info": user_doc.get("alumni_info", {}),
        "mentor_info": user_doc.get("mentor_info", {}),
    }
    profile_info = {k: v for k, v in profile_info.items() if v}
    try:
        profile_str = json.dumps(profile_info, default=str)
    except Exception:
        profile_str = str(profile_info)
        
    system_prompt_formatted = SYSTEM_PROMPT.format(profile=profile_str)
        
    # Generate the response
    try:
        response = await provider.generate_text(prompt, system=system_prompt_formatted)
    except Exception as e:
        response = f"Failed to generate response: {str(e)}"
        
    metrics["latency_ms"] = int((time.time() - start_time) * 1000)
    interaction_id = str(uuid.uuid4())
    
    # Save interaction to memory
    await memory.add_interaction(user_id, message, response, interaction_id, metrics, session_id=session_id)
    
    return response

async def stream_message(user_id: str, message: str, user_role: str, session_id: str = None) -> AsyncGenerator[str, None]:
    """
    Main entry point for Agent K streaming.
    Classifies intent, fetches memory, routes to RAG (role-aware) if necessary, and yields response chunks.
    """
    start_time = time.time()
    interaction_id = str(uuid.uuid4())
    yield json.dumps({"response_id": interaction_id})
    
    memory = ChatMemory()

    try:
        check_prompt_injection(message)
    except ValueError as e:
        err_msg = str(e)
        yield err_msg
        await memory.add_interaction(user_id, message, err_msg, interaction_id, {"latency_ms": int((time.time() - start_time) * 1000)}, session_id=session_id)
        return

    try:
        provider = await LLMFactory.get_provider(user_id)
        provider_name = provider.__class__.__name__
    except Exception as e:
        yield f"Error initializing AI provider: {str(e)}"
        return
        
    history_str = await memory.format_history_string(user_id)
    
    intent = await classify_intent(provider, message, history_str)
    
    metrics = {
        "intent": intent,
        "provider": provider_name,
        "rag_hit": False,
        "rag_avg_score": 0.0,
        "latency_ms": 0
    }

    prompt = ""
    if intent in ("application", "mixed", "general"):
        metrics["rag_hit"] = True
        # Retrieve context with role-awareness
        results = QdrantRetriever.query(message, top_k=3, user_role=user_role)
        
        if results:
            metrics["rag_avg_score"] = sum(r["score"] for r in results) / len(results)
            max_score = max([r["score"] for r in results])
            if max_score >= 0.6:
                intent = "application"
        
        # Check confidence for strict application queries
        if intent == "application":
            if not results:
                intent = "general"
            else:
                max_score = max([r["score"] for r in results])
                if max_score < RAG_CONFIDENCE_THRESHOLD:
                    intent = "general"
                
        # Format context
        context_parts = []
        for r in results:
            context_parts.append(f"--- Document: {r['document_name']} | Section: {r['section']} ---\n{r['text']}")
        context_str = "\n\n".join(context_parts)
        
        if intent == "application":
            prompt = APPLICATION_PROMPT.format(context=context_str, history=history_str, message=message)
        elif intent == "general":
            prompt = GENERAL_PROMPT.format(history=history_str, message=message)
        else:
            prompt = MIXED_PROMPT.format(context=context_str, history=history_str, message=message)
            
    else:
        # For greeting, feedback, unknown -> Route to General Prompt
        prompt = GENERAL_PROMPT.format(history=history_str, message=message)
        
    # Fetch profile
    try:
        user_doc = await _db.users.find_one({"_id": ObjectId(user_id)}) or {}
    except Exception:
        user_doc = {}
        
    profile_info = {
        "full_name": user_doc.get("full_name"),
        "role": user_doc.get("role"),
        "skills": user_doc.get("skills", []),
        "student_info": user_doc.get("student_info", {}),
        "alumni_info": user_doc.get("alumni_info", {}),
        "mentor_info": user_doc.get("mentor_info", {}),
    }
    profile_info = {k: v for k, v in profile_info.items() if v}
    try:
        profile_str = json.dumps(profile_info, default=str)
    except Exception:
        profile_str = str(profile_info)
        
    system_prompt_formatted = SYSTEM_PROMPT.format(profile=profile_str)
        
    # Stream the response
    full_response = ""
    try:
        async for chunk in provider.stream_text(prompt, system=system_prompt_formatted):
            full_response += chunk
            yield chunk
    except Exception as e:
        err_msg = f"\nFailed to stream response: {str(e)}"
        full_response += err_msg
        yield err_msg
        
    metrics["latency_ms"] = int((time.time() - start_time) * 1000)
        
    # Save interaction to memory
    await memory.add_interaction(user_id, message, full_response, interaction_id, metrics, session_id=session_id)
