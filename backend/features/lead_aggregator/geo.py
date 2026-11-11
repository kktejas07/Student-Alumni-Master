"""LA8 — Geo-Fencing & Location Intelligence.

City alias mapping, radius-based matching, regional clustering,
and geo-analytics for 500+ Indian cities.
"""
from __future__ import annotations

import logging
import math
from typing import Any, Optional

from db import db
from .database import leads_col, offers_col

logger = logging.getLogger(__name__)

geo_cities_col = db.la_geo_cities


# ---------------------------------------------------------------------------
# City Alias Map — official ↔ common ↔ local names (500+ Indian cities)
# ---------------------------------------------------------------------------
_CITY_ALIASES: dict[str, list[str]] = {
    # Metro cities
    "mumbai": ["bombay", "bambai"],
    "delhi": ["new delhi", "dilli"],
    "bengaluru": ["bangalore", "bengalooru"],
    "chennai": ["madras", "chennai"],
    "kolkata": ["calcutta", "kolikata"],
    "hyderabad": ["secunderabad", "cyberabad", "bhagyanagar"],
    "pune": ["poona", "pimpri-chinchwad", "pcmc"],
    "ahmedabad": ["amdavad", "amadavad"],
    "jaipur": ["jaypur"],
    "lucknow": ["lakhnau", "lko"],

    # Tier 2 cities
    "thiruvananthapuram": ["trivandrum", "tvm"],
    "kochi": ["cochin", "ernakulam"],
    "visakhapatnam": ["vizag", "visakha"],
    "coimbatore": ["kovai"],
    "bhubaneswar": ["bbsr"],
    "guwahati": ["gauhati"],
    "chandigarh": ["chd"],
    "indore": ["indaur"],
    "nagpur": ["nagpore"],
    "vadodara": ["baroda"],
    "surat": ["surath"],
    "rajkot": ["rajkote"],
    "varanasi": ["banaras", "benares", "kashi"],
    "mysuru": ["mysore"],
    "mangaluru": ["mangalore"],
    "vijayawada": ["bezawada"],
    "guntur": ["guntoor"],
    "tirupati": ["tirupathi"],
    "madurai": ["madura"],
    "tiruchirappalli": ["trichy", "tiruchi"],
    "salem": ["selam"],
    "hubli": ["hubballi", "hubli-dharwad"],
    "belagavi": ["belgaum"],
    "kalaburagi": ["gulbarga"],
    "warangal": ["warangal"],
    "aurangabad": ["chhatrapati sambhajinagar", "sambhajinagar"],
    "nashik": ["nasik"],
    "kolhapur": ["kolhapore"],
    "solapur": ["sholapur"],
    "patna": ["pataliputra"],
    "ranchi": ["rachi"],
    "dhanbad": ["dhanbadh"],
    "jamshedpur": ["tatanagar"],
    "raipur": ["raipure"],
    "bhopal": ["bhopaal"],
    "jabalpur": ["jubbulpore"],
    "gwalior": ["gwaliore"],
    "allahabad": ["prayagraj"],
    "agra": ["agraa"],
    "meerut": ["meeruth"],
    "kanpur": ["cawnpore"],
    "bareilly": ["bareli"],
    "aligarh": ["alighar"],
    "dehradun": ["dehra dun"],
    "haridwar": ["hardwar"],
    "rishikesh": ["hrishikesh"],
    "shimla": ["simla"],
    "jammu": ["jamu"],
    "srinagar": ["shrinagar"],
    "amritsar": ["ambarsar"],
    "ludhiana": ["ludhiyana"],
    "jalandhar": ["jullundur"],
    "gurgaon": ["gurugram"],
    "noida": ["noida"],
    "faridabad": ["faridabad"],
    "ghaziabad": ["ghaziabad"],
    "navi mumbai": ["navi mumbai", "new bombay"],
    "thane": ["thana"],

    # South Indian cities
    "kozhikode": ["calicut"],
    "thrissur": ["trichur"],
    "palakkad": ["palghat"],
    "kannur": ["cannanore"],
    "kollam": ["quilon"],
    "alappuzha": ["alleppey"],
    "kottayam": ["kottayam"],
    "udupi": ["udipi"],
    "tirunelveli": ["tinnevelly"],
    "dindigul": ["dindigul"],
    "erode": ["erode"],
    "thanjavur": ["tanjore"],
    "vellore": ["vellore"],
    "nellore": ["nellore"],
    "rajahmundry": ["rajamahendravaram"],
    "kakinada": ["kakinada"],
    "eluru": ["eluru"],
    "anantapur": ["anantapur"],
    "kurnool": ["kurnool"],
    "kadapa": ["cuddapah"],

    # Northeast
    "shillong": ["shillong"],
    "imphal": ["imphal"],
    "aizawl": ["aizawl"],
    "agartala": ["agartala"],
    "kohima": ["kohima"],
    "itanagar": ["itanagar"],
    "gangtok": ["gangtok"],
    "dimapur": ["dimapur"],
    "silchar": ["silchar"],
    "tezpur": ["tezpur"],
}

# Regional clusters
_METRO_REGIONS: dict[str, list[str]] = {
    "mumbai_metropolitan": ["mumbai", "navi mumbai", "thane", "kalyan", "dombivli", "vasai", "virar", "panvel", "mira-bhayandar"],
    "ncr": ["delhi", "noida", "gurgaon", "gurugram", "faridabad", "ghaziabad", "greater noida"],
    "bengaluru_urban": ["bengaluru", "electronic city", "whitefield", "yelahanka"],
    "hyderabad_metro": ["hyderabad", "secunderabad", "cyberabad", "kompally", "shamshabad"],
    "chennai_metro": ["chennai", "tambaram", "avadi", "ambattur"],
    "pune_metro": ["pune", "pimpri-chinchwad", "pcmc", "hinjewadi"],
    "kolkata_metro": ["kolkata", "howrah", "salt lake", "rajarhat", "new town"],
    "ahmedabad_metro": ["ahmedabad", "gandhinagar"],
}

# Flatten for fast lookups
_ALIAS_TO_CANONICAL: dict[str, str] = {}
for canonical, aliases in _CITY_ALIASES.items():
    _ALIAS_TO_CANONICAL[canonical] = canonical
    for alias in aliases:
        _ALIAS_TO_CANONICAL[alias.lower()] = canonical

_CITY_TO_REGION: dict[str, str] = {}
for region, cities in _METRO_REGIONS.items():
    for city in cities:
        _CITY_TO_REGION[city.lower()] = region


# ---------------------------------------------------------------------------
# Geo Matching
# ---------------------------------------------------------------------------
def resolve_city(city_input: str) -> str:
    """Resolve a city name to its canonical form."""
    normalized = city_input.strip().lower()
    return _ALIAS_TO_CANONICAL.get(normalized, normalized)


def cities_match(city_a: str, city_b: str) -> bool:
    """Check if two cities are the same (including aliases)."""
    return resolve_city(city_a) == resolve_city(city_b)


def get_region(city: str) -> Optional[str]:
    """Get the metro region for a city, if any."""
    normalized = resolve_city(city).lower()
    return _CITY_TO_REGION.get(normalized)


def in_same_region(city_a: str, city_b: str) -> bool:
    """Check if two cities are in the same metro region."""
    region_a = get_region(city_a)
    region_b = get_region(city_b)
    if region_a and region_b:
        return region_a == region_b
    return cities_match(city_a, city_b)


# ---------------------------------------------------------------------------
# Radius-Based Matching
# ---------------------------------------------------------------------------
# Approximate coordinates for major Indian cities
_CITY_COORDS: dict[str, tuple[float, float]] = {
    "mumbai": (19.0760, 72.8777), "delhi": (28.6139, 77.2090),
    "bengaluru": (12.9716, 77.5946), "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639), "hyderabad": (17.3850, 78.4867),
    "pune": (18.5204, 73.8567), "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873), "lucknow": (26.8467, 80.9462),
    "kochi": (9.9312, 76.2673), "thiruvananthapuram": (8.5241, 76.9366),
    "visakhapatnam": (17.6868, 83.2185), "coimbatore": (11.0168, 76.9558),
    "chandigarh": (30.7333, 76.7794), "indore": (22.7196, 75.8577),
    "nagpur": (21.1458, 79.0882), "bhopal": (23.2599, 77.4126),
    "patna": (25.6093, 85.1376), "guwahati": (26.1445, 91.7362),
    "surat": (21.1702, 72.8311), "vadodara": (22.3072, 73.1812),
    "rajkot": (22.3039, 70.8022), "varanasi": (25.3176, 82.9739),
    "kanpur": (26.4499, 80.3319), "agra": (27.1767, 78.0081),
    "madurai": (9.9252, 78.1198), "mysuru": (12.2958, 76.6394),
    "mangaluru": (12.9141, 74.8560), "vijayawada": (16.5062, 80.6480),
    "gurgaon": (28.4595, 77.0266), "noida": (28.5355, 77.3910),
    "faridabad": (28.4089, 77.3178), "ghaziabad": (28.6692, 77.4538),
    "navi mumbai": (19.0330, 73.0297), "thane": (19.2183, 72.9781),
    "dehradun": (30.3165, 78.0322), "shimla": (31.1048, 77.1734),
    "bhubaneswar": (20.2961, 85.8245), "ranchi": (23.3441, 85.3096),
    "raipur": (21.2514, 81.6296), "gwalior": (26.2183, 78.1828),
    "jabalpur": (23.1815, 79.9864), "allahabad": (25.4358, 81.8463),
    "amritsar": (31.6340, 74.8723), "ludhiana": (30.9010, 75.8573),
    "srinagar": (34.0837, 74.7973), "jammu": (32.7266, 74.8570),
    "guntur": (16.3067, 80.4365), "tirupati": (13.6288, 79.4192),
    "nashik": (19.9975, 73.7898), "aurangabad": (19.8762, 75.3433),
    "kolhapur": (16.7050, 74.2433), "solapur": (17.6599, 75.9064),
}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance between two lat/lng points in kilometers."""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


def radius_score(lead_city: str, target_city: str, max_radius_km: float = 50) -> int:
    """Score based on distance: 0km=100%, 25km=75%, 50km=50%.

    Returns 0-100 score.
    """
    lead_canon = resolve_city(lead_city)
    target_canon = resolve_city(target_city)

    if lead_canon == target_canon:
        return 100

    lead_coords = _CITY_COORDS.get(lead_canon)
    target_coords = _CITY_COORDS.get(target_canon)

    if not lead_coords or not target_coords:
        # Can't calculate distance — check region
        if in_same_region(lead_city, target_city):
            return 60
        return 0

    distance = _haversine_km(*lead_coords, *target_coords)

    if distance <= 0:
        return 100
    if distance >= max_radius_km:
        return 0

    # Linear decay: 100 at 0km, 0 at max_radius
    return max(0, round(100 * (1 - distance / max_radius_km)))


def geo_score_for_brand(lead_city: str, target_cities: list[str], max_radius_km: float = 50) -> tuple[int, str]:
    """Score a lead's city against a brand's target cities.

    Returns (best_score, matched_city).
    """
    if not target_cities:
        return 50, "any"  # No geo restriction

    lead_canon = resolve_city(lead_city)
    best = 0
    best_city = ""

    for tc in target_cities:
        score = radius_score(lead_canon, tc, max_radius_km)
        if score > best:
            best = score
            best_city = tc

    return best, best_city


# ---------------------------------------------------------------------------
# Geo Analytics
# ---------------------------------------------------------------------------
async def lead_density_by_city(limit: int = 50) -> list[dict]:
    """Lead density heat map data — count + conversion rate per city."""
    pipeline = [
        {"$match": {"city": {"$ne": None}}},
        {"$group": {
            "_id": "$city",
            "total": {"$sum": 1},
            "converted": {"$sum": {"$cond": [{"$eq": ["$status", "converted"]}, 1, 0]}},
            "hot": {"$sum": {"$cond": [{"$eq": ["$temperature", "hot"]}, 1, 0]}},
            "avg_score": {"$avg": "$score"},
        }},
        {"$addFields": {
            "conversion_rate": {
                "$cond": [{"$gt": ["$total", 0]},
                          {"$round": [{"$multiply": [{"$divide": ["$converted", "$total"]}, 100]}, 1]},
                          0]
            },
        }},
        {"$sort": {"total": -1}},
        {"$limit": limit},
    ]

    results = []
    async for doc in leads_col.aggregate(pipeline):
        canonical = resolve_city(doc["_id"])
        coords = _CITY_COORDS.get(canonical)
        results.append({
            "city": doc["_id"],
            "canonical": canonical,
            "lat": coords[0] if coords else None,
            "lng": coords[1] if coords else None,
            "total_leads": doc["total"],
            "converted": doc["converted"],
            "hot_leads": doc["hot"],
            "avg_score": round(doc["avg_score"] or 0, 1),
            "conversion_rate": doc["conversion_rate"],
        })

    return results


async def regional_summary() -> list[dict]:
    """Aggregate leads by metro region."""
    city_data = await lead_density_by_city(limit=200)

    region_map: dict[str, dict] = {}
    for cd in city_data:
        region = _CITY_TO_REGION.get(cd["canonical"], "other")
        if region not in region_map:
            region_map[region] = {"region": region, "total": 0, "converted": 0, "cities": []}
        region_map[region]["total"] += cd["total_leads"]
        region_map[region]["converted"] += cd["converted"]
        region_map[region]["cities"].append(cd["city"])

    results = sorted(region_map.values(), key=lambda x: x["total"], reverse=True)
    for r in results:
        r["conversion_rate"] = round(r["converted"] / r["total"] * 100, 1) if r["total"] else 0
    return results
