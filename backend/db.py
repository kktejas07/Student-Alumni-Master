import os
import logging
from typing import Any, Dict, Optional
from core.db import client, db, mongo_url

logger = logging.getLogger(__name__)
db_name = os.environ.get('DB_NAME', 'studentalumniadmin')

logger.info(f"Database singleton initialized for {db_name} (shared with core.db)")

async def fetch_users_with_mock_limit(base_query: Dict[str, Any], limit: int, mock_limit: int = 10, proj: Optional[Dict[str, Any]] = None):
    """
    Fetches real users first. If limit allows, appends a small number of mock users.
    """
    if proj is None:
        proj = {"password_hash": 0}
        
    real_query = {**base_query, "is_mock": {"$ne": True}}
    # Removed .sort("_id", -1) to prevent 524 timeouts on DBs missing the is_mock index
    real_candidates = await db.users.find(real_query, proj).to_list(limit)
    
    rem_limit = limit - len(real_candidates)
    if rem_limit > 0:
        # Cap mock data so it doesn't overwhelm the UI
        mock_cap = min(mock_limit, rem_limit)
        mock_query = {**base_query, "is_mock": True}
        mock_candidates = await db.users.find(mock_query, proj).sort("_id", -1).to_list(mock_cap)
        return real_candidates + mock_candidates
    return real_candidates
