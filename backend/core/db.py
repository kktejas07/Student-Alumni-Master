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

# Force IPv4 resolution to prevent 21-second socket timeouts on Windows machines without IPv6 routing
import socket
orig_getaddrinfo = socket.getaddrinfo
def ipv4_only_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    return orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = ipv4_only_getaddrinfo

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

mongo_url = os.environ['MONGO_URL']


# Inject timeouts to prevent 60-second topology discovery hangs.
if "?" in mongo_url:
    if "serverSelectionTimeoutMS" not in mongo_url:
        mongo_url += "&serverSelectionTimeoutMS=15000"
    if "connectTimeoutMS" not in mongo_url:
        mongo_url += "&connectTimeoutMS=15000"
else:
    mongo_url += "?serverSelectionTimeoutMS=15000&connectTimeoutMS=15000"


# Create exactly ONE global instance of the AsyncIOMotorClient pool with capped size
client = AsyncIOMotorClient(mongo_url, maxPoolSize=20, minPoolSize=5)
db = client[os.environ['DB_NAME']]

__all__ = ['client', 'db', 'mongo_url']

