import asyncio
import sys
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).parent))

from agent_k.api.rag_routes import reindex_all

async def main():
    res = await reindex_all()
    print("Reindex complete:", res)

if __name__ == "__main__":
    asyncio.run(main())
