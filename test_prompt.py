import sys
import os
import asyncio
from pathlib import Path

backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from agent_k.rag.retrieval import QdrantRetriever

async def run():
    message = "How do I access student discounts and perks?"
    user_role = "student"
    
    results = QdrantRetriever.query(message, top_k=3, user_role=user_role)
    print(f"Results: {len(results)}")
    
    intent = "general" # Assume LLM classified as general
    if results:
        max_score = max([r["score"] for r in results])
        print(f"Max score: {max_score}")
        if max_score >= 0.6:
            intent = "application"
            
    print(f"Final intent: {intent}")
    
if __name__ == "__main__":
    asyncio.run(run())
