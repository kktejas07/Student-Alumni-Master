"""
Audit Log Helpers — write every personal-data change to `audit_logs`.

Schema: { user_id, field_name, old_value, new_value, source, validation_status,
          ts (UTC datetime), is_manual_entry }
"""
from __future__ import annotations

from datetime import datetime, timezone
from core.db import db


async def audit_log(
    user_id: str,
    field: str,
    old_value,
    new_value,
    *,
    source: str = "onboarding",
    validation_status: str = "passed",
    is_manual_entry: bool = False,
) -> None:
    """Insert a single audit entry. Best-effort -- never raise to caller."""
    try:
        await db.audit_logs.insert_one(
            {
                "user_id": user_id,
                "field_name": field,
                "old_value": old_value if old_value is not None else None,
                "new_value": new_value if new_value is not None else None,
                "source": source,
                "validation_status": validation_status,
                "is_manual_entry": is_manual_entry,
                "ts": datetime.now(timezone.utc),
            }
        )
    except Exception:
        # Don't let audit failures break the user's flow.
        pass


async def audit_log_many(
    user_id: str,
    source: str,
    entries: list,
    validation_status: str = "passed",
) -> None:
    """Bulk insert audit entries. `entries` is a list of (field, old, new) tuples."""
    if not entries:
        return
    try:
        docs = [
            {
                "user_id": user_id,
                "field_name": f,
                "old_value": o,
                "new_value": n,
                "source": source,
                "validation_status": validation_status,
                "is_manual_entry": False,
                "ts": datetime.now(timezone.utc),
            }
            for (f, o, n) in entries
            if n is not None and n != ""
        ]
        if docs:
            await db.audit_logs.insert_many(docs, ordered=False)
    except Exception:
        pass
