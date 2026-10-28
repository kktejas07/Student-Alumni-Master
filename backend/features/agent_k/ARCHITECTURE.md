# Agent K Architecture

Agent K utilizes a modular architecture prioritizing speed, security, and accurate information retrieval.

## System Components

```mermaid
graph TD
    Client[Client Browser / App]
    API[FastAPI Router]
    Engine[Core Engine]
    Intent[Intent Classifier]
    RAG[Qdrant Retriever]
    Provider[LLM Factory / Provider]
    Mem[Chat Memory DB]
    
    Client -- "POST /agent-k/chat/stream" --> API
    API -- "User & Security Validation" --> Engine
    Engine -- "Fetch History" --> Mem
    Engine -- "Classify Intent" --> Intent
    Intent -.-> Provider
    Engine -- "Search (If Application)" --> RAG
    Engine -- "Generate Stream" --> Provider
    Provider -- "Stream Chunks" --> API
    Engine -- "Async Log" --> Mem
    API -- "SSE Stream" --> Client
```

## Phase 3 Routing Logic (Sequence Diagram)

This diagram highlights how Agent K securely handles a streaming request, determines intent, and invokes RAG only when necessary to save on token usage and latency.

```mermaid
sequenceDiagram
    participant User
    participant Router as API Router
    participant Sec as Security/Rate Limiter
    participant Eng as Core Engine
    participant Mem as Memory (MongoDB)
    participant Class as Intent Classifier
    participant RAG as Qdrant (Vector DB)
    participant LLM as LLM Provider
    
    User->>Router: POST /agent-k/chat/stream
    Router->>Sec: Check Rate Limits (20/min)
    Sec-->>Router: Allowed
    Router->>Eng: stream_message(user_id, message)
    
    Eng->>Eng: generate response_id (UUID)
    Eng-->>User: yield {"response_id": "uuid"}
    
    Eng->>Sec: check_prompt_injection(message)
    alt Injection Detected
        Sec-->>Eng: ValueError
        Eng-->>User: yield "Security Violation"
        Eng->>Mem: Log violation
    else Safe
        Eng->>Mem: Fetch recent history
        Mem-->>Eng: Formatted history string
        
        Eng->>Class: classify_intent(message)
        Class->>LLM: Fast intent prompt
        LLM-->>Class: 'application', 'general', 'greeting', etc.
        Class-->>Eng: intent
        
        alt Intent == "application" or "mixed"
            Eng->>RAG: query(message, role)
            RAG-->>Eng: Top 3 Chunks + Scores
            Eng->>Eng: Format Context
        end
        
        Eng->>LLM: stream_text(Prompt + Context)
        loop Stream Generation
            LLM-->>Eng: chunk
            Eng-->>User: yield chunk
        end
        
        Eng->>Mem: add_interaction(metrics, response_id)
    end
```
