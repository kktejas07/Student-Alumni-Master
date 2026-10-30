"""
community_broadcast_service.py — community broadcast engine.

Sends announcements to scouted communities through channels the platform
actually has: WhatsApp (OpenWA gateway, to the community's phone) and email
(to the community / organizer address). Telegram and Discord are not
integrated; requesting them returns a per-community "unsupported_channel"
result instead of a fake "delivered" status.

Every delivery result in the broadcast log is the real outcome of a send
attempt (sent / failed / skipped_no_contact / unsupported_channel).
"""
from __future__ import annotations

import html
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

SUPPORTED_CHANNELS = ("whatsapp", "email")


class CommunityBroadcastService:
    """Broadcast hackathons and jobs to community contacts via WhatsApp or email."""

    async def _send_whatsapp(self, comm: Dict[str, Any], text: str) -> Dict[str, Any]:
        from core.whatsapp import get_openwa_config, normalize_phone, send_whatsapp_text

        config = await get_openwa_config()
        if not config:
            return {"status": "failed", "error": "WhatsApp gateway (OpenWA) is not configured"}
        chat_id = normalize_phone(comm.get("phone") or "", comm.get("location"))
        if not chat_id:
            return {"status": "skipped_no_contact", "error": "community has no valid phone number"}
        try:
            res = await send_whatsapp_text(config, chat_id, text)
            ok = bool(res) and not res.get("error")
            return {"status": "sent" if ok else "failed", "to": chat_id, "gateway": res if not ok else None}
        except Exception as e:
            return {"status": "failed", "to": chat_id, "error": str(e)}

    async def _send_email(self, comm: Dict[str, Any], title: str, text: str) -> Dict[str, Any]:
        from core.email import render_html_email, send_email

        to = (comm.get("organizer_email") or comm.get("email") or "").strip()
        if not to:
            return {"status": "skipped_no_contact", "error": "community has no email address"}
        try:
            body = render_html_email(f"<h2 style='margin:0 0 12px'>{html.escape(title)}</h2><p style='white-space:pre-wrap'>{html.escape(text)}</p>")
            await send_email(to, title, body)
            return {"status": "sent", "to": to}
        except Exception as e:
            return {"status": "failed", "to": to, "error": str(e)}

    async def dispatch_broadcast(
        self,
        db: Any,
        community_ids: List[str],
        channel: str = "whatsapp",  # whatsapp | email (telegram/discord not integrated)
        content_title: str = "Student Alumni announcement",
        message: str = "",
    ) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        broadcast_id = f"bcast-{uuid.uuid4().hex[:8]}"
        channel = (channel or "whatsapp").lower().strip()
        text = f"{content_title}\n\n{message}".strip()

        try:
            communities = await db.community_directory.find({"id": {"$in": community_ids}}, {"_id": 0}).to_list(100)
        except Exception:
            communities = []
        if not communities:
            from services.agents.outreach_scout_service import INITIAL_COMMUNITIES
            communities = [c for c in INITIAL_COMMUNITIES if c["id"] in community_ids]

        results: List[Dict[str, Any]] = []
        for comm in communities:
            if channel not in SUPPORTED_CHANNELS:
                outcome = {"status": "unsupported_channel", "error": f"{channel} is not integrated; use whatsapp or email"}
            elif channel == "whatsapp":
                outcome = await self._send_whatsapp(comm, text)
            else:
                outcome = await self._send_email(comm, content_title, text)
            results.append({
                "community_id": comm.get("id"),
                "community_name": comm.get("name"),
                "channel": channel,
                **outcome,
            })

        sent = sum(1 for r in results if r["status"] == "sent")
        broadcast_log = {
            "id": broadcast_id,
            "content_title": content_title,
            "message": message,
            "channel": channel,
            "target_communities_count": len(community_ids),
            "resolved_communities_count": len(communities),
            "sent_count": sent,
            "failed_count": sum(1 for r in results if r["status"] == "failed"),
            "skipped_count": sum(1 for r in results if r["status"] in ("skipped_no_contact", "unsupported_channel")),
            "delivered_communities": results,
            "dispatched_at": now_iso,
        }
        try:
            await db.broadcast_logs.insert_one(dict(broadcast_log))
        except Exception as e:
            logger.warning("Error logging broadcast: %s", e)

        return {"ok": sent > 0, "broadcast": broadcast_log}


community_broadcast_service = CommunityBroadcastService()
