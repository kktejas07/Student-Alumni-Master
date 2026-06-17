"""
LinkedIn Profile Sync — fetch profile data from LinkedIn API or Proxycurl.

Priority:
  1. Proxycurl (if installed in marketplace) — richer data, simpler auth
  2. LinkedIn API OAuth 2.0 (if installed in marketplace)
  3. Platform settings env vars (LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET)

Usage:
  - enrich_profile(linkedin_url)  → dict of enriched fields
  - enrich_profiles_batch(docs)   → list of (doc, enriched_data)
"""

import os
import logging
from typing import Any, Dict, List, Optional, Tuple

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger("linkedin_sync")

_MONGO_URL = os.getenv("MONGO_URL") or "mongodb://localhost:27017"
_DB_NAME   = os.getenv("DB_NAME") or "studentalumniadmin"
_client    = AsyncIOMotorClient(_MONGO_URL)
_db        = _client[_DB_NAME]


async def _get_proxycurl_key() -> Optional[str]:
    """Check if Proxycurl is installed and return the API key."""
    doc = await _db.installed_tools.find_one({
        "tool_id": "proxycurl",
        "status": "connected",
    })
    if doc and doc.get("credentials", {}).get("api_key"):
        return doc["credentials"]["api_key"]
    return None


async def _get_linkedin_api_creds() -> Dict[str, str]:
    """Check if LinkedIn API is installed and return client_id + client_secret."""
    doc = await _db.installed_tools.find_one({
        "tool_id": "linkedin",
        "status": "connected",
    })
    if doc:
        creds = doc.get("credentials") or {}
        return {
            "client_id": creds.get("client_id", ""),
            "client_secret": creds.get("client_secret", ""),
        }
    return {"client_id": "", "client_secret": ""}


def _extract_username(url: str) -> Optional[str]:
    """Extract LinkedIn username from URL like linkedin.com/in/username"""
    if not url:
        return None
    url = url.strip().rstrip("/")
    for part in url.split("/"):
        if part and part not in ("in", "www.linkedin.com", "linkedin.com", "https:", "http:"):
            if not part.startswith("www.") and not part.endswith(".com"):
                return part
    return None


async def enrich_profile_via_proxycurl(linkedin_url: str, api_key: str) -> Optional[Dict[str, Any]]:
    """Fetch LinkedIn profile data via Proxycurl API."""
    username = _extract_username(linkedin_url)
    if not username:
        logger.warning(f"Could not extract username from {linkedin_url}")
        return None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://nubela.co/proxycurl/api/v2/linkedin",
                params={"linkedin_profile_url": linkedin_url, "use_cache": "if-present"},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if not resp.is_success:
                logger.warning(f"Proxycurl returned {resp.status_code} for {linkedin_url}")
                return None
            data = resp.json()
            return {
                "headline": data.get("headline") or data.get("occupation"),
                "full_name": data.get("full_name"),
                "location": (data.get("country_full_name") or "").strip(),
                "skills": [s.strip() for s in (data.get("skills") or [])],
                "current_company": next(
                    (exp.get("company") for exp in (data.get("experiences") or [])
                     if not exp.get("ends_at")),
                    None,
                ),
                "current_role": next(
                    (exp.get("title") for exp in (data.get("experiences") or [])
                     if not exp.get("ends_at")),
                    None,
                ),
                "experience_years": len(data.get("experiences") or []),
                "education": next(
                    (edu.get("school") for edu in (data.get("education") or [])),
                    None,
                ),
                "photo_url": data.get("profile_pic_url"),
                "bio": data.get("summary"),
            }
    except Exception as e:
        logger.warning(f"Proxycurl error for {linkedin_url}: {e}")
        return None


async def enrich_profile_via_linkedin_api(linkedin_url: str, client_id: str, client_secret: str) -> Optional[Dict[str, Any]]:
    """Fetch profile via LinkedIn API OAuth 2.0. Returns basic profile fields.
    NOTE: This requires an access token which needs OAuth user authorization.
    For unauthenticated use, prefer Proxycurl."""
    try:
        # LinkedIn API requires an access token. We attempt to get one
        # via client_credentials grant (limited scope for r_liteprofile).
        async with httpx.AsyncClient(timeout=15) as client:
            token_resp = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "scope": "r_liteprofile r_emailaddress",
                },
            )
            if not token_resp.is_success:
                logger.warning(f"LinkedIn token fetch failed: {token_resp.status_code}")
                return None

            access_token = token_resp.json().get("access_token")
            if not access_token:
                return None

            username = _extract_username(linkedin_url)
            if not username:
                return None

            # Fetch profile (NOTE: LinkedIn v2 /me requires the user's own token,
            # client_credentials doesn't give profile access without member auth.
            # This is a best-effort; Proxycurl is preferred.)
            profile_resp = await client.get(
                f"https://api.linkedin.com/v2/people/(id:{username})",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if profile_resp.is_success:
                data = profile_resp.json()
                return {
                    "headline": data.get("headline"),
                    "full_name": f"{data.get('localizedFirstName', '')} {data.get('localizedLastName', '')}".strip(),
                    "photo_url": data.get("profilePicture", {}).get("displayImage~", {}).get("elements", [{}])[0].get("identifiers", [{}])[0].get("identifier") if data.get("profilePicture") else None,
                }

            return None
    except Exception as e:
        logger.warning(f"LinkedIn API error: {e}")
        return None


async def enrich_profile(linkedin_url: str) -> Optional[Dict[str, Any]]:
    """Fetch enriched profile data using best available source."""
    if not linkedin_url:
        return None

    # 1. Try Proxycurl first (best data)
    proxycurl_key = await _get_proxycurl_key()
    if proxycurl_key:
        result = await enrich_profile_via_proxycurl(linkedin_url, proxycurl_key)
        if result:
            return result

    # 2. Try LinkedIn API
    linkedin_creds = await _get_linkedin_api_creds()
    if linkedin_creds.get("client_id"):
        result = await enrich_profile_via_linkedin_api(
            linkedin_url,
            linkedin_creds["client_id"],
            linkedin_creds["client_secret"],
        )
        if result:
            return result

    return None


async def enrich_profiles_batch(profiles: List[dict]) -> List[Tuple[dict, Optional[Dict[str, Any]]]]:
    """Batch enrich multiple talent pool profiles with LinkedIn data."""
    results = []
    for profile in profiles:
        linkedin_url = profile.get("linkedin_url")
        if linkedin_url:
            data = await enrich_profile(linkedin_url)
            results.append((profile, data))
        else:
            results.append((profile, None))
    return results
