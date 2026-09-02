"""
import_unstop_csv.py — Parse Unstop CSV exports and import ticket buyers
into the ECHO registration + StudentAlumni account system.

Column mapping (Unstop → ECHO):
  Candidate's Name        → full_name
  Candidate's Email       → email (primary match key)
  Candidate's Mobile      → phone
  Team Name               → team_name
  Team ID                 → grouping key for team registrations
  Candidate role          → is_team_member (Team Lead = primary)
  Year of Graduation      → year
  Candidate's Organisation→ college (fallback)
  Domain                  → branch
  Registration Time       → registered_at
  Reg. Status             → status mapping
  Payment Status          → payment.status mapping
  All other columns       → unstop_metadata (preserved for reference)
"""

from __future__ import annotations

import csv
import io
import secrets
import string
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple


# ── Column name constants (exact Unstop headers) ─────────────────────────────
COL_TEAM_ID = "Team ID"
COL_TEAM_NAME = "Team Name"
COL_ROLE = "Candidate role"
COL_NAME = "Candidate's Name"
COL_EMAIL = "Candidate's Email"
COL_MOBILE = "Candidate's Mobile"
COL_GENDER = "Candidate's Gender"
COL_LOCATION = "Candidate's Location"
COL_USER_TYPE = "User type"
COL_DOMAIN = "Domain"
COL_COURSE = "Course"
COL_SPECIALIZATION = "Specialization"
COL_COURSE_TYPE = "Course Type"
COL_COURSE_DURATION = "Course Duration"
COL_CLASS_GRADE = "Class/Grade"
COL_YEAR_OF_GRAD = "Year of Graduation"
COL_ORG = "Candidate's Organisation"
COL_DESIGNATION = "Designation"
COL_REG_TIME = "Registration Time"
COL_DIFF_ABLED = "Differently Abled"
COL_WORK_EXP = "Work Experience"
COL_REG_STATUS = "Reg. Status"
COL_REF_CODE = "Ref Code"
COL_PAY_STATUS = "Payment Status"

# Metadata columns — stored in unstop_metadata but not mapped to ECHO fields
METADATA_COLS = [
    COL_GENDER, COL_LOCATION, COL_USER_TYPE, COL_COURSE,
    COL_SPECIALIZATION, COL_COURSE_TYPE, COL_COURSE_DURATION,
    COL_CLASS_GRADE, COL_DESIGNATION, COL_DIFF_ABLED,
    COL_WORK_EXP, COL_REF_CODE,
]


def parse_unstop_csv(file_content: str | bytes) -> List[Dict[str, Any]]:
    """Parse a Unstop CSV export and return a list of raw row dicts.

    Auto-detects comma vs tab vs semicolon delimiters (Excel locale exports
    can arrive tab-delimited). Assumes a header row.
    """
    if isinstance(file_content, bytes):
        text = file_content.decode("utf-8-sig")
    else:
        text = file_content

    sample = text[:4096]
    delimiter = ","
    counts = {",": sample.count(","), "\t": sample.count("\t"), ";": sample.count(";")}
    if counts["\t"] > counts[","] and counts["\t"] > 0:
        delimiter = "\t"
    elif counts[";"] > counts[","] and counts[";"] > 0:
        delimiter = ";"

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    rows = []
    for row in reader:
        # Strip whitespace from keys and values
        cleaned = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}
        email = cleaned.get(COL_EMAIL, "").lower()
        if not email:
            continue  # skip rows without email
        rows.append(cleaned)
    return rows


def _generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _map_payment_status(raw: str) -> str:
    """Map Unstop Payment Status to ECHO payment.status."""
    low = (raw or "").lower().strip()
    if low in ("paid", "success", "completed", "confirmed"):
        return "paid"
    if low in ("pending", "processing"):
        return "pending"
    if low in ("failed", "refunded", "cancelled", "canceled"):
        return "failed"
    return "pending"


def _map_reg_status(raw: str) -> str:
    """Map Unstop Reg. Status to ECHO status."""
    low = (raw or "").lower().strip()
    if low in ("confirmed", "registered", "approved", "active"):
        return "registered"
    if low in ("pending", "waitlisted", "waitlist"):
        return "pending"
    if low in ("cancelled", "canceled", "rejected", "declined"):
        return "cancelled"
    return "registered"


def _extract_metadata(row: Dict[str, Any]) -> Dict[str, Any]:
    """Pull Unstop-specific columns into a metadata dict."""
    meta = {}
    for col in METADATA_COLS:
        val = row.get(col, "")
        if val:
            meta[col] = val
    return meta


def _parse_reg_time(raw: str) -> str:
    """Try to parse Unstop's registration time into an ISO string."""
    if not raw:
        return datetime.now(timezone.utc).isoformat()
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
        "%m/%d/%Y %H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            dt = datetime.strptime(raw, fmt)
            return dt.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue
    return datetime.now(timezone.utc).isoformat()


def build_registrations(rows: List[Dict[str, Any]], slug: str, showcase_title: str = "") -> Dict[str, Any]:
    """Group parsed CSV rows into ECHO-ready registration dicts.

    Returns:
      {
        "registrations": [ ... ],
        "teams": { team_id: [reg, ...] },
        "stats": { total, individuals, team_groups, new_accounts_hint, emails }
      }
    """
    # Group by Team ID
    teams: Dict[str, List[Dict[str, Any]]] = {}
    individuals: List[Dict[str, Any]] = []

    for row in rows:
        team_id = row.get(COL_TEAM_ID, "").strip()
        if team_id:
            teams.setdefault(team_id, []).append(row)
        else:
            individuals.append(row)

    registrations: List[Dict[str, Any]] = []
    all_emails: List[str] = []

    # Helper to build a single registration doc from a row
    def _build_reg(row: Dict[str, Any], is_team_lead: bool = False, team_name: str = "") -> Dict[str, Any]:
        email = row.get(COL_EMAIL, "").lower()
        all_emails.append(email)
        fee_raw = row.get("Fee Amount", row.get("Amount", "0"))
        try:
            fee = float(str(fee_raw).replace(",", "").replace("₹", "").strip() or "0")
        except (ValueError, TypeError):
            fee = 0.0

        pay_status = _map_payment_status(row.get(COL_PAY_STATUS, "paid"))
        is_paid = pay_status == "paid"

        return {
            "slug": slug,
            "showcase_title": showcase_title,
            "full_name": row.get(COL_NAME, ""),
            "email": email,
            "phone": row.get(COL_MOBILE, ""),
            "year": row.get(COL_YEAR_OF_GRAD, ""),
            "college": row.get(COL_ORG, ""),
            "branch": row.get(COL_DOMAIN, ""),
            "team_name": team_name,
            "team_id": row.get(COL_TEAM_ID, ""),
            "is_team_member": not is_team_lead if team_name else False,
            "is_team_lead": is_team_lead,
            "fee": fee,
            "currency": "INR",
            "payment": {
                "payment_id": f"UNSTOP_{secrets.token_hex(6).upper()}",
                "gateway": "unstop",
                "amount": fee,
                "currency": "INR",
                "status": pay_status,
                "paid_at": _parse_reg_time(row.get(COL_REG_TIME, "")) if is_paid else None,
                "method": "external",
            },
            "registered_at": _parse_reg_time(row.get(COL_REG_TIME, "")),
            "status": "registered" if is_paid else _map_reg_status(row.get(COL_REG_STATUS, "")),
            "registration_type": "team" if team_name else "individual",
            "source": "unstop_import",
            "unstop_metadata": _extract_metadata(row),
        }

    # Process teams
    for team_id, member_rows in teams.items():
        team_name = member_rows[0].get(COL_TEAM_NAME, f"Team {team_id}")
        # Find the team lead (Candidate role contains "lead" or "leader", or first member)
        lead_idx = 0
        for i, r in enumerate(member_rows):
            role = (r.get(COL_ROLE, "") or "").lower()
            if "lead" in role or "leader" in role:
                lead_idx = i
                break

        # Build lead registration
        lead_reg = _build_reg(member_rows[lead_idx], is_team_lead=True, team_name=team_name)
        lead_reg["registration_type"] = "team"
        lead_reg["team_members"] = []
        registrations.append(lead_reg)

        # Build member registrations
        for i, member_row in enumerate(member_rows):
            if i == lead_idx:
                continue
            member_reg = _build_reg(member_row, is_team_lead=False, team_name=team_name)
            member_reg["registration_type"] = "team"
            lead_reg["team_members"].append({
                "name": member_reg["full_name"],
                "email": member_reg["email"],
                "phone": member_reg["phone"],
            })
            registrations.append(member_reg)

    # Process individuals
    for row in individuals:
        reg = _build_reg(row)
        reg["team_members"] = []
        registrations.append(reg)

    return {
        "registrations": registrations,
        "teams": {tid: [r for r in registrations if r.get("team_id") == tid] for tid in teams},
        "stats": {
            "total": len(registrations),
            "individuals": len(individuals),
            "team_groups": len(teams),
            "team_members_total": sum(len(m) for m in teams.values()),
            "emails": list(set(all_emails)),
        },
    }
