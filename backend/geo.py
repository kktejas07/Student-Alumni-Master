"""
IP geolocation resolution using ip-api.com (free, no key required).
Batch-resolves IPs to country/city data for analytics.
"""
import logging
from collections import defaultdict
from typing import Any, Dict, List

import httpx

logger = logging.getLogger(__name__)

# In-memory cache to avoid repeated lookups
_geo_cache: Dict[str, Dict[str, str]] = {}


async def resolve_ip(ip: str) -> Dict[str, str]:
    """Resolve a single IP to geo data. Cached in memory."""
    if ip in _geo_cache:
        return _geo_cache[ip]
    if not ip or ip in ("127.0.0.1", "::1", ""):
        return {"country": "Unknown", "country_code": "??", "city": "Unknown"}
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"http://ip-api.com/json/{ip}")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    result = {
                        "country": data.get("country", "Unknown"),
                        "country_code": data.get("countryCode", "??"),
                        "city": data.get("city", "Unknown"),
                        "region": data.get("regionName", data.get("region", "")),
                        "isp": data.get("isp", ""),
                        "lat": data.get("lat"),
                        "lon": data.get("lon"),
                    }
                    _geo_cache[ip] = result
                    return result
    except Exception as e:
        logger.debug(f"Geo lookup failed for {ip}: {e}")
    return {"country": "Unknown", "country_code": "??", "city": "Unknown", "region": "", "isp": "", "lat": None, "lon": None}


async def resolve_ip_batch(ips: List[str]) -> Dict[str, Dict[str, Any]]:
    """Batch-resolve IPs using ip-api.com batch endpoint (max 100 per request)."""
    uncached = [ip for ip in ips if ip and ip not in _geo_cache and ip not in ("127.0.0.1", "::1", "")]
    results = {ip: _geo_cache.get(ip, {"country": "Unknown", "country_code": "??", "city": "Unknown"}) for ip in ips if ip in _geo_cache}

    for i in range(0, len(uncached), 100):
        chunk = uncached[i:i + 100]
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post("http://ip-api.com/batch", json=[{"query": ip} for ip in chunk])
                if resp.status_code == 200:
                    for item in resp.json():
                        ip = item.get("query", "")
                        if item.get("status") == "success":
                            result = {
                                "country": item.get("country", "Unknown"),
                                "country_code": item.get("countryCode", "??"),
                                "city": item.get("city", "Unknown"),
                                "region": item.get("regionName", item.get("region", "")),
                                "isp": item.get("isp", ""),
                                "lat": item.get("lat"),
                                "lon": item.get("lon"),
                            }
                            _geo_cache[ip] = result
                            results[ip] = result
        except Exception as e:
            logger.debug(f"Batch geo lookup failed: {e}")

    # Fill in any remaining uncached IPs as Unknown
    for ip in ips:
        if ip and ip not in results:
            results[ip] = _geo_cache.get(ip, {"country": "Unknown", "country_code": "??", "city": "Unknown"})
    return results


async def aggregate_geo_from_db(db, days: int = 90) -> Dict[str, Any]:
    """
    Aggregate geographic data from auth_events collection.
    Returns countries and top cities with counts.
    """
    from datetime import datetime, timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Get distinct IPs from auth events
    pipeline = [
        {"$match": {"timestamp": {"$gte": cutoff}, "ip": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$ip"}},
        {"$limit": 5000},
    ]
    ip_docs = await db.auth_events.aggregate(pipeline).to_list(5000)
    unique_ips = [d["_id"] for d in ip_docs if d.get("_id")]

    if not unique_ips:
        return {"countries": [], "cities": [], "configured": True}

    # Resolve geo data
    geo_data = await resolve_ip_batch(unique_ips)

    # Aggregate by country and city
    country_data: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"count": 0, "code": "??"})
    city_counts: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"count": 0, "country_code": "??"})

    all_events = await db.auth_events.find(
        {"timestamp": {"$gte": cutoff}, "ip": {"$exists": True, "$ne": ""}},
        {"ip": 1},
    ).to_list(10000)

    for doc in all_events:
        ip = doc.get("ip", "")
        geo = geo_data.get(ip, {"country": "Unknown", "country_code": "??", "city": "Unknown"})
        country_data[geo["country"]]["count"] += 1
        country_data[geo["country"]]["code"] = geo["country_code"]
        city_key = f"{geo['city']}"
        city_counts[city_key]["count"] += 1
        city_counts[city_key]["country_code"] = geo["country_code"]

    total = sum(d["count"] for d in country_data.values()) or 1
    countries = [
        {"country": c, "code": d["code"], "count": d["count"], "pct": round(d["count"] / total * 100, 1)}
        for c, d in sorted(country_data.items(), key=lambda x: -x[1]["count"])[:15]
    ]
    cities = [
        {"city": city, "country_code": data["country_code"], "count": data["count"]}
        for city, data in sorted(city_counts.items(), key=lambda x: -x[1]["count"])[:10]
    ]
    return {"countries": countries, "cities": cities, "configured": True}
