import sys
import os
import asyncio
from pathlib import Path

backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from agent_k.rag.store import client, COLLECTION_NAME

async def run():
    print("Testing Qdrant collection...")
    try:
        count = client.count(collection_name=COLLECTION_NAME)
        print(f"Total points in collection: {count}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(run())
