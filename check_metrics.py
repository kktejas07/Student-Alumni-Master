import asyncio
import os
import sys
from bson import json_util
import json

backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from core.db import db as _db

async def main():
    cursor = _db.agent_k_chat_history.find().sort("timestamp", -1).limit(5)
    histories = await cursor.to_list(length=5)
    for h in histories:
        print(f"Message: {h.get('user_message')}")
        metrics = h.get('metrics', {})
        print(f"Metrics: {json.dumps(metrics, indent=2)}")
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(main())
