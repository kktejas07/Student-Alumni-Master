"""Lead scoring engine — heuristic scoring across 4 dimensions."""
from __future__ import annotations

from typing import Any


def compute_lead_score(
    lead: dict[str, Any],
    brand: dict[str, Any],
) -> tuple[int, dict[str, int], str]:
    """Score a lead against a brand's target criteria.

    Returns (total_score, breakdown_dict, temperature).

    Dimensions (max 100):
      age_fit:               0–20  (±2 years = 20, ±5 = 10, else 0)
      city_match:            0–15  (exact = 15, same state = 8, else 0)
      profile_completeness:  0–25  (linear based on filled fields)
      skills_match:          0–25  (jaccard overlap * 25)
      education_match:       0–15  (exact level match)

    Temperature thresholds:
      >= 70 → hot
      >= 45 → warm
      >= 25 → cold
      <  25 → low
    """
    breakdown: dict[str, int] = {}

    # ── Age Fit (0–20) ──
    lead_age = lead.get("age")
    t_min = brand.get("target_age_min", 16)
    t_max = brand.get("target_age_max", 30)
    if lead_age is not None:
        mid = (t_min + t_max) / 2
        diff = abs(lead_age - mid)
        if diff <= 2:
            breakdown["age_fit"] = 20
        elif diff <= 5:
            breakdown["age_fit"] = 10
        elif t_min <= lead_age <= t_max:
            breakdown["age_fit"] = 15
        else:
            breakdown["age_fit"] = 0
    else:
        breakdown["age_fit"] = 0

    # ── City Match (0–15) ──
    target_cities = [c.lower().strip() for c in brand.get("target_cities", [])]
    lead_city = (lead.get("city") or "").lower().strip()
    lead_state = (lead.get("state") or "").lower().strip()
    if lead_city and target_cities:
        if lead_city in target_cities:
            breakdown["city_match"] = 15
        elif lead_state and any(_in_same_region(lead_city, tc) for tc in target_cities):
            breakdown["city_match"] = 8
        else:
            breakdown["city_match"] = 0
    elif not target_cities:
        breakdown["city_match"] = 10
    else:
        breakdown["city_match"] = 0

    # ── Profile Completeness (0–25) ──
    fields = ["full_name", "email", "phone", "age", "city", "education_level",
              "institution", "skills", "interests"]
    filled = sum(1 for f in fields if _is_filled(lead.get(f)))
    breakdown["profile_completeness"] = round((filled / len(fields)) * 25)

    # ── Skills Match (0–25) ──
    target_skills = {s.lower().strip() for s in brand.get("target_skills", [])}
    lead_skills = {s.lower().strip() for s in lead.get("skills", [])}
    if target_skills and lead_skills:
        intersection = target_skills & lead_skills
        union = target_skills | lead_skills
        jaccard = len(intersection) / len(union) if union else 0
        breakdown["skills_match"] = round(jaccard * 25)
    elif not target_skills:
        breakdown["skills_match"] = 12
    else:
        breakdown["skills_match"] = 0

    # ── Education Match (0–15) ──
    target_edu = {e.lower().strip() for e in brand.get("target_education_levels", [])}
    lead_edu = (lead.get("education_level") or "").lower().strip()
    if target_edu and lead_edu:
        breakdown["education_match"] = 15 if lead_edu in target_edu else 0
    elif not target_edu:
        breakdown["education_match"] = 8
    else:
        breakdown["education_match"] = 0

    total = sum(breakdown.values())
    total = min(total, 100)

    if total >= 70:
        temperature = "hot"
    elif total >= 45:
        temperature = "warm"
    elif total >= 25:
        temperature = "cold"
    else:
        temperature = "low"

    return total, breakdown, temperature


def _is_filled(val: Any) -> bool:
    if val is None:
        return False
    if isinstance(val, (list, dict)) and not val:
        return False
    if isinstance(val, str) and not val.strip():
        return False
    return True


# City alias map for basic region matching
_CITY_ALIASES: dict[str, set[str]] = {
    "mumbai": {"bombay", "mumbai", "navi mumbai", "thane"},
    "bengaluru": {"bangalore", "bengaluru"},
    "delhi": {"delhi", "new delhi", "noida", "gurgaon", "gurugram", "faridabad", "ghaziabad"},
    "chennai": {"chennai", "madras"},
    "kolkata": {"kolkata", "calcutta"},
    "hyderabad": {"hyderabad", "secunderabad", "cyberabad"},
    "pune": {"pune", "pimpri-chinchwad", "pcmc"},
    "ahmedabad": {"ahmedabad", "gandhinagar"},
    "thiruvananthapuram": {"thiruvananthapuram", "trivandrum"},
    "kochi": {"kochi", "cochin", "ernakulam"},
    "visakhapatnam": {"visakhapatnam", "vizag"},
    "coimbatore": {"coimbatore", "kovai"},
}

_FLAT_ALIASES: dict[str, str] = {}
for canonical, aliases in _CITY_ALIASES.items():
    for alias in aliases:
        _FLAT_ALIASES[alias] = canonical


def _in_same_region(city_a: str, city_b: str) -> bool:
    """Check if two cities are in the same metro region."""
    canon_a = _FLAT_ALIASES.get(city_a, city_a)
    canon_b = _FLAT_ALIASES.get(city_b, city_b)
    return canon_a == canon_b
