"""
talent_outreach.py — TP21: Email drip campaigns for the Talent Pool.

Day-0 / day-3 / day-7 personalized sequences for candidates who opted in
(intact interest_status INTERESTED + active consent). Sent through the
house mail pipeline (core.email.send_email — provider priority Postal →
SendGrid → Gmail SMTP). Open/click tracking via tokenized URLs; the
router (features/talent_pool.py) exposes the two GET tracking endpoints
that call `track_open` / `track_click` here.

Consent rule: a consent record in `talent_pool_consent` with status
"active" AND "outreach" in purposes → eligible. NO consent record at all
→ treated as consented-by-UI-opt-in, because interest_status is only set
via the explicit opt-in endpoint. A record with status "revoked" → skip.

Messages live in `outreach_messages` (queryable by token for the
tracking endpoints); campaign docs in `outreach_campaigns`.

Jinja2 (declared dep) renders the templates; if the package is missing at
runtime, a token-substitution fallback ({{token}} → value, .format-safe)
keeps the drip running without Jinja.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import quote

from services.agents.talent_common import (
    import_optional, now_utc, agent_run_log, log_activity, normalize_email,
)
from services.agents.talent_compliance import consent_status, pii_fields, revoke_consent

try:
    from core.config import frontend_base_url
except Exception:  # pragma: no cover - core.config is fail-fast; guard for tests
    def frontend_base_url(default: str = "https://studentalumni.ai") -> str:
        return default


_COMPANY = "AXISS"

# ── Day 0 / 3 / 7 templates (Jinja2) ──────────────────────────────
_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "day0": {
        "subject": "Thanks for your interest, {{candidate_first_name}} — here's what happens next",
        "body": """
<p>Hi {{candidate_first_name}},</p>
<p>Thanks for letting us know you're interested — it's great to have a
<span style="font-weight:700;">{{candidate_role}}</span> like you in the pool.
Here's what to expect: we'll share hand-picked {{opening_title}} opportunities
that match your profile, over the next week. No spam, no auto-CCs.</p>
<p>In the meantime, a more complete profile (recent project + a headline) gets
seen faster. Two minutes, big difference.</p>
<p style="margin:22px 0;">
  <a href="{{cta_link}}"
     style="display:inline-block;padding:12px 22px;background:#5B4FE9;color:#fff;
            text-decoration:none;border-radius:8px;font-weight:700;">
     Explore my matches</a>
</p>
<p style="color:#6b7280;font-size:13px;">— {{recruiter_name}}, {_COMPANY}</p>
<p style="color:#9ca3af;font-size:11px;"><a href="{{optout_link}}"
   style="color:#9ca3af;">Unsubscribe from these emails</a></p>
""",
    },
    "day3": {
        "subject": "{{candidate_first_name}} — new matches for {{opening_title}} are live",
        "body": """
<p>Hi {{candidate_first_name}},</p>
<p>Quick one: we just refreshed the matches for <span style="font-weight:700;">{{opening_title}}</span>.
Given your <span style="font-weight:700;">{{candidate_role}}</span> background,
one of these should stand out to you.</p>
<p>Tip: if you add your current stack or a recent project to your profile,
the matcher surfaces sharper fits — it takes about a minute.</p>
<p style="margin:22px 0;">
  <a href="{{cta_link}}"
     style="display:inline-block;padding:12px 22px;background:#5B4FE9;color:#fff;
            text-decoration:none;border-radius:8px;font-weight:700;">
     See the new matches</a>
</p>
<p style="color:#6b7280;font-size:13px;">— {{recruiter_name}}, {_COMPANY}</p>
<p style="color:#9ca3af;font-size:11px;"><a href="{{optout_link}}"
   style="color:#9ca3af;">Unsubscribe from these emails</a></p>
""",
    },
    "day7": {
        "subject": "Last touch, {{candidate_first_name}} — keep your profile ready",
        "body": """
<p>Hi {{candidate_first_name}},</p>
<p>This is the last note in this sequence — we don't want to crowd your inbox.
Whenever you're ready, your profile is live and the pipeline keeps updating,
so matching opportunities for <span style="font-weight:700;">{{opening_title}}</span>
will still find you without another email from us.</p>
<p>One last tip: a current headline + at least 3 skills keeps your match
score fresh. That's it — thank you, and good luck on the search.</p>
<p style="margin:22px 0;">
  <a href="{{cta_link}}"
     style="display:inline-block;padding:12px 22px;background:#5B4FE9;color:#fff;
            text-decoration:none;border-radius:8px;font-weight:700;">
     My profile &amp; matches</a>
</p>
<p style="color:#6b7280;font-size:13px;">— {{recruiter_name}}, {_COMPANY}</p>
<p style="color:#9ca3af;font-size:11px;"><a href="{{optout_link}}"
   style="color:#9ca3af;">Unsubscribe from these emails</a></p>
""",
    },
}

_SCHEDULE = [
    {"day": 0, "template_key": "day0", "due_after_days": 0},
    {"day": 3, "template_key": "day3", "due_after_days": 3},
    {"day": 7, "template_key": "day7", "due_after_days": 7},
]


# ── Rendering ──────────────────────────────────────────────────────
def _render(template_key: str, ctx: Dict[str, Any]) -> Dict[str, str]:
    """Render subject+body for a template key. Jinja2 if available, else
    literal {{token}} substitution (values are ours, not user-controlled,
    so no injection surface beyond the profile fields we own)."""
    spec = _TEMPLATES[template_key]
    jinja2 = import_optional("jinja2")
    if jinja2 is not None:
        env_ctx = {"_COMPANY": _COMPANY, **ctx}
        env = jinja2.Environment(autoescape=False)
        subject = env.from_string(spec["subject"]).render(env_ctx)
        body = env.from_string(spec["body"]).render(env_ctx)
    else:
        subject, body = spec["subject"], spec["body"]
        for k, v in ctx.items():
            subject = subject.replace("{{" + k + "}}", str(v or ""))
            body = body.replace("{{" + k + "}}", str(v or ""))
        body = body.replace("{_COMPANY}", _COMPANY)
        # Jinja used ``_COMPANY`` inside templates; the fallback needs the
        # literal substitution handled above.
    return {"subject": subject.strip(), "body": body}


def _first_name(full_name: Optional[str]) -> str:
    name = (full_name or "").strip()
    return name.split()[0] if name else "there"


# ── Eligibility ────────────────────────────────────────────────────
async def _consent_allows(db, email: str) -> bool:
    st = await consent_status(db, email)
    if st.get("consented"):
        return "outreach" in (st.get("purposes") or [])
    if st.get("email") and not st.get("consented"):
        # a record exists but is revoked / not active → not consented
        return False
    # No consent record → consented-by-UI-opt-in (interest_status implies
    # the candidate explicitly opted in through the platform UI).
    return True


def _eligible_query() -> Dict[str, Any]:
    return {
        "is_active": True,
        "interest_status": {"$in": ["INTERESTED", "interested"]},
        "outreach_opt_out": {"$ne": True},
        "email": {"$exists": True, "$ne": None},
    }


async def _recipient_eligible(db, profile: Dict[str, Any]) -> bool:
    email = normalize_email((pii_fields(profile) or {}).get("email") or profile.get("email"))
    if not email:
        return False
    return await _consent_allows(db, email)


# ── Tracking URLs (consumed by the router endpoints) ─────────────
def track_url(db_host, token: str) -> str:
    base = frontend_base_url()
    return f"{base}/api/admin/talent-pool/outreach/track/{token}/open"


def click_url(token: str, cta: str) -> str:
    base = frontend_base_url()
    return f"{base}/api/admin/talent-pool/outreach/track/{token}/click?url={quote(cta, safe='')}"


def _cta_for(db, campaign: Dict[str, Any]) -> str:
    base = frontend_base_url()
    ref = campaign.get("opening_ref")
    return f"{base}/careers?opening={quote(ref or '', safe='')}" if ref else f"{base}/careers"


# ── Campaign lifecycle ────────────────────────────────────────────
async def create_drip_campaign(
    db, actor: str, name: str, opening_ref: Optional[str] = None
) -> Dict[str, Any]:
    """Snapshot all currently-eligible INTERESTED candidates into a running
    day-0/3/7 campaign. Returns {campaign_id, recipients, schedule}."""
    campaign_id = f"oc_{uuid.uuid4().hex[:12]}"
    now = now_utc()
    recipients: List[str] = []
    async for p in db.talent_pool.find(_eligible_query()):
        if await _recipient_eligible(db, p):
            recipients.append(str(p.get("id") or p["_id"]))
    await db.outreach_campaigns.insert_one({
        "id": campaign_id,
        "name": name,
        "created_at": now,
        "created_by": actor,
        "opening_ref": opening_ref,
        "status": "running",
        "schedule": [dict(s) for s in _SCHEDULE],
        "recipients": recipients,
        "stats": {"sent": 0, "opened": 0, "clicked": 0, "replied": 0, "opted_out": 0},
    })
    await log_activity(db, actor, "Outreach", object_id=campaign_id,
                       object_type="OutreachCampaign",
                       summary=f"Campaign '{name}' created with {len(recipients)} recipients",
                       collection="outreach_campaigns")
    await agent_run_log(db, "tp21_outreach", "create_campaign", detail={
        "campaign_id": campaign_id, "recipients": len(recipients)})
    return {"campaign_id": campaign_id, "recipients": len(recipients),
            "schedule": [s["template_key"] for s in _SCHEDULE]}


async def run_due_drips(db, campaign_id: Optional[str] = None) -> Dict[str, Any]:
    """Send every day-step that is due. Due rule for step `day D`:
    campaign is ≥ D days old (now - created_at ≥ D*86400s) AND every
    earlier step was already sent to that recipient (sequential) AND the
    recipient hasn't opted out / replied. Dedupe: one outreach_messages
    row per (campaign, recipient, day); the next step's due check reads
    the previous step's row. Never raises."""
    sent = 0
    skipped = 0
    reasons: Dict[str, int] = {}
    try:
        from core.email import send_email, render_html_email
    except Exception:
        return {"sent": 0, "skipped": 0,
                "reasons": {"email_module_unavailable": 1}}
        # (unreachable — core.email is a house module; guard for isolation tests)

    q: Dict[str, Any] = {"status": "running"}
    if campaign_id:
        q["id"] = campaign_id
    async for campaign in db.outreach_campaigns.find(q):
        now = now_utc()
        age_days = 0.0 if campaign.get("created_at") is None else (now - campaign["created_at"]).total_seconds() / 86400
        cta = _cta_for(db, campaign)
        for pid in campaign.get("recipients") or []:
            try:
                profile = await db.talent_pool.find_one(
                    {"$or": [{"id": pid}, {"_id": pid}]})
                if not profile or not profile.get("is_active"):
                    skipped += 1
                    reasons["profile_inactive"] = reasons.get("profile_inactive", 0) + 1
                    continue
                # Which step is due? The smallest un-sent step whose day is
                # within the campaign age, with all earlier steps already sent.
                msg_by_day = await db.outreach_messages.find(
                    {"campaign_id": campaign["id"], "profile_id": pid}
                ).to_list(50)
                sent_days = {m["day"] for m in msg_by_day}
                due_step = None
                for step in campaign.get("schedule") or _SCHEDULE:
                    d = step["day"]
                    if d in sent_days:
                        continue
                    # sequential: all steps with smaller day must be sent
                    if any(s2["day"] < d and s2["day"] not in sent_days
                           for s2 in campaign.get("schedule") or _SCHEDULE):
                        break
                    if age_days >= step.get("due_after_days", d):
                        due_step = step
                        break
                    break  # campaign too young for this step; later ones are too
                if due_step is None:
                    continue  # not yet due (or nothing left) — not a "skip"
                # Opt-out / reply / consent gates
                msgs = {m["day"]: m for m in msg_by_day}
                if any(m.get("status") == "opted_out" for m in msg_by_day.values()):
                    skipped += 1
                    reasons["opted_out"] = reasons.get("opted_out", 0) + 1
                    continue
                if any(m.get("replied_at") for m in msg_by_day.values()):
                    skipped += 1
                    reasons["replied"] = reasons.get("replied", 0) + 1
                    continue
                email = normalize_email(
                    (pii_fields(profile) or {}).get("email") or profile.get("email"))
                if not email:
                    skipped += 1
                    reasons["no_email"] = reasons.get("no_email", 0) + 1
                    continue
                if not await _consent_allows(db, email):
                    skipped += 1
                    reasons["consent_revoked"] = reasons.get("consent_revoked", 0) + 1
                    continue
                token = uuid.uuid4().hex
                ctx = {
                    "candidate_first_name": _first_name(profile.get("full_name")),
                    "candidate_role": profile.get("current_role") or "your role",
                    "opening_title": campaign.get("opening_ref") or "our team",
                    "recruiter_name": campaign.get("created_by") or "The AXISS Team",
                    "company": _COMPANY,
                    "cta_link": cta,
                    "optout_link": f"{frontend_base_url()}/api/admin/talent-pool/outreach/optout/{token}",
                }
                rendered = _render(due_step["template_key"], ctx)
                body_html = render_html_email(rendered["body"])
                ok = await send_email(email, rendered["subject"], body_html)
                if ok:
                    await db.outreach_messages.insert_one({
                        "id": f"om_{token}",
                        "token": token,
                        "campaign_id": campaign["id"],
                        "profile_id": pid,
                        "day": due_step["day"],
                        "template_key": due_step["template_key"],
                        "email": email,
                        "subject": rendered["subject"],
                        "status": "sent",
                        "sent_at": now_utc(),
                        "open_events": [],
                        "click_events": [],
                        "replied_at": None,
                    })
                    await db.outreach_campaigns.update_one(
                        {"id": campaign["id"]},
                        {"$inc": {"stats.sent": 1}})
                    await log_activity(db, "tp21_outreach", "Outreach",
                                       object_id=pid,
                                       summary=f"Day-{due_step['day']} drip sent to {email}",
                                       collection="outreach_campaigns")
                    sent += 1
                else:
                    await log_activity(db, "tp21_outreach", "Outreach",
                                       object_id=pid,
                                       summary=f"Day-{due_step['day']} drip BOUNCED for {email}")
                    skipped += 1
                    reasons["bounced"] = reasons.get("bounced", 0) + 1
            except Exception as e:  # never take down the scheduler
                skipped += 1
                reasons["error"] = reasons.get("error", 0) + 1
                await log_activity(db, "tp21_outreach", "Outreach", object_id=str(pid),
                                   summary=f"drip error: {e}")
    await agent_run_log(db, "tp21_outreach", "run_due_drips",
                       detail={"sent": sent, "skipped": skipped},
                       status="SUCCESS")
    return {"sent": sent, "skipped": skipped, "reasons": reasons}


# ── Tracking writers (router endpoints call these) ───────────────
async def track_open(db, token: str) -> Dict[str, Any]:
    m = await db.outreach_messages.find_one({"token": token})
    if not m:
        return {"found": False}
    now = now_utc()
    await db.outreach_messages.update_one(
        {"token": token},
        {"$push": {"open_events": now}, "$setOnInsert": {"opened_at": now},
         "$set": {"status": m.get("status") or "sent"}})
    # mark opened once on the campaign + profile side
    if not m.get("opened_at"):
        await db.outreach_campaigns.update_one(
            {"id": m.get("campaign_id")}, {"$inc": {"stats.opened": 1}})
    return {"found": True, "first_open": not m.get("opened_at")}


async def track_click(db, token: str, url: str) -> Dict[str, Any]:
    m = await db.outreach_messages.find_one({"token": token})
    if not m:
        return {"found": False, "redirect": url}
    now = now_utc()
    await db.outreach_messages.update_one(
        {"token": token},
        {"$push": {"click_events": {"url": url, "at": now}},
         "$set": {"clicked_at": now}})
    if not m.get("clicked_at"):
        await db.outreach_campaigns.update_one(
            {"id": m.get("campaign_id")}, {"$inc": {"stats.clicked": 1}})
    return {"found": True, "redirect": url}


async def record_reply(db, token: str, direction: str = "inbound") -> Dict[str, Any]:
    """An inbound reply marks the recipient replied → subsequent drips stop
    for this (campaign, recipient) pair (the due-step loop skips replied)."""
    m = await db.outreach_messages.find_one({"token": token})
    if not m:
        return {"found": False}
    now = now_utc()
    await db.outreach_messages.update_one(
        {"_id": m["_id"]}, {"$set": {"replied_at": now, "reply_direction": direction}})
    if direction == "inbound" and not m.get("replied_at"):
        await db.outreach_campaigns.update_one(
            {"id": m.get("campaign_id")}, {"$inc": {"stats.replied": 1}})
    await log_activity(db, "tp21_outreach", "Outreach", object_id=m.get("profile_id"),
                       summary=f"Reply recorded ({direction})")
    return {"found": True, "profile_id": m.get("profile_id")}


async def record_optout(db, token_or_profile_id: str, email: Optional[str] = None) -> Dict[str, Any]:
    """STOP for this recipient: mark message(s) opted_out, set
    talent_pool.outreach_opt_out=True, and revoke consent if the email is known."""
    result: Dict[str, Any] = {"ok": True, "opted_out": False}
    m = None
    if token_or_profile_id:
        m = await db.outreach_messages.find_one({"token": token_or_profile_id})
        if not m:
            m = await db.outreach_messages.find_one({"profile_id": token_or_profile_id})
    pid = m.get("profile_id") if m else (None if email else token_or_profile_id)
    if email:
        email = normalize_email(email)
    elif m:
        email = m.get("email")
    if pid:
        prof = await db.talent_pool.find_one({"$or": [{"id": pid}, {"_id": pid}]})
        if prof:
            email = email or normalize_email(prof.get("email"))
            await db.talent_pool.update_one(
                {"_id": prof["_id"]},
                {"$set": {"outreach_opt_out": True, "updated_at": now_utc()}})
            result["profile_id"] = str(prof.get("id") or prof["_id"])
    if m:
        await db.outreach_messages.update_one(
            {"_id": m["_id"]}, {"$set": {"status": "opted_out"}})
        await db.outreach_campaigns.update_one(
            {"id": m.get("campaign_id")}, {"$inc": {"stats.opted_out": 1}})
    if email:
        await revoke_consent(db, email, reason="outreach opt-out (TP21)")
        result["email"] = email
        result["consent_revoked"] = True
    result["opted_out"] = True
    await log_activity(db, "tp21_outreach", "Outreach", object_id=str(pid or email or token_or_profile_id),
                       summary="Recipient opted out of drips")
    await agent_run_log(db, "tp21_outreach", "record_optout",
                       detail={"profile": pid, "email": email})
    return result


# ── Reporting ──────────────────────────────────────────────────────
async def campaign_stats(db, campaign_id: str) -> Dict[str, Any]:
    c = await db.outreach_campaigns.find_one({"id": campaign_id})
    if not c:
        return {"found": False}
    stats = c.get("stats") or {}
    s = stats.get("sent", 0)
    o = stats.get("opened", 0)
    k = stats.get("clicked", 0)
    return {
        "found": True,
        "campaign_id": campaign_id,
        "name": c.get("name"),
        "status": c.get("status"),
        "created_at": c.get("created_at").isoformat() if c.get("created_at") else None,
        "recipients": len(c.get("recipients") or []),
        "sent": s,
        "opened": o,
        "clicked": k,
        "replied": stats.get("replied", 0),
        "opted_out": stats.get("opted_out", 0),
        "open_rate_pct": round(o / s * 100, 1) if s else 0.0,
        "click_rate_pct": round(k / s * 100, 1) if s else 0.0,
    }


async def list_campaigns(db, limit: int = 50) -> Dict[str, Any]:
    docs = await db.outreach_campaigns.find({}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"campaigns": [
        {"id": d.get("id"), "name": d.get("name"), "status": d.get("status"),
         "recipients": len(d.get("recipients") or []), "stats": d.get("stats") or {},
         "created_at": d.get("created_at").isoformat() if d.get("created_at") else None}
        for d in docs]}


# ── Agent facade ──────────────────────────────────────────────────
class TalentOutreachAgent:
    name = "TP21 Email Drips"
    group = "intelligence"
    priority = "P2"

    async def agent_status(self, db) -> Dict[str, Any]:
        active = await db.outreach_campaigns.count_documents({"status": "running"})
        since = now_utc() - timedelta(days=7)
        sent_7d = await db.outreach_messages.count_documents(
            {"sent_at": {"$gte": since}})
        last = await db.scheduler_logs.find_one(
            {"agent": "tp21_outreach", "action": "run_due_drips"},
            sort=[("started_at", -1)])
        return {
            "name": self.name,
            "group": self.group,
            "priority": self.priority,
            "status": "active" if active else "idle",
            "active_campaigns": active,
            "sent_last_7d": sent_7d,
            "est_cost_per_month": "~$0 (SMTP relay already provisioned)",
            "last_run_at": last.get("started_at").isoformat() if last and last.get("started_at") else None,
        }

    # expose module fns on the instance for scheduler uniformity
    create_drip_campaign = staticmethod(create_drip_campaign)
    run_due_drips = staticmethod(run_due_drips)
    track_open = staticmethod(track_open)
    track_click = staticmethod(track_click)
    record_reply = staticmethod(record_reply)
    record_optout = staticmethod(record_optout)
    campaign_stats = staticmethod(campaign_stats)
    list_campaigns = staticmethod(list_campaigns)


# Global singleton
talent_outreach_agent = TalentOutreachAgent()
