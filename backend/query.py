import asyncio
import sys

sys.path.append("/Users/devendervutukuru/Desktop/My Projects/Student-Alumni-Master/backend")

from core.db import db

async def update_events():
    res = await db.echo_catalog_items.update_many(
        {"event_id": "master"}, 
        {"$set": {"event_id": "6a9161b18b098e04bc94b054"}} # VNRVJIET showcase ID
    )
    print(f"Updated {res.modified_count} items to point to VNRVJIET showcase.")

if __name__ == "__main__":
    asyncio.run(update_events())
