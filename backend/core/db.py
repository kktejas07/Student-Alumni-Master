"""
core.db — MongoDB connection (single source of truth).

Imported by server.py and all routers/* modules. Reads MONGO_URL and DB_NAME
from .env (these are protected vars and must NEVER be hardcoded).
"""
from dotenv import load_dotenv
from pathlib import Path
import os

# Load env from /app/backend/.env (parent directory of /core)
load_dotenv(Path(__file__).resolve().parent.parent / '.env')

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

__all__ = ['client', 'db', 'mongo_url']
