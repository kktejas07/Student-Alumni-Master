import os
import logging
from core.db import client, db, mongo_url

logger = logging.getLogger(__name__)
db_name = os.environ.get('DB_NAME', 'studentalumniadmin')

logger.info(f"Database singleton initialized for {db_name} (shared with core.db)")

