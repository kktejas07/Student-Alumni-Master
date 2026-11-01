"""Enhancement #6 — Email Digest Reports.

Weekly/monthly brand performance summaries sent via Postal/SendGrid/Gmail.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from db import db
from .database import brands_col, leads_col, claims_col, offers_col
from core.email import send_email

logger = logging.getLogger(__name__)

digest_prefs_col = db.la_digest_prefs
fraud_signals_col = db.la_fraud_signals
campus_col = db.la_campus_contacts
pricing_log_col = db.la_pricing_log


def _period_range(period: str) -> tuple[datetime, datetime, datetime, datetime]:
    now = datetime.now(timezone.utc)
    if period == "monthly":
        current_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_start = (current_start - timedelta(days=1)).replace(day=1)
    else:
        weekday = now.weekday()
        current_start = (now - timedelta(days=weekday)).replace(hour=0, minute=0, second=0, microsecond=0)
        prev_start = current_start - timedelta(days=7)
    return prev_start, current_start, current_start, now


async def generate_digest(brand_id: str, period: str = "weekly") -> dict:
    """Compute digest data for a brand over the given period."""
    prev_start, prev_end, cur_start, cur_end = _period_range(period)

    base_match = {"matched_brands": brand_id}
    cur_match = {**base_match, "created_at": {"$gte": cur_start, "$lte": cur_end}}
    prev_match = {**base_match, "created_at": {"$gte": prev_start, "$lt": prev_end}}

    new_leads = await leads_col.count_documents(cur_match)
    prev_leads = await leads_col.count_documents(prev_match)

    hot = await leads_col.count_documents({**cur_match, "temperature": "hot"})
    warm = await leads_col.count_documents({**cur_match, "temperature": "warm"})
    cold = await leads_col.count_documents({**cur_match, "temperature": "cold"})
    low = await leads_col.count_documents({**cur_match, "temperature": "low"})

    converted = await leads_col.count_documents({**cur_match, "status": "converted"})
    prev_converted = await leads_col.count_documents({**prev_match, "status": "converted"})
    conversion_rate = round(converted / new_leads * 100, 1) if new_leads else 0
    prev_conversion_rate = round(prev_converted / prev_leads * 100, 1) if prev_leads else 0

    # Top 5 offers by claims
    claim_match = {"brand_id": brand_id, "claimed_at": {"$gte": cur_start, "$lte": cur_end}}
    top_pipeline = [
        {"$match": claim_match},
        {"$group": {"_id": "$offer_id", "claims": {"$sum": 1}}},
        {"$sort": {"claims": -1}},
        {"$limit": 5},
    ]
    top_offers = []
    async for doc in claims_col.aggregate(top_pipeline):
        offer = await offers_col.find_one({"offer_id": doc["_id"]})
        top_offers.append({
            "offer_id": doc["_id"],
            "title": offer["title"] if offer else "Unknown",
            "claims": doc["claims"],
        })

    total_claims = await claims_col.count_documents(claim_match)

    # Revenue from pricing log
    rev_pipeline = [
        {"$match": {"brand_id": brand_id, "created_at": {"$gte": cur_start, "$lte": cur_end}}},
        {"$group": {"_id": None, "total": {"$sum": "$price_inr"}}},
    ]
    revenue = 0
    async for doc in pricing_log_col.aggregate(rev_pipeline):
        revenue = doc.get("total", 0)

    # Campus contacts
    new_campus = await campus_col.count_documents({
        "created_at": {"$gte": cur_start, "$lte": cur_end},
    })

    # Fraud alerts
    fraud_count = await fraud_signals_col.count_documents({
        "lead_id": {"$in": await _lead_ids_for_brand(brand_id, cur_start, cur_end)},
        "risk_level": {"$in": ["high", "critical"]},
    })

    return {
        "brand_id": brand_id,
        "period": period,
        "period_start": cur_start.isoformat(),
        "period_end": cur_end.isoformat(),
        "new_leads": new_leads,
        "prev_leads": prev_leads,
        "leads_delta_pct": round((new_leads - prev_leads) / prev_leads * 100, 1) if prev_leads else 0,
        "temperature": {"hot": hot, "warm": warm, "cold": cold, "low": low},
        "total_claims": total_claims,
        "top_offers": top_offers,
        "conversion_rate": conversion_rate,
        "prev_conversion_rate": prev_conversion_rate,
        "revenue_inr": round(revenue, 2),
        "new_campus_contacts": new_campus,
        "fraud_alerts": fraud_count,
    }


async def _lead_ids_for_brand(brand_id: str, start: datetime, end: datetime) -> list[str]:
    cursor = leads_col.find(
        {"matched_brands": brand_id, "created_at": {"$gte": start, "$lte": end}},
        {"lead_id": 1},
    )
    return [doc["lead_id"] async for doc in cursor]


def render_digest_html(digest: dict, brand_name: str, period: str) -> str:
    """Render a dark-themed HTML email template for the digest."""
    temp = digest.get("temperature", {})
    total_temp = sum(temp.values()) or 1
    hot_pct = round(temp.get("hot", 0) / total_temp * 100)
    warm_pct = round(temp.get("warm", 0) / total_temp * 100)
    cold_pct = round(temp.get("cold", 0) / total_temp * 100)
    low_pct = 100 - hot_pct - warm_pct - cold_pct

    delta = digest.get("leads_delta_pct", 0)
    delta_icon = "&#9650;" if delta >= 0 else "&#9660;"
    delta_color = "#34D399" if delta >= 0 else "#EF4444"

    offers_rows = ""
    for i, o in enumerate(digest.get("top_offers", []), 1):
        offers_rows += f"""
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:10px 12px;color:#F9FAFB;font-size:14px;">{i}</td>
          <td style="padding:10px 12px;color:#F9FAFB;font-size:14px;">{_esc(o['title'])}</td>
          <td style="padding:10px 12px;color:#F9FAFB;font-size:14px;text-align:right;font-weight:600;">{o['claims']}</td>
        </tr>"""

    period_label = "This Week" if period == "weekly" else "This Month"

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0A0E1A;font-family:'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0E1A;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="padding:24px 28px;background:linear-gradient(135deg,#6366F1,#818CF8);border-radius:14px 14px 0 0;">
    <table width="100%"><tr>
      <td><span style="font-size:22px;font-weight:700;color:#fff;">AXISS</span>
        <span style="font-size:14px;color:rgba(255,255,255,0.8);margin-left:8px;">Lead Aggregator</span></td>
      <td align="right"><span style="font-size:13px;color:rgba(255,255,255,0.8);">{period_label} Digest</span><br>
        <span style="font-size:12px;color:rgba(255,255,255,0.6);">{digest['period_start'][:10]} &mdash; {digest['period_end'][:10]}</span></td>
    </tr></table>
  </td></tr>

  <!-- Brand name -->
  <tr><td style="background:#111827;padding:20px 28px 8px;">
    <span style="font-size:16px;font-weight:600;color:#F9FAFB;">{_esc(brand_name)}</span>
  </td></tr>

  <!-- KPI Cards -->
  <tr><td style="background:#111827;padding:12px 20px;">
    <table width="100%" cellpadding="0" cellspacing="8"><tr>
      <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;text-align:center;width:33%;">
        <div style="font-size:26px;font-weight:700;color:#F9FAFB;">{digest['new_leads']}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:4px;">New Leads</div>
        <div style="font-size:11px;color:{delta_color};margin-top:4px;">{delta_icon} {abs(delta)}% vs prev</div>
      </td>
      <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;text-align:center;width:33%;">
        <div style="font-size:26px;font-weight:700;color:#F9FAFB;">{digest['conversion_rate']}%</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:4px;">Conversion</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;">prev {digest['prev_conversion_rate']}%</div>
      </td>
      <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;text-align:center;width:33%;">
        <div style="font-size:26px;font-weight:700;color:#F9FAFB;">&rupee;{digest['revenue_inr']:,.0f}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:4px;">Revenue</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;">{digest['total_claims']} claims</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Temperature Bar -->
  <tr><td style="background:#111827;padding:12px 28px;">
    <div style="font-size:13px;font-weight:600;color:#F9FAFB;margin-bottom:8px;">Lead Temperature</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px;overflow:hidden;"><tr>
      <td style="background:#EF4444;height:10px;width:{hot_pct}%;"></td>
      <td style="background:#F59E0B;height:10px;width:{warm_pct}%;"></td>
      <td style="background:#60A5FA;height:10px;width:{cold_pct}%;"></td>
      <td style="background:#6B7280;height:10px;width:{low_pct}%;"></td>
    </tr></table>
    <table width="100%" style="margin-top:6px;"><tr>
      <td style="font-size:11px;color:#EF4444;">&#9679; Hot {temp.get('hot',0)}</td>
      <td style="font-size:11px;color:#F59E0B;">&#9679; Warm {temp.get('warm',0)}</td>
      <td style="font-size:11px;color:#60A5FA;">&#9679; Cold {temp.get('cold',0)}</td>
      <td style="font-size:11px;color:#6B7280;">&#9679; Low {temp.get('low',0)}</td>
    </tr></table>
  </td></tr>

  <!-- Top Offers Table -->
  <tr><td style="background:#111827;padding:16px 28px;">
    <div style="font-size:13px;font-weight:600;color:#F9FAFB;margin-bottom:8px;">Top Offers</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;">
      <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:rgba(255,255,255,0.4);font-weight:500;">#</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:rgba(255,255,255,0.4);font-weight:500;">Offer</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;color:rgba(255,255,255,0.4);font-weight:500;">Claims</th>
      </tr>
      {offers_rows if offers_rows else '<tr><td colspan="3" style="padding:12px;color:rgba(255,255,255,0.3);font-size:13px;text-align:center;">No claims this period</td></tr>'}
    </table>
  </td></tr>

  <!-- Alerts -->
  <tr><td style="background:#111827;padding:12px 28px;">
    <table width="100%"><tr>
      <td style="font-size:12px;color:rgba(255,255,255,0.55);">&#x1F6E1; Fraud alerts: <strong style="color:#F9FAFB;">{digest['fraud_alerts']}</strong></td>
      <td style="font-size:12px;color:rgba(255,255,255,0.55);">&#x1F393; New campus contacts: <strong style="color:#F9FAFB;">{digest['new_campus_contacts']}</strong></td>
    </tr></table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="background:#111827;padding:20px 28px 28px;text-align:center;">
    <a href="#" style="display:inline-block;background:#6366F1;color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">View Full Dashboard</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:16px 28px;text-align:center;border-radius:0 0 14px 14px;background:#0F1629;">
    <span style="font-size:11px;color:rgba(255,255,255,0.25);">AXISS Universal Lead Aggregator v2 &middot; 27 Domains &middot; DPDP Act 2023 Compliant</span>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _esc(s: str) -> str:
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


async def send_digest_email(brand_id: str, period: str = "weekly") -> dict:
    """Generate digest, render HTML, and send via email."""
    brand = await brands_col.find_one({"brand_id": brand_id})
    if not brand:
        return {"status": "error", "message": "Brand not found"}

    email = brand.get("contact_email")
    if not email:
        return {"status": "error", "message": "Brand has no contact email"}

    digest = await generate_digest(brand_id, period)
    brand_name = brand.get("name", "Brand")
    html = render_digest_html(digest, brand_name, period)

    period_label = "Weekly" if period == "weekly" else "Monthly"
    subject = f"AXISS {period_label} Lead Digest — {brand_name}"

    try:
        await send_email(
            to=email,
            subject=subject,
            html=html,
        )
        logger.info("[LA-Digest] Sent %s digest to %s (%s)", period, brand_name, email)
        return {"status": "ok", "brand_id": brand_id, "email": email, "period": period}
    except Exception as e:
        logger.error("[LA-Digest] Failed to send to %s: %s", email, e)
        return {"status": "error", "brand_id": brand_id, "message": str(e)}


async def process_all_digests(period: str = "weekly") -> dict:
    """Send digests to all active brands."""
    sent = 0
    failed = 0
    errors: list[dict] = []

    cursor = brands_col.find({"status": "active"})
    async for brand in cursor:
        brand_id = brand["brand_id"]

        # Check if brand has opted into this digest frequency
        pref = await digest_prefs_col.find_one({"brand_id": brand_id})
        if pref and pref.get("frequency") != period and pref.get("frequency") != "both":
            continue
        # Default: send weekly if no preference set
        if not pref and period != "weekly":
            continue

        result = await send_digest_email(brand_id, period)
        if result.get("status") == "ok":
            sent += 1
        else:
            failed += 1
            errors.append({"brand_id": brand_id, "error": result.get("message", "unknown")})

    return {
        "status": "ok",
        "period": period,
        "sent": sent,
        "failed": failed,
        "errors": errors,
    }


async def schedule_digest(brand_id: str, frequency: str, day_of_week: int = 0) -> dict:
    """Store digest preferences for a brand.

    frequency: "weekly", "monthly", "both", or "none"
    day_of_week: 0=Monday .. 6=Sunday (for weekly)
    """
    valid_freq = {"weekly", "monthly", "both", "none"}
    if frequency not in valid_freq:
        return {"status": "error", "message": f"frequency must be one of: {', '.join(valid_freq)}"}

    now = datetime.now(timezone.utc)
    await digest_prefs_col.update_one(
        {"brand_id": brand_id},
        {"$set": {
            "brand_id": brand_id,
            "frequency": frequency,
            "day_of_week": day_of_week,
            "updated_at": now,
        }},
        upsert=True,
    )

    return {
        "status": "ok",
        "brand_id": brand_id,
        "frequency": frequency,
        "day_of_week": day_of_week,
    }
