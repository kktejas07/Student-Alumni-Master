import asyncio
import os
import sys
import json

backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from agent_k.rag.retrieval import QdrantRetriever

async def main():
    queries = [
        "How do I access student discounts and perks?",
        "career resources",
        "give me the top 10 connections i had to make in this platform according to my role"
    ]
    for q in queries:
        res = QdrantRetriever.query(q, top_k=1, user_role="student")
        if res:
            doc = res[0]
            print(f"Query: {q}")
            print(f"Score: {doc['score']}")
            print(f"Doc: {doc['document_name']}")
            print(f"Text: {doc['text'][:100]}...\n")
        else:
            print(f"Query: {q} -> NO RESULTS\n")

if __name__ == "__main__":
    asyncio.run(main())
