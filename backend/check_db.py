import asyncio
import os
import sys

# add current directory to path
sys.path.append(os.getcwd())

from db import db

async def main():
    conns = await db.connections.find({"status": "pending"}).to_list(10)
    for c in conns:
        print(f"Connection: {c}")

if __name__ == "__main__":
    asyncio.run(main())
