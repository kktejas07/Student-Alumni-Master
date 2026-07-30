import sys
import os
import asyncio
from pathlib import Path

backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from agent_k.rag.retrieval import QdrantRetriever
from core.db import db as _db

async def run():
    print("Testing RAG retrieval...")
    res = QdrantRetriever.query("How do I access student discounts and perks?", top_k=3)
    for r in res:
        print(f"Doc: {r['document_name']}, Section: {r['section']}, Score: {r['score']}")
        print(f"Text snippet: {r['text'][:150]}...")
        print("-" * 40)
        
    if not res:
        print("NO RESULTS RETURNED")

if __name__ == "__main__":
    asyncio.run(run())
