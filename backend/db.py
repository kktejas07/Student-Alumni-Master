import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# Base MongoDB URL from environment
_MONGO_URL = os.environ.get(
    'MONGO_URL', 
    'mongodb+srv://studentalumniadmin_db_user:wDruHz5sCPoEVuFy@studentalumniadmin.hhu4uao.mongodb.net/?appName=studentalumniadmin'
)

# Inject timeouts to prevent 60-second topology discovery hangs.
if "?" in _MONGO_URL:
    if "serverSelectionTimeoutMS" not in _MONGO_URL:
        _MONGO_URL += "&serverSelectionTimeoutMS=5000"
    if "connectTimeoutMS" not in _MONGO_URL:
        _MONGO_URL += "&connectTimeoutMS=10000"
else:
    _MONGO_URL += "?serverSelectionTimeoutMS=5000&connectTimeoutMS=10000"

# Create exactly ONE global instance of the AsyncIOMotorClient pool
client = AsyncIOMotorClient(_MONGO_URL)
db_name = os.environ.get('DB_NAME', 'studentalumniadmin')
db = client[db_name]

logger.info(f"Database singleton initialized for {db_name}")
