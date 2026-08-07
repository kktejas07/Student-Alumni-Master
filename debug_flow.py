import os
import sys
import asyncio
import logging

# Ensure backend path is in sys.path
backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from agent_k.rag.retrieval import QdrantRetriever
from agent_k.core.engine import stream_message
from agent_k.rag.store import client, COLLECTION_NAME

async def main():
    print("--- ARCHITECTURAL FLOW DIAGNOSTIC ---")
    
    # 1. Check Qdrant Store configuration
    print("\n1. STORE CHECK:")
    try:
        exists = client.collection_exists(COLLECTION_NAME)
        print(f"Collection '{COLLECTION_NAME}' exists: {exists}")
        if exists:
            count = client.count(collection_name=COLLECTION_NAME).count
            print(f"Point count: {count}")
    except Exception as e:
        print(f"Store Error: {e}")

    # 2. Check Retrieval
    print("\n2. RETRIEVAL CHECK:")
    message = "How do I access student discounts and perks?"
    try:
        results = QdrantRetriever.query(message, top_k=3, user_role="student")
        print(f"Retrieved {len(results)} chunks.")
        for r in results:
            print(f"  - {r['document_name']} (score: {r['score']})")
    except Exception as e:
        print(f"Retrieval Error: {e}")

    # 3. We cannot test stream_message easily if DB / LLM keys are missing in the local script context
    # Let's just print the current working directory and __file__ context to ensure path matches
    print("\n3. PATH CONTEXT CHECK:")
    print(f"CWD: {os.getcwd()}")
    import agent_k.rag.store as st
    print(f"Store __file__: {st.__file__}")

if __name__ == "__main__":
    asyncio.run(main())
