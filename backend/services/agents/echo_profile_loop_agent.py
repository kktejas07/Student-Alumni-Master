"""
echo_profile_loop_agent.py — ECHO Showcase SA Account & 100% Profile Completion Autonomous Loop Agent.

Autonomous Background Agent:
  1. Scans ECHO showcase registrants.
  2. Evaluates SA account ownership & profile completion (using compute_profile_completion).
  3. Dispatches personalized multi-channel reminders (Email + WhatsApp/SMS) to registrants
     who either lack an SA account or have an incomplete profile (<100%).
  4. Runs both on-demand via API triggers and continuously as a background loop worker.
"""

from __future__ import annotations
import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import quote

from core.db import db
from core.email import send_email, render_html_email
from core.whatsapp import send_wa_message
from services.profile_service import compute_profile_completion

logger = logging.getLogger("echo_profile_loop_agent")


class EchoProfileLoopAgent:
    """Autonomous Loop Agent for Echo showcase registrants profile completion & account activation."""

    def __init__(self):
        self._is_running = False
        self._loop_task: Optional[asyncio.Task] = None
        self._last_run_at: Optional[str] = None
        self._last_run_stats: Dict[str, Any] = {}
        self._total_cycles: int = 0

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    async def execute_cycle(
        self,
        slug: Optional[str] = None,
        target_group: str = "all_incomplete",  # "no_account", "incomplete_profile", "all_incomplete"
        channel: str = "both",  # "email", "whatsapp", "both"
    ) -> Dict[str, Any]:
        """Execute one complete agent scanning & reminder cycle."""
        logger.info(f"🤖 [ECHO PROFILE AGENT] Starting execution cycle (target={target_group}, channel={channel}, slug={slug})...")
        start_time = datetime.now(timezone.utc)
        
        query: Dict[str, Any] = {}
        if slug:
            query["slug"] = slug

        regs = await db.echo_registrations.find(query).to_list(20000)
        if not regs:
            return {
                "status": "success",
                "message": "No ECHO registrations found for scanning.",
                "processed_count": 0,
                "emails_sent": 0,
                "whatsapp_sent": 0,
                "cycle_time_seconds": 0.0,
            }

        # Collect unique emails and phones for batch SA user lookup
        all_emails = list({r.get("email").lower().strip() for r in regs if r.get("email")})
        all_phones = list({r.get("phone").strip() for r in regs if r.get("phone")})

        user_map: Dict[str, dict] = {}
        if all_emails or all_phones:
            u_or = []
            if all_emails:
                u_or.append({"email": {"$in": all_emails}})
            if all_phones:
                u_or.append({"phone": {"$in": all_phones}})
            
            async for u in db.users.find({"$or": u_or}):
                comp = compute_profile_completion(u)
                u_info = {
                    "user_id": str(u.get("_id")),
                    "sa_id": u.get("sa_id") or "",
                    "email": u.get("email"),
                    "phone": u.get("phone"),
                    "full_name": u.get("full_name"),
                    "profile_completion_pct": comp.get("percentage", 0),
                    "is_100": comp.get("percentage", 0) >= 100,
                    "missing_items": [item["label"] for item in comp.get("items", []) if not item["done"]],
                }
                if u.get("email"):
                    user_map[u.get("email").lower().strip()] = u_info
                if u.get("phone"):
                    user_map[u.get("phone").strip()] = u_info

        frontend_url = (os.environ.get("FRONTEND_URL") or "https://studentalumni.ai").strip().rstrip("/")
        emails_sent = 0
        wa_sent = 0
        processed_count = 0
        logs: List[str] = []

        for reg in regs:
            email = (reg.get("email") or "").lower().strip()
            phone = (reg.get("phone") or "").strip()
            name = (reg.get("full_name") or "").strip() or "ECHO Participant"
            showcase_title = reg.get("showcase_title") or "ECHO Showcase Event"

            sa_user = user_map.get(email) or user_map.get(phone)
            has_account = bool(sa_user or reg.get("user_id"))
            pct = sa_user.get("profile_completion_pct", 0) if sa_user else 0

            # Filter target group
            if target_group == "no_account" and has_account:
                continue
            elif target_group == "incomplete_profile" and (not has_account or pct >= 100):
                continue
            elif target_group == "all_incomplete" and (has_account and pct >= 100):
                continue
            elif target_group == "complete_100_dispatch" and (not has_account or pct < 100):
                continue

            processed_count += 1

            if has_account and pct >= 100:
                # Auto-issue and deliver all 3 certificates (Built by Sunset, Hackwave 3.0, Cyber Conclave)
                # Per-certificate individual emails (1 email per cert — scales to 1..N).
                from echo_showcase import issue_3_echo_certificates
                certs = await issue_3_echo_certificates(db, reg)

                ordered = [
                    ("built_by_sunset", "Built by Sunset — Project Build Certificate"),
                    ("hackwave_participation", f"Certificate of Participation — {showcase_title}"),
                    ("cyber_conclave", "Cyber Conclave — Professional Certificate"),
                ]
                per_cert_status: dict = {}
                now_iso_inner = self._now_iso()
                for i, (key, title) in enumerate(ordered, start=1):
                    c = certs.get(key, {})
                    code = c.get("code", "")
                    verify_url = c.get("verify_url", f"{frontend_url}/certificates/verify")
                    subject = f"🎓 {title} — {code} ({i} of {len(ordered)})"
                    html = f"""
                    <div style="font-family: 'Outfit', Arial, sans-serif; padding: 28px; background: #08080F; color: #F4F4FA; border-radius: 18px; border: 1px solid #1F1F30;">
                      <div style="color: #10B981; font-weight: 800; font-size: 20px; margin-bottom: 8px;">100% Profile Completion Verified ✓ ({i} of {len(ordered)})</div>
                      <h2 style="color: #FFF; margin-top: 0; font-size: 22px;">{title}</h2>
                      <p>Hello <strong>{name}</strong>,</p>
                      <p>Your official certificate for <strong>{showcase_title}</strong> is ready. Verification code: <strong>{code}</strong></p>
                      <div style="margin: 20px 0;"><a href="{verify_url}" style="background: linear-gradient(135deg, #7C5CFC, #5B3FD9); color: #FFF; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold;">Verify & Download →</a></div>
                    </div>
                    """
                    sent = False
                    err = None
                    if channel in ("email", "both") and email:
                        try:
                            sent = bool(await send_email(email, subject, render_html_email(html)))
                            if sent:
                                emails_sent += 1
                            else:
                                err = "provider rejected — see email_failures"
                        except Exception as e:
                            err = str(e)[:200]
                            logger.warning(f"Per-cert email failed ({code}): {e}")
                    per_cert_status[key] = {"email_sent": sent, "email_error": err, "code": code}
                    certs[key]["email_sent"] = sent
                try:
                    reg_filter = {"_id": reg["_id"]} if "_id" in reg else {"id": reg.get("id")}
                    await db.echo_registrations.update_one(
                        reg_filter,
                        {"$set": {"certificates_3_status": certs, "cert_email_status": per_cert_status,
                                  "cert_email_updated_at": now_iso_inner}},
                    )
                except Exception as e:
                    logger.warning(f"Failed to persist certificate email status for registration {reg.get('_id')}: {e}")

                part_url = certs.get("hackwave_participation", {}).get("verify_url", f"{frontend_url}/certificates/verify")
                sunset_url = certs.get("built_by_sunset", {}).get("verify_url", f"{frontend_url}/certificates/verify")
                cyber_url = certs.get("cyber_conclave", {}).get("verify_url", f"{frontend_url}/certificates/verify")

                email_subject = f"🎓 3 Official Certificates Delivered — {showcase_title}"
                email_html = ""  # individual per-cert emails already sent above
                wa_text = f"🎓 *3 Certificates Delivered!*\n\nHi {name},\nYour 100% profile score has unlocked your 3 official certificates for *{showcase_title}*:\n\n1. Built by Sunset: {sunset_url}\n2. Hackwave 3.0 Participation: {part_url}\n3. Cyber Conclave: {cyber_url}"

            elif not has_account:
                register_link = f"{frontend_url}/auth/register?email={quote(email)}&name={quote(name)}"
                email_subject = f"⚡ Claim your 3 Certificates for {showcase_title}"
                email_html = f"""
                <div style="font-family: 'Outfit', Arial, sans-serif; padding: 28px; background: #08080F; color: #F4F4FA; border-radius: 18px; border: 1px solid #1F1F30;">
                  <div style="color: #7C5CFC; font-weight: 800; font-size: 20px; margin-bottom: 8px;">StudentAlumni × ECHO</div>
                  <h2 style="color: #FFF; margin-top: 0; font-size: 22px;">Create Your SA Account to Claim 3 Digital Certificates</h2>
                  <p>Hello <strong>{name}</strong>,</p>
                  <p>You registered for <strong>{showcase_title}</strong> on ECHO! Create your account and complete 100% of your profile to unlock all 3 certificates (Built by Sunset, Participation, Cyber Conclave):</p>
                  <div style="margin: 28px 0;">
                    <a href="{register_link}" style="background: linear-gradient(135deg, #7C5CFC, #5B3FD9); color: #FFF; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 15px;">Create SA Account & Claim 3 Certificates →</a>
                  </div>
                  <p style="font-size: 12px; color: #7E7E92; border-top: 1px solid #1F1F30; padding-top: 16px;">StudentAlumni Network · Connecting Students, Alumni & Mentors</p>
                </div>
                """
                wa_text = f"🎓 *StudentAlumni Account Notice*\n\nHi {name},\nYou are registered for *{showcase_title}*!\nCreate your StudentAlumni account to get 100% profile rewards & 3 digital certificates:\n\n{register_link}"
            else:
                missing_str = ", ".join(sa_user.get("missing_items", [])) or "complete bio, photo, and skills"
                profile_link = f"{frontend_url}/profile"
                email_subject = f"🚀 Complete your SA Profile to 100% — Currently at {pct}%"
                email_html = f"""
                <div style="font-family: 'Outfit', Arial, sans-serif; padding: 28px; background: #08080F; color: #F4F4FA; border-radius: 18px; border: 1px solid #1F1F30;">
                  <div style="color: #10B981; font-weight: 800; font-size: 20px; margin-bottom: 8px;">100% Profile Challenge</div>
                  <h2 style="color: #FFF; margin-top: 0; font-size: 22px;">Your SA Profile is {pct}% Complete</h2>
                  <p>Hello <strong>{name}</strong>,</p>
                  <p>Your StudentAlumni profile is currently at <strong>{pct}% completion</strong>. Complete 100% of your profile to unlock all 3 certificates (Built by Sunset, Hackwave 3.0, Cyber Conclave)!</p>
                  <div style="padding: 16px; background: #14141F; border-radius: 12px; margin: 16px 0; border: 1px solid #292940;">
                    <p style="margin: 0; font-weight: bold; color: #F5B342;">Remaining Items to Reach 100%:</p>
                    <p style="margin: 4px 0 0 0; color: #9095A8; font-size: 13.5px;">{missing_str}</p>
                  </div>
                  <div style="margin: 24px 0;">
                    <a href="{profile_link}" style="background: linear-gradient(135deg, #10B981, #059669); color: #FFF; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 15px;">Complete Profile to 100% →</a>
                  </div>
                  <p style="font-size: 12px; color: #7E7E92; border-top: 1px solid #1F1F30; padding-top: 16px;">StudentAlumni Platform</p>
                </div>
                """
                wa_text = f"🚀 *100% Profile Reminder*\n\nHi {name},\nYour StudentAlumni profile is currently at *{pct}%*.\nComplete 100% of your profile ({missing_str}) to claim your 3 ECHO certificates:\n\n{profile_link}"

            # Dispatch Email (skipped for 100% branch — per-cert emails already sent above)
            if email_html and channel in ("email", "both") and email:
                try:
                    await send_email(email, email_subject, render_html_email(email_html))
                    emails_sent += 1
                except Exception as e:
                    logger.warning(f"Failed to send email to {email}: {e}")

            # Dispatch WhatsApp / Phone SMS
            if channel in ("whatsapp", "both") and phone:
                try:
                    await send_wa_message(phone, wa_text)
                    wa_sent += 1
                except Exception as e:
                    logger.warning(f"Failed to send WhatsApp to {phone}: {e}")

            # Mark reminder history
            now_iso = self._now_iso()
            reg_filter = {"_id": reg["_id"]} if "_id" in reg else {"id": reg.get("id")}
            await db.echo_registrations.update_one(
                reg_filter,
                {
                    "$set": {"last_profile_reminder_at": now_iso},
                    "$inc": {"profile_reminder_count": 1},
                }
            )
            logs.append(f"Reminded {email} ({'No Account' if not has_account else f'{pct}% Profile'})")

        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
        self._last_run_at = self._now_iso()
        self._total_cycles += 1
        self._last_run_stats = {
            "executed_at": self._last_run_at,
            "processed_count": processed_count,
            "emails_sent": emails_sent,
            "whatsapp_sent": wa_sent,
            "cycle_time_seconds": round(elapsed, 2),
            "target_group": target_group,
            "channel": channel,
        }

        logger.info(f"✅ [ECHO PROFILE AGENT] Cycle completed: {processed_count} processed, {emails_sent} emails, {wa_sent} WA in {elapsed:.2f}s.")
        return {
            "status": "success",
            "message": f"Dispatched profile reminders to {processed_count} registrants.",
            "processed_count": processed_count,
            "emails_sent": emails_sent,
            "whatsapp_sent": wa_sent,
            "cycle_time_seconds": round(elapsed, 2),
            "logs": logs[:50],
        }

    async def _background_loop_worker(self, interval_seconds: int = 3600):
        """Continuous background loop worker."""
        logger.info(f"🔄 [ECHO PROFILE AGENT LOOP] Started background worker (interval={interval_seconds}s)")
        while self._is_running:
            try:
                await self.execute_cycle(target_group="all_incomplete", channel="both")
            except Exception as e:
                logger.error(f"💥 [ECHO PROFILE AGENT LOOP ERROR] {e}", exc_info=True)
            await asyncio.sleep(interval_seconds)

    def start_background_loop(self, interval_seconds: int = 3600):
        """Start the continuous background loop task if not already running."""
        if self._is_running:
            logger.info("Loop agent is already running.")
            return False
        self._is_running = True
        self._loop_task = asyncio.create_task(self._background_loop_worker(interval_seconds))
        return True

    def stop_background_loop(self):
        """Stop the background loop task."""
        if not self._is_running:
            return False
        self._is_running = False
        if self._loop_task:
            self._loop_task.cancel()
            self._loop_task = None
        return True

    def get_status(self) -> Dict[str, Any]:
        """Return agent health & cycle status."""
        return {
            "agent_name": "EchoProfileLoopAgent",
            "is_running": self._is_running,
            "total_cycles_executed": self._total_cycles,
            "last_run_at": self._last_run_at,
            "last_run_stats": self._last_run_stats,
        }


# Global Singleton Instance
echo_profile_loop_agent = EchoProfileLoopAgent()
