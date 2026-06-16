"""
core.db — MongoDB connection (single source of truth).

Imported by server.py and all routers/* modules. Reads MONGO_URL and DB_NAME
from .env (these are protected vars and must NEVER be hardcoded).

IMPORTANT: AsyncIOMotorClient is created eagerly at import time so that
Motor's background thread-pool and connection logic bind to the correct
event loop.  Call `await warm_db()` from the FastAPI startup event to force
the topology discovery before the first request is served.
"""
from dotenv import load_dotenv
from pathlib import Path
import os

# Load env from /app/backend/.env (parent directory of /core)
load_dotenv(Path(__file__).resolve().parent.parent / '.env')

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

mongo_url = os.environ['MONGO_URL']

# Inject short timeouts so topology discovery never hangs for 60 s.
_qs = "?" if "?" not in mongo_url else "&"
if "serverSelectionTimeoutMS" not in mongo_url:
    mongo_url += ("?" if "?" not in mongo_url else "&") + "serverSelectionTimeoutMS=10000"
if "connectTimeoutMS" not in mongo_url:
    mongo_url += "&connectTimeoutMS=10000"

# Single shared connection pool — created once at import time.
# Motor internally defers socket activity to a background thread, so this
# does NOT block the event loop during import.
client = AsyncIOMotorClient(
    mongo_url,
    maxPoolSize=20,
    minPoolSize=2,
    # Resolve Atlas hostnames eagerly (avoids lazy-DNS hang on first request)
    serverSelectionTimeoutMS=10000,
)
db = client[os.environ['DB_NAME']]


async def warm_db() -> float:
    """
    Ping MongoDB and force topology discovery.
    Call this from FastAPI's startup event so the pool is warm before
    the first user request arrives.  Returns round-trip time in ms.
    """
    import time
    t0 = time.perf_counter()
    await client.admin.command("ping")
    elapsed_ms = (time.perf_counter() - t0) * 1000
    print(f"[DB] warm_db ping OK — {elapsed_ms:.1f} ms", flush=True)
    return elapsed_ms


__all__ = ['client', 'db', 'mongo_url', 'warm_db']
