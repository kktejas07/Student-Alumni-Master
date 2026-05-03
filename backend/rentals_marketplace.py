"""
rentals_marketplace.py — SA Stay (Rentals Marketplace).

Endpoints (all under /api):
  GET   /rentals/listings?category=&city=&min_price=&max_price=&q=
  GET   /rentals/listings/{listing_id}
  GET   /rentals/categories
  POST  /rentals/book                     {listing_id, check_in, check_out, guests, notes}
  GET   /rentals/bookings                 list current user's bookings
  GET   /rentals/bookings/{booking_id}    booking detail
  POST  /rentals/bookings/{booking_id}/cancel
  POST  /rentals/ai/recommend             {prefs: {budget,city,category,vibe}}
"""
from __future__ import annotations
import os, uuid, logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from pathlib import Path
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")
_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]
logger = logging.getLogger("rentals_marketplace")
router = APIRouter()


# ─── Auth ────────────────────────────────────────────────────────────────
def _auth():
    from server import get_current_user
    return get_current_user


# ─── Categories ──────────────────────────────────────────────────────────
CATEGORIES = [
    {"id": "housing",   "label": "Student Housing", "icon": "home-city",
     "color": "#3B82F6", "tagline": "PGs, hostels, apartments near campus"},
    {"id": "vehicle",   "label": "Vehicles",        "icon": "motorbike",
     "color": "#F59E0B", "tagline": "Bikes, cars & cycles for daily commute"},
    {"id": "hotel",     "label": "Hotels & Stays",  "icon": "bed",
     "color": "#EF4444", "tagline": "Hotels, farmhouses & vacation homes"},
    {"id": "coworking", "label": "Coworking",       "icon": "laptop",
     "color": "#8B5CF6", "tagline": "Hot desks & private cabins"},
]


# ─── Curated Listings (40+ across 4 categories) ──────────────────────────
def _seed_listings() -> List[Dict[str, Any]]:
    return [
        # ── HOUSING (12) ──
        {"id": "H1", "category": "housing", "title": "CampusPG — IIT Bombay Area",
         "type": "PG / Hostel", "city": "Mumbai", "location": "Powai, Mumbai",
         "rent_inr": 6500, "rent_label": "₹6,500/mo", "orig_inr": 9000, "orig_label": "₹9,000/mo",
         "discount": "28%", "amenities": ["WiFi", "Meals 2x/day", "AC", "Laundry"],
         "rating": 4.6, "reviews": 142, "beds": "Single / Double", "available": 3,
         "color": "#3B82F6", "featured": True, "emoji": "🏠",
         "perk": "10% off with SA-ID", "verified": True,
         "tags": ["near-iit", "meals-included", "ac"]},
        {"id": "H2", "category": "housing", "title": "StayAbode Smart Hostel",
         "type": "PG / Hostel", "city": "Mumbai", "location": "Andheri West, Mumbai",
         "rent_inr": 8000, "rent_label": "₹8,000/mo", "orig_inr": 10500, "orig_label": "₹10,500/mo",
         "discount": "24%", "amenities": ["Co-working", "Gym", "Netflix lounge", "24x7 security"],
         "rating": 4.4, "reviews": 89, "beds": "Dorm / Private", "available": 7,
         "color": "#8B5CF6", "emoji": "🏨", "perk": "Free first week",
         "verified": True, "tags": ["coworking", "gym", "secure"]},
        {"id": "H3", "category": "housing", "title": "1BHK near IIT Bombay",
         "type": "Apartment", "city": "Mumbai", "location": "Hiranandani, Powai",
         "rent_inr": 18000, "rent_label": "₹18,000/mo", "orig_inr": 22000, "orig_label": "₹22,000/mo",
         "discount": "18%", "amenities": ["Furnished", "Near metro", "Parking"],
         "rating": 4.3, "reviews": 34, "beds": "1BHK Furnished", "available": 1,
         "color": "#14B8A6", "emoji": "🏢", "perk": "₹2,000 off first month",
         "verified": True, "tags": ["furnished", "metro"]},
        {"id": "H4", "category": "housing", "title": "Studio Flat — Koramangala",
         "type": "Apartment", "city": "Bengaluru", "location": "Koramangala, Bengaluru",
         "rent_inr": 14000, "rent_label": "₹14,000/mo", "orig_inr": 17000, "orig_label": "₹17,000/mo",
         "discount": "18%", "amenities": ["AC", "Geyser", "Parking"],
         "rating": 4.5, "reviews": 67, "beds": "Studio", "available": 2,
         "color": "#22C55E", "featured": True, "emoji": "🛋️",
         "perk": "15% for SA", "verified": True, "tags": ["startup-hub", "ac"]},
        {"id": "H5", "category": "housing", "title": "3BHK Shared — HSR Layout",
         "type": "Shared Flat", "city": "Bengaluru", "location": "HSR Layout, Bengaluru",
         "rent_inr": 9500, "rent_label": "₹9,500/mo", "orig_inr": 12000, "orig_label": "₹12,000/mo",
         "discount": "21%", "amenities": ["Shared kitchen", "WiFi 200Mbps", "Gym"],
         "rating": 4.2, "reviews": 18, "beds": "1 room in 3BHK", "available": 1,
         "color": "#F97316", "emoji": "🛏️", "perk": "₹1,000 off deposit",
         "verified": True, "tags": ["shared", "wifi-fast"]},
        {"id": "H6", "category": "housing", "title": "Zolo Stays — Whitefield",
         "type": "PG / Hostel", "city": "Bengaluru", "location": "Whitefield, Bengaluru",
         "rent_inr": 7800, "rent_label": "₹7,800/mo", "orig_inr": 11000, "orig_label": "₹11,000/mo",
         "discount": "29%", "amenities": ["Meals 3x", "Housekeeping", "WiFi", "AC"],
         "rating": 4.5, "reviews": 226, "beds": "Single / Twin", "available": 12,
         "color": "#6366F1", "featured": True, "emoji": "🏘️",
         "perk": "Zero deposit for SA students", "verified": True,
         "tags": ["meals-included", "tech-hub", "no-deposit"]},
        {"id": "H7", "category": "housing", "title": "Colive Hostel — Hinjewadi",
         "type": "PG / Hostel", "city": "Pune", "location": "Hinjewadi, Pune",
         "rent_inr": 7200, "rent_label": "₹7,200/mo", "orig_inr": 9500, "orig_label": "₹9,500/mo",
         "discount": "24%", "amenities": ["Meals", "Gym", "Pool", "Co-working"],
         "rating": 4.4, "reviews": 158, "beds": "Single / Double", "available": 8,
         "color": "#EC4899", "emoji": "🏖️", "perk": "20% off 6-month plan",
         "verified": True, "tags": ["it-park", "pool"]},
        {"id": "H8", "category": "housing", "title": "DU North Campus PG",
         "type": "PG / Hostel", "city": "Delhi", "location": "Kamla Nagar, North Delhi",
         "rent_inr": 8500, "rent_label": "₹8,500/mo", "orig_inr": 11000, "orig_label": "₹11,000/mo",
         "discount": "23%", "amenities": ["Meals 2x", "WiFi", "Power backup"],
         "rating": 4.3, "reviews": 92, "beds": "Single / Double", "available": 5,
         "color": "#3B82F6", "emoji": "🏛️", "perk": "₹500 off for DU students",
         "verified": True, "tags": ["near-du", "meals-included"]},
        {"id": "H9", "category": "housing", "title": "Stanza Living — Gurgaon",
         "type": "PG / Hostel", "city": "Delhi NCR", "location": "Sector 49, Gurgaon",
         "rent_inr": 11500, "rent_label": "₹11,500/mo", "orig_inr": 15000, "orig_label": "₹15,000/mo",
         "discount": "23%", "amenities": ["Daily housekeeping", "Meals", "Gym", "Lounge"],
         "rating": 4.6, "reviews": 318, "beds": "Premium single", "available": 6,
         "color": "#10B981", "featured": True, "emoji": "🏨",
         "perk": "Free upgrade for SA-ID", "verified": True,
         "tags": ["premium", "corporate-hub"]},
        {"id": "H10", "category": "housing", "title": "OYO Life — IIT Madras",
         "type": "PG / Hostel", "city": "Chennai", "location": "Adyar, Chennai",
         "rent_inr": 7000, "rent_label": "₹7,000/mo", "orig_inr": 9200, "orig_label": "₹9,200/mo",
         "discount": "24%", "amenities": ["Meals", "WiFi", "Laundry"],
         "rating": 4.2, "reviews": 78, "beds": "Single / Double", "available": 4,
         "color": "#F59E0B", "emoji": "🏯", "perk": "₹1,500 off first month",
         "verified": True, "tags": ["near-iitm"]},
        {"id": "H11", "category": "housing", "title": "Hyderabad Tech Hub PG",
         "type": "PG / Hostel", "city": "Hyderabad", "location": "Madhapur, Hyderabad",
         "rent_inr": 8200, "rent_label": "₹8,200/mo", "orig_inr": 11500, "orig_label": "₹11,500/mo",
         "discount": "29%", "amenities": ["AC", "Meals", "Gym", "Co-working"],
         "rating": 4.5, "reviews": 134, "beds": "Single AC", "available": 9,
         "color": "#8B5CF6", "emoji": "🌆", "perk": "Free meals for 1 month",
         "verified": True, "tags": ["hitech-city", "ac"]},
        {"id": "H12", "category": "housing", "title": "2BHK Apartment — Salt Lake",
         "type": "Apartment", "city": "Kolkata", "location": "Salt Lake Sector V",
         "rent_inr": 13000, "rent_label": "₹13,000/mo", "orig_inr": 16000, "orig_label": "₹16,000/mo",
         "discount": "19%", "amenities": ["Furnished", "Parking", "Power backup"],
         "rating": 4.1, "reviews": 22, "beds": "2BHK Furnished", "available": 1,
         "color": "#22C55E", "emoji": "🏬", "perk": "₹3,000 off deposit",
         "verified": True, "tags": ["furnished", "it-sector"]},

        # ── VEHICLES (10) ──
        {"id": "V1", "category": "vehicle", "title": "Rapido Bike Subscription",
         "type": "Two-Wheeler", "city": "Pan India", "location": "All major cities",
         "rent_inr": 1499, "rent_label": "₹1,499/mo", "orig_inr": 2200, "orig_label": "₹2,200/mo",
         "discount": "32%", "amenities": ["All-India", "Insurance", "Free helmet"],
         "rating": 4.7, "reviews": 890, "beds": "Honda Activa / TVS", "available": 50,
         "color": "#F59E0B", "featured": True, "emoji": "🛵",
         "perk": "1 month free for new SA users", "verified": True,
         "tags": ["all-india", "insurance"]},
        {"id": "V2", "category": "vehicle", "title": "Bounce Infinite Bike",
         "type": "Two-Wheeler", "city": "Bengaluru", "location": "Bengaluru · Hyderabad",
         "rent_inr": 999, "rent_label": "₹999/mo", "orig_inr": 1499, "orig_label": "₹1,499/mo",
         "discount": "33%", "amenities": ["Zero petrol", "App unlock", "Swap battery"],
         "rating": 4.4, "reviews": 340, "beds": "Electric scooter", "available": 25,
         "color": "#22C55E", "emoji": "⚡", "perk": "10% extra off",
         "verified": True, "tags": ["ev", "no-petrol"]},
        {"id": "V3", "category": "vehicle", "title": "Zoomcar Monthly Rental",
         "type": "Car", "city": "Mumbai", "location": "Mumbai · Delhi · Bengaluru",
         "rent_inr": 8999, "rent_label": "₹8,999/mo", "orig_inr": 12000, "orig_label": "₹12,000/mo",
         "discount": "25%", "amenities": ["1500km/mo free", "Self-drive", "Insurance"],
         "rating": 4.3, "reviews": 210, "beds": "Hatchback / Sedan", "available": 8,
         "color": "#EF4444", "emoji": "🚗", "perk": "₹500 off with SA-ID",
         "verified": True, "tags": ["self-drive", "long-term"]},
        {"id": "V4", "category": "vehicle", "title": "Yulu Campus Cycle Plan",
         "type": "Cycle", "city": "Bengaluru", "location": "Bengaluru · Pune",
         "rent_inr": 299, "rent_label": "₹299/mo", "orig_inr": 499, "orig_label": "₹499/mo",
         "discount": "40%", "amenities": ["Zero emission", "App unlock", "No licence"],
         "rating": 4.5, "reviews": 1200, "beds": "Electric cycle", "available": 100,
         "color": "#14B8A6", "featured": True, "emoji": "🚲",
         "perk": "2 months free", "verified": True,
         "tags": ["eco", "campus"]},
        {"id": "V5", "category": "vehicle", "title": "Royloy — Royal Enfield Rental",
         "type": "Two-Wheeler", "city": "Goa", "location": "Goa · Manali · Leh",
         "rent_inr": 599, "rent_label": "₹599/day", "orig_inr": 899, "orig_label": "₹899/day",
         "discount": "33%", "amenities": ["Helmets", "Insurance", "Roadside assist"],
         "rating": 4.7, "reviews": 412, "beds": "RE Classic 350", "available": 18,
         "color": "#F97316", "emoji": "🏍️", "perk": "Free saddlebags",
         "verified": True, "tags": ["touring", "roadtrip"]},
        {"id": "V6", "category": "vehicle", "title": "Revv Self-Drive SUV",
         "type": "Car", "city": "Delhi", "location": "Delhi · Mumbai · Pune",
         "rent_inr": 2199, "rent_label": "₹2,199/day", "orig_inr": 3200, "orig_label": "₹3,200/day",
         "discount": "31%", "amenities": ["Unlimited km", "Insurance", "GPS"],
         "rating": 4.4, "reviews": 188, "beds": "Creta / Seltos", "available": 6,
         "color": "#6366F1", "emoji": "🚙", "perk": "₹300 off weekend",
         "verified": True, "tags": ["self-drive", "weekend"]},
        {"id": "V7", "category": "vehicle", "title": "Drivezy Bike Pool",
         "type": "Two-Wheeler", "city": "Bengaluru", "location": "Bengaluru · Mysuru",
         "rent_inr": 1199, "rent_label": "₹1,199/mo", "orig_inr": 1799, "orig_label": "₹1,799/mo",
         "discount": "33%", "amenities": ["App unlock", "Insurance", "Maintenance"],
         "rating": 4.2, "reviews": 156, "beds": "Activa / Jupiter", "available": 22,
         "color": "#EC4899", "emoji": "🛴", "perk": "₹200 referral credit",
         "verified": True, "tags": ["app-unlock"]},
        {"id": "V8", "category": "vehicle", "title": "EV Charging Pass — Tata Power",
         "type": "Add-on", "city": "Pan India", "location": "300+ stations",
         "rent_inr": 499, "rent_label": "₹499/mo", "orig_inr": 999, "orig_label": "₹999/mo",
         "discount": "50%", "amenities": ["Unlimited slow charge", "Mobile app"],
         "rating": 4.3, "reviews": 234, "beds": "EV add-on", "available": 999,
         "color": "#10B981", "emoji": "🔌", "perk": "Free installation",
         "verified": True, "tags": ["ev-add-on"]},
        {"id": "V9", "category": "vehicle", "title": "Vogo Electric Scooter",
         "type": "Two-Wheeler", "city": "Hyderabad", "location": "Hyderabad · Bengaluru",
         "rent_inr": 1099, "rent_label": "₹1,099/mo", "orig_inr": 1599, "orig_label": "₹1,599/mo",
         "discount": "31%", "amenities": ["Zero petrol", "Door delivery", "Insurance"],
         "rating": 4.3, "reviews": 198, "beds": "Electric", "available": 30,
         "color": "#22C55E", "emoji": "⚡", "perk": "Free door delivery",
         "verified": True, "tags": ["ev", "delivery"]},
        {"id": "V10", "category": "vehicle", "title": "Self-Drive Mahindra Thar",
         "type": "Car", "city": "Goa", "location": "Goa · Manali · Rishikesh",
         "rent_inr": 3499, "rent_label": "₹3,499/day", "orig_inr": 4999, "orig_label": "₹4,999/day",
         "discount": "30%", "amenities": ["4x4", "Off-road", "Insurance"],
         "rating": 4.8, "reviews": 92, "beds": "Thar 4x4", "available": 3,
         "color": "#F59E0B", "featured": True, "emoji": "🚐",
         "perk": "Adventure pack — free", "verified": True,
         "tags": ["adventure", "off-road"]},

        # ── HOTELS & STAYS (12) — Hotels + Farmhouse + Vacation ──
        {"id": "HO1", "category": "hotel", "title": "OYO Student Stay",
         "type": "Budget Hotel", "city": "Pan India", "location": "Pan India",
         "rent_inr": 599, "rent_label": "₹599/night", "orig_inr": 999, "orig_label": "₹999/night",
         "discount": "40%", "amenities": ["Breakfast", "WiFi", "AC"],
         "rating": 4.0, "reviews": 4500, "beds": "Single / Twin", "available": 200,
         "color": "#EF4444", "emoji": "🏨", "perk": "Additional 15% via SA-ID",
         "verified": True, "tags": ["budget", "pan-india"]},
        {"id": "HO2", "category": "hotel", "title": "Lemon Tree Intern Pack",
         "type": "Business Hotel", "city": "Bengaluru", "location": "Bengaluru · Mumbai · Delhi",
         "rent_inr": 1999, "rent_label": "₹1,999/night", "orig_inr": 3200, "orig_label": "₹3,200/night",
         "discount": "38%", "amenities": ["Breakfast", "Gym", "Co-working desk"],
         "rating": 4.5, "reviews": 890, "beds": "Deluxe room", "available": 20,
         "color": "#F59E0B", "featured": True, "emoji": "🛎️",
         "perk": "20% off for interns · 3+ nights", "verified": True,
         "tags": ["business", "intern-pack"]},
        {"id": "HO3", "category": "hotel", "title": "Rajputana Haveli — Jaipur",
         "type": "Heritage Hotel", "city": "Jaipur", "location": "Jaipur, Rajasthan",
         "rent_inr": 3500, "rent_label": "₹3,500/night", "orig_inr": 5500, "orig_label": "₹5,500/night",
         "discount": "36%", "amenities": ["Heritage", "Pool", "Traditional food"],
         "rating": 4.8, "reviews": 210, "beds": "Suite", "available": 4,
         "color": "#6366F1", "emoji": "🕌", "perk": "₹500 off per night",
         "verified": True, "tags": ["heritage", "weekend"]},
        {"id": "HO4", "category": "hotel", "title": "Treebo Trend — Connaught Place",
         "type": "Budget Hotel", "city": "Delhi", "location": "Connaught Place, New Delhi",
         "rent_inr": 1299, "rent_label": "₹1,299/night", "orig_inr": 2100, "orig_label": "₹2,100/night",
         "discount": "38%", "amenities": ["Breakfast", "WiFi", "Daily housekeeping"],
         "rating": 4.3, "reviews": 542, "beds": "Standard / Deluxe", "available": 15,
         "color": "#3B82F6", "emoji": "🏙️", "perk": "Free upgrade for SA",
         "verified": True, "tags": ["central", "budget"]},
        {"id": "HO5", "category": "hotel", "title": "Goa Beachfront Villa",
         "type": "Beach House", "city": "Goa", "location": "Anjuna Beach, Goa",
         "rent_inr": 4500, "rent_label": "₹4,500/night", "orig_inr": 7000, "orig_label": "₹7,000/night",
         "discount": "36%", "amenities": ["Beach access", "Jacuzzi", "Housekeeping"],
         "rating": 4.9, "reviews": 88, "beds": "10 guests · 4BHK", "available": 2,
         "color": "#3B82F6", "featured": True, "emoji": "🏖️",
         "perk": "₹1,000 off for SA groups", "verified": True,
         "tags": ["beach", "group-stay"]},
        {"id": "HO6", "category": "hotel", "title": "Manali Snow Cabin",
         "type": "Mountain Cabin", "city": "Manali", "location": "Manali, Himachal",
         "rent_inr": 3200, "rent_label": "₹3,200/night", "orig_inr": 4800, "orig_label": "₹4,800/night",
         "discount": "33%", "amenities": ["Mountain view", "Bonfire", "Snow activities"],
         "rating": 4.7, "reviews": 62, "beds": "6 guests · 2 rooms", "available": 3,
         "color": "#14B8A6", "emoji": "⛰️", "perk": "Free breakfast",
         "verified": True, "tags": ["mountain", "winter"]},
        {"id": "HO7", "category": "hotel", "title": "Alleppey Houseboat",
         "type": "Houseboat", "city": "Alleppey", "location": "Alleppey, Kerala",
         "rent_inr": 6000, "rent_label": "₹6,000/night", "orig_inr": 9000, "orig_label": "₹9,000/night",
         "discount": "33%", "amenities": ["Backwater cruise", "Chef on board", "WiFi"],
         "rating": 4.8, "reviews": 44, "beds": "4 guests · 2 cabins", "available": 1,
         "color": "#22C55E", "emoji": "⛵", "perk": "SA exclusive — 33% off",
         "verified": True, "tags": ["unique", "backwater"]},
        {"id": "HO8", "category": "hotel", "title": "Nashik Farmhouse Estate",
         "type": "Weekend Getaway", "city": "Nashik", "location": "Nashik, Maharashtra",
         "rent_inr": 8000, "rent_label": "₹8,000/night", "orig_inr": 12000, "orig_label": "₹12,000/night",
         "discount": "33%", "amenities": ["Private pool", "Vineyard walk", "BBQ"],
         "rating": 4.8, "reviews": 56, "beds": "8 guests · 4 rooms", "available": 5,
         "color": "#22C55E", "featured": True, "emoji": "🌳",
         "perk": "₹2,000 off for alumni groups", "verified": True,
         "tags": ["farmhouse", "weekend"]},
        {"id": "HO9", "category": "hotel", "title": "Lonavala Hill Farm",
         "type": "Group Retreat", "city": "Lonavala", "location": "Lonavala, Maharashtra",
         "rent_inr": 15000, "rent_label": "₹15,000/night", "orig_inr": 20000, "orig_label": "₹20,000/night",
         "discount": "25%", "amenities": ["Bonfire", "Indoor games", "Catering"],
         "rating": 4.6, "reviews": 42, "beds": "15 guests · 6 rooms", "available": 3,
         "color": "#F97316", "emoji": "🏕️", "perk": "₹3,000 off 2+ nights",
         "verified": True, "tags": ["group", "retreat"]},
        {"id": "HO10", "category": "hotel", "title": "Coorg Coffee Plantation Stay",
         "type": "Weekend Getaway", "city": "Coorg", "location": "Coorg, Karnataka",
         "rent_inr": 5500, "rent_label": "₹5,500/night", "orig_inr": 7500, "orig_label": "₹7,500/night",
         "discount": "27%", "amenities": ["Plantation tour", "Jungle trek", "Homefood"],
         "rating": 4.9, "reviews": 78, "beds": "6 guests · 3 rooms", "available": 2,
         "color": "#8B5CF6", "emoji": "☕", "perk": "15% off for SA",
         "verified": True, "tags": ["nature", "coffee"]},
        {"id": "HO11", "category": "hotel", "title": "Udaipur Lake Palace View",
         "type": "Heritage Hotel", "city": "Udaipur", "location": "Udaipur, Rajasthan",
         "rent_inr": 4200, "rent_label": "₹4,200/night", "orig_inr": 6500, "orig_label": "₹6,500/night",
         "discount": "35%", "amenities": ["Lake view", "Heritage decor", "Breakfast"],
         "rating": 4.7, "reviews": 156, "beds": "Lake view suite", "available": 6,
         "color": "#EC4899", "emoji": "🏰", "perk": "Welcome drink + ₹500 spa credit",
         "verified": True, "tags": ["heritage", "romantic"]},
        {"id": "HO12", "category": "hotel", "title": "Rishikesh Yoga Retreat",
         "type": "Wellness Stay", "city": "Rishikesh", "location": "Rishikesh, Uttarakhand",
         "rent_inr": 2800, "rent_label": "₹2,800/night", "orig_inr": 4500, "orig_label": "₹4,500/night",
         "discount": "38%", "amenities": ["Yoga sessions", "Sattvic meals", "River view"],
         "rating": 4.8, "reviews": 124, "beds": "Single / Twin", "available": 8,
         "color": "#10B981", "featured": True, "emoji": "🧘",
         "perk": "Free yoga + meditation for SA", "verified": True,
         "tags": ["wellness", "yoga"]},

        # ── COWORKING (8) ──
        {"id": "CO1", "category": "coworking", "title": "WeWork Hot Desk Student",
         "type": "Hot Desk", "city": "Bengaluru", "location": "Bengaluru · Mumbai · Delhi",
         "rent_inr": 3999, "rent_label": "₹3,999/mo", "orig_inr": 6500, "orig_label": "₹6,500/mo",
         "discount": "38%", "amenities": ["High-speed net", "Coffee", "Meeting rooms"],
         "rating": 4.6, "reviews": 340, "beds": "Hot desk · Flexible", "available": 30,
         "color": "#8B5CF6", "featured": True, "emoji": "💼",
         "perk": "Free 3-day trial", "verified": True,
         "tags": ["hot-desk", "premium"]},
        {"id": "CO2", "category": "coworking", "title": "IndiQube Private Cabin",
         "type": "Private Cabin", "city": "Bengaluru", "location": "Bengaluru · Hyderabad",
         "rent_inr": 7999, "rent_label": "₹7,999/mo", "orig_inr": 11000, "orig_label": "₹11,000/mo",
         "discount": "27%", "amenities": ["Dedicated net", "Reception", "24x7 access"],
         "rating": 4.5, "reviews": 180, "beds": "2-person cabin", "available": 5,
         "color": "#6366F1", "emoji": "🧑‍💻", "perk": "₹1,000 off first month",
         "verified": True, "tags": ["private-cabin", "24x7"]},
        {"id": "CO3", "category": "coworking", "title": "91springboard Day Pass",
         "type": "Day Pass", "city": "Pan India", "location": "9 cities · 30+ centres",
         "rent_inr": 599, "rent_label": "₹599/day", "orig_inr": 999, "orig_label": "₹999/day",
         "discount": "40%", "amenities": ["WiFi", "Coffee", "Print quota"],
         "rating": 4.4, "reviews": 1100, "beds": "Day pass", "available": 999,
         "color": "#F59E0B", "emoji": "🪑", "perk": "5 day-passes for ₹2,499",
         "verified": True, "tags": ["flexible", "day-pass"]},
        {"id": "CO4", "category": "coworking", "title": "Awfis Flexi Desk",
         "type": "Flexi Desk", "city": "Mumbai", "location": "Mumbai · Pune · Chennai",
         "rent_inr": 4499, "rent_label": "₹4,499/mo", "orig_inr": 6500, "orig_label": "₹6,500/mo",
         "discount": "31%", "amenities": ["WiFi", "Pantry", "Lockers"],
         "rating": 4.5, "reviews": 245, "beds": "Flexi desk", "available": 18,
         "color": "#EF4444", "emoji": "🖥️", "perk": "1 free meeting room hour/day",
         "verified": True, "tags": ["flexi", "lockers"]},
        {"id": "CO5", "category": "coworking", "title": "Innov8 Premium Lounge",
         "type": "Hot Desk", "city": "Delhi", "location": "Connaught Place · Gurgaon",
         "rent_inr": 5499, "rent_label": "₹5,499/mo", "orig_inr": 8000, "orig_label": "₹8,000/mo",
         "discount": "31%", "amenities": ["Coffee bar", "Phone booths", "Events"],
         "rating": 4.6, "reviews": 198, "beds": "Hot desk", "available": 14,
         "color": "#3B82F6", "featured": True, "emoji": "☕",
         "perk": "Free coffee + 2 events/mo", "verified": True,
         "tags": ["premium", "events"]},
        {"id": "CO6", "category": "coworking", "title": "MyBranch Tier-2 Cabin",
         "type": "Private Cabin", "city": "Lucknow", "location": "20+ Tier-2 cities",
         "rent_inr": 4999, "rent_label": "₹4,999/mo", "orig_inr": 7500, "orig_label": "₹7,500/mo",
         "discount": "33%", "amenities": ["AC", "Power backup", "Receptionist"],
         "rating": 4.3, "reviews": 67, "beds": "Cabin (1-2 ppl)", "available": 9,
         "color": "#22C55E", "emoji": "🏢", "perk": "Free GST-billing setup",
         "verified": True, "tags": ["tier-2", "small-biz"]},
        {"id": "CO7", "category": "coworking", "title": "Smartworks Enterprise Cabin",
         "type": "Private Cabin", "city": "Bengaluru", "location": "Bengaluru · Hyderabad · Pune",
         "rent_inr": 9999, "rent_label": "₹9,999/mo", "orig_inr": 13500, "orig_label": "₹13,500/mo",
         "discount": "26%", "amenities": ["Conference rooms", "Cafeteria", "Parking"],
         "rating": 4.7, "reviews": 312, "beds": "4-person cabin", "available": 4,
         "color": "#10B981", "emoji": "🏛️", "perk": "10 hrs conference room free",
         "verified": True, "tags": ["enterprise", "team"]},
        {"id": "CO8", "category": "coworking", "title": "BHIVE Workspace — Koramangala",
         "type": "Hot Desk", "city": "Bengaluru", "location": "Koramangala, Bengaluru",
         "rent_inr": 3499, "rent_label": "₹3,499/mo", "orig_inr": 5000, "orig_label": "₹5,000/mo",
         "discount": "30%", "amenities": ["Startup community", "Mentor sessions", "WiFi"],
         "rating": 4.6, "reviews": 156, "beds": "Hot desk", "available": 22,
         "color": "#EC4899", "emoji": "🐝", "perk": "Free startup mentor session",
         "verified": True, "tags": ["startup", "community"]},
    ]


# Patch malformed CO2 entry from inline trick (cleanup)
def _normalised_listings() -> List[Dict[str, Any]]:
    items = []
    for raw in _seed_listings():
        d = dict(raw)
        if 'available' not in d and 'available_count' in d:
            d['available'] = d.pop('available_count')
        items.append(d)
    return items


# ─── Endpoints ───────────────────────────────────────────────────────────
@router.get("/rentals/categories")
async def rentals_categories(user: dict = Depends(_auth())):
    items = _normalised_listings()
    counts = {c['id']: 0 for c in CATEGORIES}
    for it in items:
        counts[it['category']] = counts.get(it['category'], 0) + 1
    cats = []
    for c in CATEGORIES:
        cats.append({**c, "count": counts.get(c['id'], 0)})
    return {"categories": cats, "total": len(items),
            "verified": sum(1 for i in items if i.get('verified')),
            "featured": sum(1 for i in items if i.get('featured'))}


@router.get("/rentals/listings")
async def rentals_listings(
    category: str = Query("all"),
    city: str = Query("all"),
    min_price: int = Query(0),
    max_price: int = Query(0),
    q: str = Query(""),
    user: dict = Depends(_auth()),
):
    items = _normalised_listings()
    if category and category != "all":
        items = [i for i in items if i['category'] == category]
    if city and city != "all":
        items = [i for i in items if city.lower() in (i.get('city', '') + ' ' + i.get('location', '')).lower()]
    if min_price:
        items = [i for i in items if i.get('rent_inr', 0) >= min_price]
    if max_price:
        items = [i for i in items if i.get('rent_inr', 0) <= max_price]
    if q:
        ql = q.lower()
        items = [i for i in items if ql in i.get('title', '').lower()
                 or ql in i.get('location', '').lower()
                 or ql in i.get('type', '').lower()
                 or any(ql in (t or '').lower() for t in i.get('tags', []))]
    items.sort(key=lambda x: (-1 if x.get('featured') else 0, -float(x.get('rating', 0))))
    return {"listings": items, "total": len(items),
            "fetched_at": datetime.now(timezone.utc).isoformat()}


@router.get("/rentals/listings/{listing_id}")
async def rentals_listing_detail(listing_id: str, user: dict = Depends(_auth())):
    item = next((i for i in _normalised_listings() if i['id'] == listing_id), None)
    if not item:
        raise HTTPException(404, "Listing not found")
    # Pseudo gallery + house rules
    detail = {**item,
              "gallery": [item.get('emoji', '🏠')] * 4,
              "description": _description_for(item),
              "house_rules": ["Valid SA-ID required at check-in",
                              "No smoking inside premises",
                              "Pets allowed only with prior approval",
                              "Cancellation: 24h prior for full refund"],
              "host": {"name": "SA Verified Partner", "rating": item.get('rating', 4.5),
                       "response_time_hrs": 2, "verified": True}}
    return {"listing": detail}


def _description_for(it: Dict[str, Any]) -> str:
    base = f"{it.get('title')} is a {it.get('type','listing').lower()} located in {it.get('location')}. "
    base += f"Rated {it.get('rating')}/5 by {it.get('reviews')} verified members. "
    if it.get('amenities'):
        base += f"Includes {', '.join(it['amenities'][:3])}. "
    if it.get('perk'):
        base += f"Exclusive SA perk: {it['perk']}."
    return base


# ─── Bookings ────────────────────────────────────────────────────────────
async def _create_booking(user: dict, listing: Dict[str, Any], body: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    check_in_raw = (body or {}).get("check_in")
    check_out_raw = (body or {}).get("check_out")
    try:
        check_in = datetime.fromisoformat(check_in_raw.replace('Z', '+00:00')) if check_in_raw else (now + timedelta(days=2))
        check_out = datetime.fromisoformat(check_out_raw.replace('Z', '+00:00')) if check_out_raw else (now + timedelta(days=4))
    except Exception:
        check_in = now + timedelta(days=2)
        check_out = now + timedelta(days=4)
    if check_in.tzinfo is None:
        check_in = check_in.replace(tzinfo=timezone.utc)
    if check_out.tzinfo is None:
        check_out = check_out.replace(tzinfo=timezone.utc)

    duration_days = max(1, (check_out - check_in).days)
    is_monthly = '/mo' in (listing.get('rent_label') or '').lower()
    if is_monthly:
        units = max(1, duration_days // 30) if duration_days >= 30 else 1
        unit_label = 'months'
    else:
        units = duration_days
        unit_label = 'nights'
    rent = int(listing.get('rent_inr', 0))
    orig = int(listing.get('orig_inr', 0))
    subtotal = rent * units
    orig_subtotal = orig * units
    sa_savings = max(0, orig_subtotal - subtotal)
    service_fee = int(round(subtotal * 0.04))
    deposit = rent if listing['category'] in ('housing', 'coworking') else 0
    total = subtotal + service_fee + deposit

    timeline = [
        {"id": "booked",     "label": "Booking placed",   "date": now.isoformat(),                                       "status": "done"},
        {"id": "confirmed",  "label": "Owner confirms",    "date": (now + timedelta(hours=4)).isoformat(),                "status": "current"},
        {"id": "checkin",    "label": "Check-in",          "date": check_in.isoformat(),                                  "status": "pending"},
        {"id": "checkout",   "label": "Check-out",         "date": check_out.isoformat(),                                 "status": "pending"},
        {"id": "completed",  "label": "Stay completed",    "date": (check_out + timedelta(hours=2)).isoformat(),          "status": "pending"},
    ]

    booking = {
        "_id": ObjectId(),
        "booking_id": "RNT-" + uuid.uuid4().hex[:8].upper(),
        "user_id": str(user["_id"]),
        "listing_id": listing['id'],
        "listing_snapshot": listing,
        "category": listing.get('category'),
        "status": "confirmed",
        "guests": int((body or {}).get("guests", 1)),
        "check_in": check_in,
        "check_out": check_out,
        "duration": {"value": units, "unit": unit_label, "days": duration_days},
        "cost_breakdown": {
            "rate_per_unit_inr": rent,
            "units": units,
            "unit": unit_label,
            "subtotal_inr": subtotal,
            "sa_savings_inr": sa_savings,
            "service_fee_inr": service_fee,
            "security_deposit_inr": deposit,
            "total_inr": total,
        },
        "timeline": timeline,
        "notes": (body or {}).get("notes", "") or "",
        "created_at": now,
        "updated_at": now,
    }
    await _db.rental_bookings.insert_one(booking)
    return _serialize_booking(booking)


def _serialize_booking(d: Dict[str, Any]) -> Dict[str, Any]:
    d = dict(d)
    d.pop("_id", None)
    for k in ("check_in", "check_out", "created_at", "updated_at"):
        v = d.get(k)
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    if d.get('check_out'):
        try:
            co = datetime.fromisoformat(d['check_out'].replace('Z', '+00:00'))
            if co.tzinfo is None:
                co = co.replace(tzinfo=timezone.utc)
            d['days_until_checkout'] = max(0, (co - datetime.now(timezone.utc)).days)
        except Exception:
            d['days_until_checkout'] = None
    return d


@router.post("/rentals/book")
async def rentals_book(body: Dict[str, Any], user: dict = Depends(_auth())):
    lid = (body or {}).get("listing_id")
    if not lid:
        raise HTTPException(400, "listing_id required")
    listing = next((i for i in _normalised_listings() if i['id'] == lid), None)
    if not listing:
        raise HTTPException(404, "Listing not found")
    booking = await _create_booking(user, listing, body or {})
    return {"ok": True, "booking": booking,
            "redirect": f"/rentals?bookingId={booking['booking_id']}"}


@router.get("/rentals/bookings")
async def rentals_bookings_list(user: dict = Depends(_auth())):
    items = []
    async for d in _db.rental_bookings.find({"user_id": str(user["_id"])}).sort("created_at", -1):
        items.append(_serialize_booking(d))
    return {"bookings": items, "total": len(items)}


@router.get("/rentals/bookings/{booking_id}")
async def rentals_booking_detail(booking_id: str, user: dict = Depends(_auth())):
    d = await _db.rental_bookings.find_one({"booking_id": booking_id, "user_id": str(user["_id"])})
    if not d:
        raise HTTPException(404, "Booking not found")
    return {"booking": _serialize_booking(d)}


@router.post("/rentals/bookings/{booking_id}/cancel")
async def rentals_booking_cancel(booking_id: str, user: dict = Depends(_auth())):
    res = await _db.rental_bookings.update_one(
        {"booking_id": booking_id, "user_id": str(user["_id"]),
         "status": {"$in": ["confirmed", "pending"]}},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}})
    if res.matched_count == 0:
        raise HTTPException(404, "Booking not found or already cancelled")
    return {"ok": True, "booking_id": booking_id, "status": "cancelled"}


# ─── AI Recommend ────────────────────────────────────────────────────────
@router.post("/rentals/ai/recommend")
async def rentals_ai_recommend(body: Dict[str, Any], user: dict = Depends(_auth())):
    prefs = (body or {}).get("prefs") or {}
    items = _normalised_listings()
    budget = int(prefs.get("budget") or 0)
    city = (prefs.get("city") or "").strip().lower()
    cat = (prefs.get("category") or "").strip().lower()
    vibe = (prefs.get("vibe") or "").strip().lower()

    # Hard filter by category when caller is explicit about it
    if cat and cat != "all":
        items = [i for i in items if i.get('category', '') == cat]

    def _score(it: Dict[str, Any]) -> float:
        s = 0.0
        if budget and it.get('rent_inr', 0) <= budget:
            s += 25
        if budget and it.get('rent_inr', 0) <= int(budget * 0.7):
            s += 15
        if cat and it.get('category', '') == cat:
            s += 20
        if city and city in (it.get('city', '') + ' ' + it.get('location', '')).lower():
            s += 20
        if it.get('featured'):
            s += 8
        if it.get('rating', 0) >= 4.5:
            s += 8
        if vibe:
            if vibe in (it.get('title', '') + ' ' + ' '.join(it.get('tags', []))).lower():
                s += 12
        # discount weight
        try:
            disc = int((it.get('discount') or '0%').rstrip('%'))
            s += min(disc / 5, 8)
        except Exception:
            pass
        return s

    scored = sorted(items, key=_score, reverse=True)[:6]
    rationale = []
    if budget:
        rationale.append(f"Filtered to listings under ₹{budget:,}")
    if city:
        rationale.append(f"Prioritised {city.title()}")
    if cat:
        rationale.append(f"Focused on {cat.title()}")
    if not rationale:
        rationale.append("Mixed top-rated SA-verified picks across categories")

    return {"recommendations": scored,
            "rationale": " · ".join(rationale),
            "fetched_at": datetime.now(timezone.utc).isoformat()}
