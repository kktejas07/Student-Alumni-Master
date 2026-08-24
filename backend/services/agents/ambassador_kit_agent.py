"""
ambassador_kit_agent.py — AI Campus Ambassador Marketing Kit Generator
Generates promotional assets for ECHO 2026 Campus Ambassadors:
  1. Social Media / LinkedIn Promotional Posts
  2. WhatsApp Group Broadcast Messages with Emoji Formatting
  3. College Campus Poster Headings & Elevator Pitch Talking Points
  4. Custom Referral Link Integration
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class AmbassadorKitRequest(BaseModel):
    ambassador_name: str
    college_name: str
    ambassador_code: Optional[str] = "SA-AMB-2026"
    event_series: Optional[str] = "ECHO 2026 × HackWave 3.0"

class SocialPostVariant(BaseModel):
    platform: str # LinkedIn, Instagram, WhatsApp, Discord
    headline: str
    content: str
    call_to_action: str

class AmbassadorKitResponse(BaseModel):
    ambassador_name: str
    college_name: str
    referral_url: str
    posts: List[SocialPostVariant]
    talking_points: List[str]
    suggested_hashtags: List[str]

class AmbassadorKitAgentService:
    """Creates ready-to-share ambassador promotional toolkits."""

    async def generate_toolkit(self, req: AmbassadorKitRequest) -> AmbassadorKitResponse:
        ref_url = f"https://studentalumni.ai/echo?ref={req.ambassador_code}"

        posts = [
            SocialPostVariant(
                platform="LinkedIn",
                headline=f"🚀 Representing {req.college_name} as an Official Campus Ambassador for {req.event_series}!",
                content=(
                    f"Excited to announce that I'm officially partnering with StudentAlumni as a Campus Ambassador for {req.event_series}! 🏆\n\n"
                    f"Join over 5,000+ top student builders competing for prizes, verifiable certifications, and direct hiring fast-tracks with industry leaders.\n\n"
                    f"👉 Register now using my exclusive college pass: {ref_url}\n\n"
                    f"#StudentAlumni #ECHO2026 #Hackathon #{req.college_name.replace(' ', '')} #TechCareers"
                ),
                call_to_action="Apply via official ambassador link"
            ),
            SocialPostVariant(
                platform="WhatsApp",
                headline="🔥 National Hackathon Alert for our College Students!",
                content=(
                    f"Hey everyone! 👋\n\n"
                    f"Registrations for *{req.event_series}* are now officially OPEN! 💻⚡\n\n"
                    f"✨ *Why participate?*\n"
                    f"• 💰 Huge prize pool & grant tracks\n"
                    f"• 📜 Verifiable certificates backed by StudentAlumni cryptographic registry\n"
                    f"• 🤝 1-on-1 mentorship with senior engineering alumni\n\n"
                    f"🎟️ Claim your spot before slots fill up:\n{ref_url}"
                ),
                call_to_action="Forward to department and tech club groups"
            ),
            SocialPostVariant(
                platform="Discord / Slack",
                headline=f"📢 {req.event_series} Flagship Hackathon Announcement",
                content=(
                    f"@everyone Looking for team members for **{req.event_series}**! 🚀\n"
                    f"Whether you build frontend, backend, or AI systems, this is the biggest student event of the year.\n"
                    f"Join our college squad here: <{ref_url}>"
                ),
                call_to_action="Drop your GitHub/portfolio in the team formation channel"
            )
        ]

        return AmbassadorKitResponse(
            ambassador_name=req.ambassador_name,
            college_name=req.college_name,
            referral_url=ref_url,
            posts=posts,
            talking_points=[
                f"Highlight that {req.event_series} certificates feature cryptographic verification codes.",
                "Emphasize the direct interview fast-track opportunities with hiring partners.",
                "Mention that registration is free for affiliated partner colleges."
            ],
            suggested_hashtags=["#StudentAlumni", "#ECHO2026", "#HackWave", "#CampusAmbassador", "#CodeTheFuture"]
        )

# Global singleton
ambassador_kit_agent = AmbassadorKitAgentService()
