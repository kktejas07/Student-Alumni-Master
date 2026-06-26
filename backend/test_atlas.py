import asyncio
import os
import sys

# Add backend to path so we can import core.db
sys.path.append(os.getcwd())

from core.db import db, client

async def main():
    print("Fetching tools from Atlas...")
    count = 0
    async for doc in db.installed_tools.find({"tool_id": "gmail"}):
        print("FOUND:", doc)
        count += 1
    print("TOTAL GMAIL DOCS:", count)
    client.close()

asyncio.run(main())
