"""
PostHog Insights API proxy.
Keeps POSTHOG_PERSONAL_API_KEY server-side, proxies queries from the frontend.
"""
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
import httpx

from core.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

POSTHOG_KEY = os.environ.get("POSTHOG_PERSONAL_API_KEY", "")
POSTHOG_HOST = os.environ.get("POSTHOG_HOST", "https://us.i.posthog.com")
POSTHOG_PROJECT_ID = os.environ.get("POSTHOG_PROJECT_ID", "")


@router.get("/admin/posthog/status")
async def posthog_status(user: dict = Depends(get_current_user)):
    """Check if PostHog is configured."""
    role = (user.get("role") or "").lower()
    if role not in ("admin", "super_admin", "superadmin"):
        raise HTTPException(403, "Admin access required")
    return {
        "configured": bool(POSTHOG_KEY and POSTHOG_PROJECT_ID),
        "host": POSTHOG_HOST if POSTHOG_KEY else None,
    }


@router.post("/admin/posthog/insights")
async def posthog_insights_proxy(request: Request, user: dict = Depends(get_current_user)):
    """Proxy a PostHog Insights API query."""
    role = (user.get("role") or "").lower()
    if role not in ("admin", "super_admin", "superadmin"):
        raise HTTPException(403, "Admin access required")
    if not POSTHOG_KEY:
        raise HTTPException(503, "PostHog not configured. Set POSTHOG_PERSONAL_API_KEY.")
    if not POSTHOG_PROJECT_ID:
        raise HTTPException(503, "PostHog project ID not configured. Set POSTHOG_PROJECT_ID.")

    body = await request.json()
    url = f"{POSTHOG_HOST}/api/projects/{POSTHOG_PROJECT_ID}/insights/"
    headers = {"Authorization": f"Bearer {POSTHOG_KEY}", "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=body, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(resp.status_code, f"PostHog API error: {resp.text[:300]}")
        return resp.json()
    except httpx.TimeoutException:
        raise HTTPException(504, "PostHog API timeout")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PostHog proxy error: {e}")
        raise HTTPException(500, f"PostHog proxy error: {str(e)[:200]}")


@router.post("/admin/posthog/events")
async def posthog_events_proxy(request: Request, user: dict = Depends(get_current_user)):
    """Proxy a PostHog Events API query."""
    role = (user.get("role") or "").lower()
    if role not in ("admin", "super_admin", "superadmin"):
        raise HTTPException(403, "Admin access required")
    if not POSTHOG_KEY or not POSTHOG_PROJECT_ID:
        raise HTTPException(503, "PostHog not configured.")

    body = await request.json()
    url = f"{POSTHOG_HOST}/api/projects/{POSTHOG_PROJECT_ID}/events/"
    headers = {"Authorization": f"Bearer {POSTHOG_KEY}", "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, params=body, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(resp.status_code, f"PostHog API error: {resp.text[:300]}")
        return resp.json()
    except httpx.TimeoutException:
        raise HTTPException(504, "PostHog API timeout")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"PostHog proxy error: {str(e)[:200]}")
