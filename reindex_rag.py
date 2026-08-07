import sys
import os
import asyncio

# Ensure the backend directory is in the python path
backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from agent_k.api.rag_routes import reindex_all

async def run():
    print("Starting RAG reindex...")
    result = await reindex_all()
    print("Reindex complete:", result)

if __name__ == "__main__":
    asyncio.run(run())
