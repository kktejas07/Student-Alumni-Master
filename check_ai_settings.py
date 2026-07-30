import asyncio
import os
import sys
import json
from bson import json_util

backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from core.db import db as _db

async def main():
    settings = await _db.user_ai_settings.find().to_list(length=10)
    print(json_util.dumps(settings, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
