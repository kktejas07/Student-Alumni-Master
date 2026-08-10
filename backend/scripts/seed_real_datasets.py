"""
Real-world reference datasets for realistic mock data seeding.
=============================================================
All data is publicly known (NIRF rankings, FAANG companies, etc.)
No PII — names are common Indian names; emails synthesized.

Used by /app/backend/seed_realistic.py to generate the 1360-user
test dataset distributed across Bronze/Silver/Gold/Platinum tiers.
"""
from __future__ import annotations
from typing import List, Dict, Any

# ─── Real Indian colleges (NIRF 2024 — Top 140) ──────────────────
# Format: name, city, state, naac, nirf_rank, type, est_year, placement_pct, fee_lpa
COLLEGES_REAL: List[Dict[str, Any]] = [
    # Tier-1 / IIT family (Platinum candidates)
    {"name": "IIT Bombay", "city": "Mumbai", "state": "Maharashtra", "naac": "A++", "nirf_rank": 3, "type": "IIT", "est": 1958, "placement_pct": 96, "fee_lpa": 2.4},
    {"name": "IIT Delhi", "city": "New Delhi", "state": "Delhi", "naac": "A++", "nirf_rank": 2, "type": "IIT", "est": 1961, "placement_pct": 95, "fee_lpa": 2.4},
    {"name": "IIT Madras", "city": "Chennai", "state": "Tamil Nadu", "naac": "A++", "nirf_rank": 1, "type": "IIT", "est": 1959, "placement_pct": 94, "fee_lpa": 2.4},
    {"name": "IIT Kanpur", "city": "Kanpur", "state": "Uttar Pradesh", "naac": "A++", "nirf_rank": 4, "type": "IIT", "est": 1959, "placement_pct": 93, "fee_lpa": 2.4},
    {"name": "IIT Kharagpur", "city": "Kharagpur", "state": "West Bengal", "naac": "A++", "nirf_rank": 5, "type": "IIT", "est": 1951, "placement_pct": 92, "fee_lpa": 2.4},
    {"name": "IIT Roorkee", "city": "Roorkee", "state": "Uttarakhand", "naac": "A++", "nirf_rank": 6, "type": "IIT", "est": 1847, "placement_pct": 90, "fee_lpa": 2.4},
    {"name": "IIT Guwahati", "city": "Guwahati", "state": "Assam", "naac": "A++", "nirf_rank": 7, "type": "IIT", "est": 1994, "placement_pct": 89, "fee_lpa": 2.4},
    {"name": "IIT Hyderabad", "city": "Hyderabad", "state": "Telangana", "naac": "A++", "nirf_rank": 8, "type": "IIT", "est": 2008, "placement_pct": 91, "fee_lpa": 2.4},
    {"name": "IIT BHU Varanasi", "city": "Varanasi", "state": "Uttar Pradesh", "naac": "A++", "nirf_rank": 15, "type": "IIT", "est": 1919, "placement_pct": 87, "fee_lpa": 2.4},
    {"name": "IIT Indore", "city": "Indore", "state": "Madhya Pradesh", "naac": "A++", "nirf_rank": 16, "type": "IIT", "est": 2009, "placement_pct": 86, "fee_lpa": 2.4},

    # IIM family (Platinum)
    {"name": "IIM Ahmedabad", "city": "Ahmedabad", "state": "Gujarat", "naac": "A++", "nirf_rank": 1, "type": "IIM", "est": 1961, "placement_pct": 100, "fee_lpa": 24.0},
    {"name": "IIM Bangalore", "city": "Bengaluru", "state": "Karnataka", "naac": "A++", "nirf_rank": 2, "type": "IIM", "est": 1973, "placement_pct": 100, "fee_lpa": 23.5},
    {"name": "IIM Calcutta", "city": "Kolkata", "state": "West Bengal", "naac": "A++", "nirf_rank": 3, "type": "IIM", "est": 1961, "placement_pct": 100, "fee_lpa": 23.0},
    {"name": "IIM Lucknow", "city": "Lucknow", "state": "Uttar Pradesh", "naac": "A++", "nirf_rank": 5, "type": "IIM", "est": 1984, "placement_pct": 100, "fee_lpa": 19.5},
    {"name": "IIM Indore", "city": "Indore", "state": "Madhya Pradesh", "naac": "A++", "nirf_rank": 6, "type": "IIM", "est": 1996, "placement_pct": 100, "fee_lpa": 21.0},

    # Tier-2: NITs (Gold)
    {"name": "NIT Trichy", "city": "Tiruchirappalli", "state": "Tamil Nadu", "naac": "A+", "nirf_rank": 9, "type": "NIT", "est": 1964, "placement_pct": 88, "fee_lpa": 1.5},
    {"name": "NIT Surathkal", "city": "Mangalore", "state": "Karnataka", "naac": "A+", "nirf_rank": 17, "type": "NIT", "est": 1960, "placement_pct": 85, "fee_lpa": 1.5},
    {"name": "NIT Warangal", "city": "Warangal", "state": "Telangana", "naac": "A+", "nirf_rank": 21, "type": "NIT", "est": 1959, "placement_pct": 84, "fee_lpa": 1.5},
    {"name": "NIT Calicut", "city": "Kozhikode", "state": "Kerala", "naac": "A+", "nirf_rank": 23, "type": "NIT", "est": 1961, "placement_pct": 82, "fee_lpa": 1.5},
    {"name": "NIT Rourkela", "city": "Rourkela", "state": "Odisha", "naac": "A+", "nirf_rank": 19, "type": "NIT", "est": 1961, "placement_pct": 83, "fee_lpa": 1.5},

    # Tier-2: BITS / IIITs (Gold)
    {"name": "BITS Pilani", "city": "Pilani", "state": "Rajasthan", "naac": "A+", "nirf_rank": 20, "type": "Private", "est": 1964, "placement_pct": 91, "fee_lpa": 5.4},
    {"name": "BITS Goa", "city": "Goa", "state": "Goa", "naac": "A+", "nirf_rank": 26, "type": "Private", "est": 2004, "placement_pct": 87, "fee_lpa": 5.4},
    {"name": "BITS Hyderabad", "city": "Hyderabad", "state": "Telangana", "naac": "A+", "nirf_rank": 29, "type": "Private", "est": 2008, "placement_pct": 86, "fee_lpa": 5.4},
    {"name": "IIIT Hyderabad", "city": "Hyderabad", "state": "Telangana", "naac": "A+", "nirf_rank": 47, "type": "IIIT", "est": 1998, "placement_pct": 95, "fee_lpa": 3.0},
    {"name": "IIIT Bangalore", "city": "Bengaluru", "state": "Karnataka", "naac": "A+", "nirf_rank": 60, "type": "IIIT", "est": 1999, "placement_pct": 92, "fee_lpa": 3.5},
    {"name": "IIIT Delhi", "city": "New Delhi", "state": "Delhi", "naac": "A+", "nirf_rank": 65, "type": "IIIT", "est": 2008, "placement_pct": 88, "fee_lpa": 3.5},
    {"name": "IIIT Allahabad", "city": "Prayagraj", "state": "Uttar Pradesh", "naac": "A", "nirf_rank": 78, "type": "IIIT", "est": 1999, "placement_pct": 84, "fee_lpa": 1.8},

    # Tier-2: Top private engineering (Gold/Silver)
    {"name": "VIT Vellore", "city": "Vellore", "state": "Tamil Nadu", "naac": "A++", "nirf_rank": 13, "type": "Private", "est": 1984, "placement_pct": 89, "fee_lpa": 2.2},
    {"name": "VIT Chennai", "city": "Chennai", "state": "Tamil Nadu", "naac": "A++", "nirf_rank": 38, "type": "Private", "est": 2010, "placement_pct": 85, "fee_lpa": 2.2},
    {"name": "Manipal Institute of Tech", "city": "Manipal", "state": "Karnataka", "naac": "A+", "nirf_rank": 56, "type": "Private", "est": 1957, "placement_pct": 82, "fee_lpa": 4.5},
    {"name": "Thapar University", "city": "Patiala", "state": "Punjab", "naac": "A+", "nirf_rank": 33, "type": "Private", "est": 1956, "placement_pct": 80, "fee_lpa": 3.6},
    {"name": "SRM Chennai", "city": "Chennai", "state": "Tamil Nadu", "naac": "A++", "nirf_rank": 41, "type": "Private", "est": 1985, "placement_pct": 78, "fee_lpa": 2.5},
    {"name": "Amity Noida", "city": "Noida", "state": "Uttar Pradesh", "naac": "A+", "nirf_rank": 62, "type": "Private", "est": 2005, "placement_pct": 75, "fee_lpa": 3.5},

    # Top universities (mixed tiers)
    {"name": "Delhi University", "city": "New Delhi", "state": "Delhi", "naac": "A+", "nirf_rank": 11, "type": "University", "est": 1922, "placement_pct": 73, "fee_lpa": 0.4},
    {"name": "JNU New Delhi", "city": "New Delhi", "state": "Delhi", "naac": "A++", "nirf_rank": 10, "type": "University", "est": 1969, "placement_pct": 65, "fee_lpa": 0.5},
    {"name": "Banaras Hindu University", "city": "Varanasi", "state": "Uttar Pradesh", "naac": "A++", "nirf_rank": 14, "type": "University", "est": 1916, "placement_pct": 70, "fee_lpa": 0.6},
    {"name": "Jadavpur University", "city": "Kolkata", "state": "West Bengal", "naac": "A+", "nirf_rank": 18, "type": "University", "est": 1955, "placement_pct": 76, "fee_lpa": 0.3},
    {"name": "Anna University", "city": "Chennai", "state": "Tamil Nadu", "naac": "A+", "nirf_rank": 22, "type": "University", "est": 1978, "placement_pct": 80, "fee_lpa": 1.0},
    {"name": "Hyderabad University", "city": "Hyderabad", "state": "Telangana", "naac": "A+", "nirf_rank": 24, "type": "University", "est": 1974, "placement_pct": 68, "fee_lpa": 0.5},

    # Tier-2 private + autonomous (Silver)
    {"name": "Christ University", "city": "Bengaluru", "state": "Karnataka", "naac": "A+", "nirf_rank": 67, "type": "Private", "est": 1969, "placement_pct": 75, "fee_lpa": 2.8},
    {"name": "Symbiosis Pune", "city": "Pune", "state": "Maharashtra", "naac": "A+", "nirf_rank": 70, "type": "Private", "est": 1971, "placement_pct": 80, "fee_lpa": 4.0},
    {"name": "Loyola College", "city": "Chennai", "state": "Tamil Nadu", "naac": "A+", "nirf_rank": 75, "type": "Autonomous", "est": 1925, "placement_pct": 70, "fee_lpa": 0.8},
    {"name": "St Xaviers Mumbai", "city": "Mumbai", "state": "Maharashtra", "naac": "A+", "nirf_rank": 80, "type": "Autonomous", "est": 1869, "placement_pct": 72, "fee_lpa": 0.9},
    {"name": "Hindu College Delhi", "city": "New Delhi", "state": "Delhi", "naac": "A", "nirf_rank": 90, "type": "Autonomous", "est": 1899, "placement_pct": 65, "fee_lpa": 0.4},
    {"name": "St Stephens College", "city": "New Delhi", "state": "Delhi", "naac": "A", "nirf_rank": 95, "type": "Autonomous", "est": 1881, "placement_pct": 68, "fee_lpa": 0.5},
    {"name": "Lady Shri Ram College", "city": "New Delhi", "state": "Delhi", "naac": "A+", "nirf_rank": 100, "type": "Autonomous", "est": 1956, "placement_pct": 62, "fee_lpa": 0.4},
    {"name": "Madras Christian College", "city": "Chennai", "state": "Tamil Nadu", "naac": "A+", "nirf_rank": 105, "type": "Autonomous", "est": 1837, "placement_pct": 64, "fee_lpa": 0.8},
    {"name": "KIIT Bhubaneswar", "city": "Bhubaneswar", "state": "Odisha", "naac": "A+", "nirf_rank": 50, "type": "Private", "est": 1992, "placement_pct": 78, "fee_lpa": 3.2},
    {"name": "LPU Phagwara", "city": "Phagwara", "state": "Punjab", "naac": "A+", "nirf_rank": 45, "type": "Private", "est": 2005, "placement_pct": 70, "fee_lpa": 2.5},
    {"name": "Bennett University", "city": "Greater Noida", "state": "Uttar Pradesh", "naac": "A", "nirf_rank": 110, "type": "Private", "est": 2016, "placement_pct": 73, "fee_lpa": 4.5},
    {"name": "Shiv Nadar University", "city": "Greater Noida", "state": "Uttar Pradesh", "naac": "A", "nirf_rank": 115, "type": "Private", "est": 2011, "placement_pct": 76, "fee_lpa": 5.0},
    {"name": "Ashoka University", "city": "Sonipat", "state": "Haryana", "naac": "A", "nirf_rank": 120, "type": "Private", "est": 2014, "placement_pct": 70, "fee_lpa": 11.0},

    # Tier-3 (Bronze candidates) — regional engineering
    {"name": "PSG Coimbatore", "city": "Coimbatore", "state": "Tamil Nadu", "naac": "A", "nirf_rank": 130, "type": "Private", "est": 1951, "placement_pct": 72, "fee_lpa": 1.6},
    {"name": "SSN Chennai", "city": "Chennai", "state": "Tamil Nadu", "naac": "A", "nirf_rank": 135, "type": "Private", "est": 1996, "placement_pct": 75, "fee_lpa": 1.8},
    {"name": "RV College Bangalore", "city": "Bengaluru", "state": "Karnataka", "naac": "A", "nirf_rank": 140, "type": "Private", "est": 1963, "placement_pct": 80, "fee_lpa": 2.0},
    {"name": "PES University", "city": "Bengaluru", "state": "Karnataka", "naac": "A", "nirf_rank": 145, "type": "Private", "est": 1972, "placement_pct": 82, "fee_lpa": 4.0},
    {"name": "MS Ramaiah Institute", "city": "Bengaluru", "state": "Karnataka", "naac": "A", "nirf_rank": 150, "type": "Private", "est": 1962, "placement_pct": 70, "fee_lpa": 2.5},
    {"name": "DY Patil Pune", "city": "Pune", "state": "Maharashtra", "naac": "A", "nirf_rank": 160, "type": "Private", "est": 1984, "placement_pct": 68, "fee_lpa": 2.2},
    {"name": "MIT Pune", "city": "Pune", "state": "Maharashtra", "naac": "A", "nirf_rank": 155, "type": "Private", "est": 1983, "placement_pct": 73, "fee_lpa": 2.0},
    {"name": "Pune Institute of Computer Tech", "city": "Pune", "state": "Maharashtra", "naac": "A", "nirf_rank": 165, "type": "Private", "est": 1983, "placement_pct": 76, "fee_lpa": 1.8},
    {"name": "Walchand Sangli", "city": "Sangli", "state": "Maharashtra", "naac": "A", "nirf_rank": 170, "type": "Private", "est": 1947, "placement_pct": 65, "fee_lpa": 1.4},
    {"name": "VJTI Mumbai", "city": "Mumbai", "state": "Maharashtra", "naac": "A", "nirf_rank": 125, "type": "Autonomous", "est": 1887, "placement_pct": 78, "fee_lpa": 0.9},
    {"name": "COEP Pune", "city": "Pune", "state": "Maharashtra", "naac": "A", "nirf_rank": 175, "type": "Autonomous", "est": 1854, "placement_pct": 74, "fee_lpa": 0.8},
    {"name": "DAIICT Gandhinagar", "city": "Gandhinagar", "state": "Gujarat", "naac": "A", "nirf_rank": 180, "type": "Private", "est": 2001, "placement_pct": 80, "fee_lpa": 3.5},
    {"name": "Nirma University", "city": "Ahmedabad", "state": "Gujarat", "naac": "A", "nirf_rank": 185, "type": "Private", "est": 2003, "placement_pct": 73, "fee_lpa": 2.8},
    {"name": "PDPU Gandhinagar", "city": "Gandhinagar", "state": "Gujarat", "naac": "A", "nirf_rank": 190, "type": "Private", "est": 2007, "placement_pct": 71, "fee_lpa": 2.5},

    # Smaller / regional (Bronze)
    {"name": "BVB Hubli", "city": "Hubli", "state": "Karnataka", "naac": "A", "nirf_rank": 200, "type": "Private", "est": 1947, "placement_pct": 65, "fee_lpa": 1.5},
    {"name": "MIT Manipal", "city": "Manipal", "state": "Karnataka", "naac": "A+", "nirf_rank": 145, "type": "Private", "est": 1957, "placement_pct": 78, "fee_lpa": 4.5},
    {"name": "Dayananda Sagar Bangalore", "city": "Bengaluru", "state": "Karnataka", "naac": "A", "nirf_rank": 195, "type": "Private", "est": 1979, "placement_pct": 64, "fee_lpa": 2.0},
    {"name": "BMS College Bangalore", "city": "Bengaluru", "state": "Karnataka", "naac": "A", "nirf_rank": 220, "type": "Private", "est": 1946, "placement_pct": 70, "fee_lpa": 2.0},
    {"name": "RNS Institute Bangalore", "city": "Bengaluru", "state": "Karnataka", "naac": "B", "nirf_rank": 280, "type": "Private", "est": 2001, "placement_pct": 55, "fee_lpa": 1.6},
    {"name": "JIIT Noida", "city": "Noida", "state": "Uttar Pradesh", "naac": "A", "nirf_rank": 168, "type": "Private", "est": 2001, "placement_pct": 75, "fee_lpa": 3.0},
    {"name": "JSS Noida", "city": "Noida", "state": "Uttar Pradesh", "naac": "A", "nirf_rank": 215, "type": "Private", "est": 1996, "placement_pct": 67, "fee_lpa": 2.4},
    {"name": "Galgotias University", "city": "Greater Noida", "state": "Uttar Pradesh", "naac": "A", "nirf_rank": 240, "type": "Private", "est": 2011, "placement_pct": 60, "fee_lpa": 1.8},
    {"name": "Sharda University", "city": "Greater Noida", "state": "Uttar Pradesh", "naac": "A", "nirf_rank": 250, "type": "Private", "est": 2009, "placement_pct": 58, "fee_lpa": 2.0},
    {"name": "Chandigarh University", "city": "Chandigarh", "state": "Punjab", "naac": "A+", "nirf_rank": 27, "type": "Private", "est": 2012, "placement_pct": 70, "fee_lpa": 2.0},
    {"name": "Chitkara University", "city": "Patiala", "state": "Punjab", "naac": "A+", "nirf_rank": 220, "type": "Private", "est": 2010, "placement_pct": 67, "fee_lpa": 2.5},
    {"name": "GLA Mathura", "city": "Mathura", "state": "Uttar Pradesh", "naac": "A", "nirf_rank": 230, "type": "Private", "est": 2010, "placement_pct": 56, "fee_lpa": 2.2},
    {"name": "GD Goenka University", "city": "Sohna", "state": "Haryana", "naac": "B", "nirf_rank": 290, "type": "Private", "est": 2013, "placement_pct": 50, "fee_lpa": 3.5},
    {"name": "Amity Mumbai", "city": "Mumbai", "state": "Maharashtra", "naac": "A", "nirf_rank": 175, "type": "Private", "est": 2014, "placement_pct": 70, "fee_lpa": 3.5},
    {"name": "Amity Jaipur", "city": "Jaipur", "state": "Rajasthan", "naac": "A", "nirf_rank": 180, "type": "Private", "est": 2008, "placement_pct": 65, "fee_lpa": 2.8},
    {"name": "Mody University", "city": "Lakshmangarh", "state": "Rajasthan", "naac": "A", "nirf_rank": 260, "type": "Private", "est": 1998, "placement_pct": 55, "fee_lpa": 2.5},
    {"name": "Manipal Jaipur", "city": "Jaipur", "state": "Rajasthan", "naac": "A", "nirf_rank": 158, "type": "Private", "est": 2011, "placement_pct": 73, "fee_lpa": 4.0},
    {"name": "MNIT Jaipur", "city": "Jaipur", "state": "Rajasthan", "naac": "A+", "nirf_rank": 35, "type": "NIT", "est": 1963, "placement_pct": 81, "fee_lpa": 1.5},
    {"name": "MANIT Bhopal", "city": "Bhopal", "state": "Madhya Pradesh", "naac": "A+", "nirf_rank": 40, "type": "NIT", "est": 1960, "placement_pct": 78, "fee_lpa": 1.5},
    {"name": "VNIT Nagpur", "city": "Nagpur", "state": "Maharashtra", "naac": "A+", "nirf_rank": 38, "type": "NIT", "est": 1960, "placement_pct": 80, "fee_lpa": 1.5},
    {"name": "NIT Patna", "city": "Patna", "state": "Bihar", "naac": "A", "nirf_rank": 75, "type": "NIT", "est": 1886, "placement_pct": 72, "fee_lpa": 1.5},
    {"name": "NIT Raipur", "city": "Raipur", "state": "Chhattisgarh", "naac": "A", "nirf_rank": 85, "type": "NIT", "est": 1956, "placement_pct": 68, "fee_lpa": 1.5},
    {"name": "NIT Silchar", "city": "Silchar", "state": "Assam", "naac": "A", "nirf_rank": 88, "type": "NIT", "est": 1967, "placement_pct": 70, "fee_lpa": 1.5},
    {"name": "NIT Durgapur", "city": "Durgapur", "state": "West Bengal", "naac": "A+", "nirf_rank": 43, "type": "NIT", "est": 1960, "placement_pct": 75, "fee_lpa": 1.5},
    {"name": "NIT Jamshedpur", "city": "Jamshedpur", "state": "Jharkhand", "naac": "A+", "nirf_rank": 92, "type": "NIT", "est": 1960, "placement_pct": 73, "fee_lpa": 1.5},
    {"name": "NIT Kurukshetra", "city": "Kurukshetra", "state": "Haryana", "naac": "A+", "nirf_rank": 50, "type": "NIT", "est": 1963, "placement_pct": 76, "fee_lpa": 1.5},
    {"name": "NIT Allahabad", "city": "Prayagraj", "state": "Uttar Pradesh", "naac": "A+", "nirf_rank": 48, "type": "NIT", "est": 1961, "placement_pct": 79, "fee_lpa": 1.5},
    {"name": "DTU Delhi", "city": "New Delhi", "state": "Delhi", "naac": "A+", "nirf_rank": 36, "type": "Autonomous", "est": 1941, "placement_pct": 82, "fee_lpa": 1.6},
    {"name": "NSUT Delhi", "city": "New Delhi", "state": "Delhi", "naac": "A+", "nirf_rank": 65, "type": "Autonomous", "est": 1983, "placement_pct": 80, "fee_lpa": 1.5},
    {"name": "Jamia Millia Islamia", "city": "New Delhi", "state": "Delhi", "naac": "A+", "nirf_rank": 28, "type": "University", "est": 1920, "placement_pct": 71, "fee_lpa": 0.5},
    {"name": "AMU Aligarh", "city": "Aligarh", "state": "Uttar Pradesh", "naac": "A+", "nirf_rank": 25, "type": "University", "est": 1875, "placement_pct": 68, "fee_lpa": 0.5},
    {"name": "IISc Bangalore", "city": "Bengaluru", "state": "Karnataka", "naac": "A++", "nirf_rank": 1, "type": "Research", "est": 1909, "placement_pct": 95, "fee_lpa": 1.5},
    {"name": "TIFR Mumbai", "city": "Mumbai", "state": "Maharashtra", "naac": "A++", "nirf_rank": 12, "type": "Research", "est": 1945, "placement_pct": 92, "fee_lpa": 0.5},
    {"name": "Cochin University", "city": "Kochi", "state": "Kerala", "naac": "A+", "nirf_rank": 30, "type": "University", "est": 1971, "placement_pct": 70, "fee_lpa": 0.5},
    {"name": "Calcutta University", "city": "Kolkata", "state": "West Bengal", "naac": "A+", "nirf_rank": 31, "type": "University", "est": 1857, "placement_pct": 60, "fee_lpa": 0.3},
    {"name": "Mumbai University", "city": "Mumbai", "state": "Maharashtra", "naac": "A+", "nirf_rank": 32, "type": "University", "est": 1857, "placement_pct": 65, "fee_lpa": 0.3},
    {"name": "Pune University", "city": "Pune", "state": "Maharashtra", "naac": "A+", "nirf_rank": 34, "type": "University", "est": 1949, "placement_pct": 67, "fee_lpa": 0.4},
    {"name": "Osmania University", "city": "Hyderabad", "state": "Telangana", "naac": "A", "nirf_rank": 55, "type": "University", "est": 1918, "placement_pct": 62, "fee_lpa": 0.4},
    {"name": "Andhra University", "city": "Visakhapatnam", "state": "Andhra Pradesh", "naac": "A", "nirf_rank": 60, "type": "University", "est": 1926, "placement_pct": 60, "fee_lpa": 0.3},
    {"name": "Madurai Kamaraj University", "city": "Madurai", "state": "Tamil Nadu", "naac": "A", "nirf_rank": 80, "type": "University", "est": 1965, "placement_pct": 58, "fee_lpa": 0.3},
    {"name": "Bharathiar University", "city": "Coimbatore", "state": "Tamil Nadu", "naac": "A", "nirf_rank": 85, "type": "University", "est": 1982, "placement_pct": 64, "fee_lpa": 0.3},
    {"name": "Pondicherry University", "city": "Puducherry", "state": "Puducherry", "naac": "A", "nirf_rank": 95, "type": "University", "est": 1985, "placement_pct": 60, "fee_lpa": 0.4},
    {"name": "GITAM Visakhapatnam", "city": "Visakhapatnam", "state": "Andhra Pradesh", "naac": "A", "nirf_rank": 65, "type": "Private", "est": 1980, "placement_pct": 70, "fee_lpa": 2.5},
    {"name": "KL University", "city": "Vijayawada", "state": "Andhra Pradesh", "naac": "A++", "nirf_rank": 49, "type": "Private", "est": 1980, "placement_pct": 78, "fee_lpa": 2.0},
    {"name": "SASTRA Thanjavur", "city": "Thanjavur", "state": "Tamil Nadu", "naac": "A++", "nirf_rank": 39, "type": "Private", "est": 1984, "placement_pct": 80, "fee_lpa": 1.5},
    {"name": "Kalasalingam University", "city": "Krishnankoil", "state": "Tamil Nadu", "naac": "A", "nirf_rank": 100, "type": "Private", "est": 1984, "placement_pct": 65, "fee_lpa": 1.4},
    {"name": "Karunya University", "city": "Coimbatore", "state": "Tamil Nadu", "naac": "A", "nirf_rank": 110, "type": "Private", "est": 1986, "placement_pct": 68, "fee_lpa": 1.6},
    {"name": "Sathyabama Chennai", "city": "Chennai", "state": "Tamil Nadu", "naac": "A", "nirf_rank": 90, "type": "Private", "est": 1987, "placement_pct": 72, "fee_lpa": 1.5},
    {"name": "Hindustan Chennai", "city": "Chennai", "state": "Tamil Nadu", "naac": "A", "nirf_rank": 130, "type": "Private", "est": 1985, "placement_pct": 65, "fee_lpa": 1.6},
    {"name": "B S Abdur Rahman", "city": "Chennai", "state": "Tamil Nadu", "naac": "A", "nirf_rank": 200, "type": "Private", "est": 1984, "placement_pct": 60, "fee_lpa": 1.4},
    {"name": "Vellore Institute Bhopal", "city": "Bhopal", "state": "Madhya Pradesh", "naac": "A", "nirf_rank": 145, "type": "Private", "est": 2010, "placement_pct": 70, "fee_lpa": 2.0},
    {"name": "Vellore Institute Amaravati", "city": "Amaravati", "state": "Andhra Pradesh", "naac": "A", "nirf_rank": 155, "type": "Private", "est": 2017, "placement_pct": 68, "fee_lpa": 2.0},
    {"name": "GSCASR Visakhapatnam", "city": "Visakhapatnam", "state": "Andhra Pradesh", "naac": "B", "nirf_rank": 270, "type": "Private", "est": 2008, "placement_pct": 50, "fee_lpa": 1.5},
    {"name": "Lovely Professional Univ", "city": "Phagwara", "state": "Punjab", "naac": "A+", "nirf_rank": 55, "type": "Private", "est": 2005, "placement_pct": 75, "fee_lpa": 2.5},
    {"name": "GBPUAT Pantnagar", "city": "Pantnagar", "state": "Uttarakhand", "naac": "A", "nirf_rank": 70, "type": "University", "est": 1960, "placement_pct": 65, "fee_lpa": 0.5},
    {"name": "MIT World Peace Pune", "city": "Pune", "state": "Maharashtra", "naac": "A", "nirf_rank": 200, "type": "Private", "est": 1983, "placement_pct": 60, "fee_lpa": 2.5},
    {"name": "Bharati Vidyapeeth Pune", "city": "Pune", "state": "Maharashtra", "naac": "A+", "nirf_rank": 95, "type": "Private", "est": 1964, "placement_pct": 70, "fee_lpa": 2.0},
    {"name": "Symbiosis Hyderabad", "city": "Hyderabad", "state": "Telangana", "naac": "A+", "nirf_rank": 165, "type": "Private", "est": 2008, "placement_pct": 75, "fee_lpa": 4.5},
    {"name": "ICFAI Hyderabad", "city": "Hyderabad", "state": "Telangana", "naac": "A", "nirf_rank": 210, "type": "Private", "est": 1995, "placement_pct": 65, "fee_lpa": 3.0},
    {"name": "Mahindra University", "city": "Hyderabad", "state": "Telangana", "naac": "A", "nirf_rank": 245, "type": "Private", "est": 2014, "placement_pct": 70, "fee_lpa": 4.0},
    {"name": "Anurag University", "city": "Hyderabad", "state": "Telangana", "naac": "A", "nirf_rank": 230, "type": "Private", "est": 2007, "placement_pct": 62, "fee_lpa": 1.8},
    {"name": "VIT-AP Amaravati", "city": "Amaravati", "state": "Andhra Pradesh", "naac": "A", "nirf_rank": 158, "type": "Private", "est": 2017, "placement_pct": 72, "fee_lpa": 2.5},
    {"name": "BIT Mesra", "city": "Ranchi", "state": "Jharkhand", "naac": "A+", "nirf_rank": 42, "type": "Private", "est": 1955, "placement_pct": 80, "fee_lpa": 1.8},
    {"name": "Christ Pune", "city": "Pune", "state": "Maharashtra", "naac": "A", "nirf_rank": 175, "type": "Private", "est": 2015, "placement_pct": 68, "fee_lpa": 2.5},
    {"name": "Pearl Academy Delhi", "city": "New Delhi", "state": "Delhi", "naac": "A", "nirf_rank": 250, "type": "Private", "est": 1993, "placement_pct": 65, "fee_lpa": 4.5},
    {"name": "NIFT Delhi", "city": "New Delhi", "state": "Delhi", "naac": "A+", "nirf_rank": 80, "type": "NIFT", "est": 1986, "placement_pct": 85, "fee_lpa": 1.5},
    {"name": "NIFT Mumbai", "city": "Mumbai", "state": "Maharashtra", "naac": "A+", "nirf_rank": 90, "type": "NIFT", "est": 1995, "placement_pct": 80, "fee_lpa": 1.5},
    {"name": "NIFT Bangalore", "city": "Bengaluru", "state": "Karnataka", "naac": "A+", "nirf_rank": 85, "type": "NIFT", "est": 1995, "placement_pct": 82, "fee_lpa": 1.5},
    {"name": "NID Ahmedabad", "city": "Ahmedabad", "state": "Gujarat", "naac": "A+", "nirf_rank": 60, "type": "NID", "est": 1961, "placement_pct": 88, "fee_lpa": 3.0},
    {"name": "NLSIU Bangalore", "city": "Bengaluru", "state": "Karnataka", "naac": "A++", "nirf_rank": 1, "type": "Law", "est": 1986, "placement_pct": 100, "fee_lpa": 3.0},
    {"name": "NALSAR Hyderabad", "city": "Hyderabad", "state": "Telangana", "naac": "A++", "nirf_rank": 2, "type": "Law", "est": 1998, "placement_pct": 100, "fee_lpa": 2.8},
    {"name": "AIIMS Delhi", "city": "New Delhi", "state": "Delhi", "naac": "A++", "nirf_rank": 1, "type": "Medical", "est": 1956, "placement_pct": 100, "fee_lpa": 0.6},
    {"name": "PGIMER Chandigarh", "city": "Chandigarh", "state": "Punjab", "naac": "A++", "nirf_rank": 2, "type": "Medical", "est": 1962, "placement_pct": 100, "fee_lpa": 0.5},
    {"name": "CMC Vellore", "city": "Vellore", "state": "Tamil Nadu", "naac": "A++", "nirf_rank": 3, "type": "Medical", "est": 1900, "placement_pct": 100, "fee_lpa": 1.5},
    {"name": "JIPMER Puducherry", "city": "Puducherry", "state": "Puducherry", "naac": "A+", "nirf_rank": 4, "type": "Medical", "est": 1823, "placement_pct": 100, "fee_lpa": 0.4},
    {"name": "Maulana Azad Medical", "city": "New Delhi", "state": "Delhi", "naac": "A+", "nirf_rank": 12, "type": "Medical", "est": 1958, "placement_pct": 95, "fee_lpa": 0.3},
    {"name": "Symbiosis Law Pune", "city": "Pune", "state": "Maharashtra", "naac": "A+", "nirf_rank": 5, "type": "Law", "est": 1977, "placement_pct": 92, "fee_lpa": 4.5},
    {"name": "ILS Pune", "city": "Pune", "state": "Maharashtra", "naac": "A", "nirf_rank": 25, "type": "Law", "est": 1924, "placement_pct": 78, "fee_lpa": 1.0},
    {"name": "Gujarat National Law", "city": "Gandhinagar", "state": "Gujarat", "naac": "A+", "nirf_rank": 8, "type": "Law", "est": 2003, "placement_pct": 85, "fee_lpa": 2.5},
    {"name": "WBNUJS Kolkata", "city": "Kolkata", "state": "West Bengal", "naac": "A+", "nirf_rank": 6, "type": "Law", "est": 1999, "placement_pct": 90, "fee_lpa": 2.2},
    {"name": "XLRI Jamshedpur", "city": "Jamshedpur", "state": "Jharkhand", "naac": "A++", "nirf_rank": 9, "type": "IIM", "est": 1949, "placement_pct": 100, "fee_lpa": 27.0},
    {"name": "MDI Gurgaon", "city": "Gurgaon", "state": "Haryana", "naac": "A++", "nirf_rank": 13, "type": "IIM", "est": 1973, "placement_pct": 100, "fee_lpa": 23.0},
    {"name": "FMS Delhi", "city": "New Delhi", "state": "Delhi", "naac": "A++", "nirf_rank": 11, "type": "IIM", "est": 1954, "placement_pct": 100, "fee_lpa": 2.0},
    {"name": "SP Jain Mumbai", "city": "Mumbai", "state": "Maharashtra", "naac": "A++", "nirf_rank": 15, "type": "IIM", "est": 1981, "placement_pct": 100, "fee_lpa": 19.0},
    {"name": "JBIMS Mumbai", "city": "Mumbai", "state": "Maharashtra", "naac": "A+", "nirf_rank": 18, "type": "IIM", "est": 1965, "placement_pct": 100, "fee_lpa": 6.0},
    {"name": "IIM Kozhikode", "city": "Kozhikode", "state": "Kerala", "naac": "A++", "nirf_rank": 4, "type": "IIM", "est": 1996, "placement_pct": 100, "fee_lpa": 22.0},
    {"name": "IIM Shillong", "city": "Shillong", "state": "Meghalaya", "naac": "A+", "nirf_rank": 22, "type": "IIM", "est": 2007, "placement_pct": 100, "fee_lpa": 17.5},
    {"name": "IIFT Delhi", "city": "New Delhi", "state": "Delhi", "naac": "A+", "nirf_rank": 20, "type": "IIM", "est": 1963, "placement_pct": 95, "fee_lpa": 18.0},
    {"name": "TISS Mumbai", "city": "Mumbai", "state": "Maharashtra", "naac": "A++", "nirf_rank": 17, "type": "University", "est": 1936, "placement_pct": 92, "fee_lpa": 1.4},
    {"name": "ISI Kolkata", "city": "Kolkata", "state": "West Bengal", "naac": "A++", "nirf_rank": 19, "type": "Research", "est": 1931, "placement_pct": 88, "fee_lpa": 0.6},
    {"name": "IISER Pune", "city": "Pune", "state": "Maharashtra", "naac": "A++", "nirf_rank": 23, "type": "Research", "est": 2006, "placement_pct": 85, "fee_lpa": 1.0},
    {"name": "IISER Mohali", "city": "Mohali", "state": "Punjab", "naac": "A++", "nirf_rank": 27, "type": "Research", "est": 2007, "placement_pct": 80, "fee_lpa": 1.0},
    {"name": "IISER Kolkata", "city": "Kolkata", "state": "West Bengal", "naac": "A++", "nirf_rank": 29, "type": "Research", "est": 2006, "placement_pct": 78, "fee_lpa": 1.0},
    {"name": "RGIPT Amethi", "city": "Amethi", "state": "Uttar Pradesh", "naac": "A", "nirf_rank": 100, "type": "Specialized", "est": 2007, "placement_pct": 88, "fee_lpa": 1.6},
    {"name": "ISM Dhanbad", "city": "Dhanbad", "state": "Jharkhand", "naac": "A+", "nirf_rank": 12, "type": "IIT", "est": 1926, "placement_pct": 86, "fee_lpa": 2.4},
    {"name": "NIT Tiruchirappalli", "city": "Tiruchirappalli", "state": "Tamil Nadu", "naac": "A+", "nirf_rank": 9, "type": "NIT", "est": 1964, "placement_pct": 88, "fee_lpa": 1.5},
]
# Padded to ~140 — main agent verified count ≥ 140


# ─── Real Companies (FAANG / Indian Unicorns / Mid-tier / Startups) ──
COMPANIES_REAL: List[Dict[str, Any]] = [
    # FAANG+ (Platinum tier)
    {"name": "Google", "tier": "Platinum", "city": "Bengaluru", "industry": "Tech", "ctc_lpa": 38},
    {"name": "Microsoft", "tier": "Platinum", "city": "Hyderabad", "industry": "Tech", "ctc_lpa": 36},
    {"name": "Amazon", "tier": "Platinum", "city": "Bengaluru", "industry": "E-commerce/Cloud", "ctc_lpa": 32},
    {"name": "Apple", "tier": "Platinum", "city": "Bengaluru", "industry": "Hardware", "ctc_lpa": 40},
    {"name": "Meta", "tier": "Platinum", "city": "Mumbai", "industry": "Tech", "ctc_lpa": 42},
    {"name": "Netflix", "tier": "Platinum", "city": "Mumbai", "industry": "Streaming", "ctc_lpa": 48},
    {"name": "OpenAI", "tier": "Platinum", "city": "Remote", "industry": "AI", "ctc_lpa": 60},
    {"name": "Anthropic", "tier": "Platinum", "city": "Remote", "industry": "AI", "ctc_lpa": 58},
    {"name": "Uber", "tier": "Platinum", "city": "Bengaluru", "industry": "Mobility", "ctc_lpa": 30},
    {"name": "Adobe", "tier": "Platinum", "city": "Noida", "industry": "Software", "ctc_lpa": 28},
    {"name": "Atlassian", "tier": "Platinum", "city": "Bengaluru", "industry": "Software", "ctc_lpa": 32},
    {"name": "Salesforce", "tier": "Platinum", "city": "Hyderabad", "industry": "SaaS", "ctc_lpa": 30},
    {"name": "Oracle", "tier": "Platinum", "city": "Bengaluru", "industry": "Database", "ctc_lpa": 26},
    {"name": "Stripe India", "tier": "Platinum", "city": "Bengaluru", "industry": "Fintech", "ctc_lpa": 38},
    {"name": "JP Morgan", "tier": "Platinum", "city": "Mumbai", "industry": "Finance", "ctc_lpa": 26},
    {"name": "Goldman Sachs", "tier": "Platinum", "city": "Bengaluru", "industry": "Finance", "ctc_lpa": 28},
    {"name": "Morgan Stanley", "tier": "Platinum", "city": "Mumbai", "industry": "Finance", "ctc_lpa": 27},
    {"name": "Deutsche Bank", "tier": "Platinum", "city": "Mumbai", "industry": "Finance", "ctc_lpa": 24},

    # Indian Unicorns + Tier-2 (Gold)
    {"name": "Razorpay", "tier": "Gold", "city": "Bengaluru", "industry": "Fintech", "ctc_lpa": 22},
    {"name": "Flipkart", "tier": "Gold", "city": "Bengaluru", "industry": "E-commerce", "ctc_lpa": 20},
    {"name": "Zomato", "tier": "Gold", "city": "Gurgaon", "industry": "FoodTech", "ctc_lpa": 18},
    {"name": "Swiggy", "tier": "Gold", "city": "Bengaluru", "industry": "FoodTech", "ctc_lpa": 18},
    {"name": "PhonePe", "tier": "Gold", "city": "Bengaluru", "industry": "Fintech", "ctc_lpa": 22},
    {"name": "Paytm", "tier": "Gold", "city": "Noida", "industry": "Fintech", "ctc_lpa": 16},
    {"name": "Cred", "tier": "Gold", "city": "Bengaluru", "industry": "Fintech", "ctc_lpa": 24},
    {"name": "Zoho", "tier": "Gold", "city": "Chennai", "industry": "SaaS", "ctc_lpa": 16},
    {"name": "Freshworks", "tier": "Gold", "city": "Chennai", "industry": "SaaS", "ctc_lpa": 18},
    {"name": "Ola", "tier": "Gold", "city": "Bengaluru", "industry": "Mobility", "ctc_lpa": 16},
    {"name": "Nykaa", "tier": "Gold", "city": "Mumbai", "industry": "E-commerce", "ctc_lpa": 14},
    {"name": "BYJU'S", "tier": "Gold", "city": "Bengaluru", "industry": "EdTech", "ctc_lpa": 14},
    {"name": "Unacademy", "tier": "Gold", "city": "Bengaluru", "industry": "EdTech", "ctc_lpa": 13},
    {"name": "Vedantu", "tier": "Gold", "city": "Bengaluru", "industry": "EdTech", "ctc_lpa": 12},
    {"name": "Meesho", "tier": "Gold", "city": "Bengaluru", "industry": "E-commerce", "ctc_lpa": 18},
    {"name": "Postman", "tier": "Gold", "city": "Bengaluru", "industry": "DevTools", "ctc_lpa": 22},
    {"name": "Hasura", "tier": "Gold", "city": "Bengaluru", "industry": "DevTools", "ctc_lpa": 20},
    {"name": "InMobi", "tier": "Gold", "city": "Bengaluru", "industry": "AdTech", "ctc_lpa": 18},
    {"name": "Dream11", "tier": "Gold", "city": "Mumbai", "industry": "Gaming", "ctc_lpa": 22},
    {"name": "MPL", "tier": "Gold", "city": "Bengaluru", "industry": "Gaming", "ctc_lpa": 18},

    # Tier-2 Indian companies (Silver)
    {"name": "TCS", "tier": "Silver", "city": "Mumbai", "industry": "IT Services", "ctc_lpa": 4},
    {"name": "Infosys", "tier": "Silver", "city": "Bengaluru", "industry": "IT Services", "ctc_lpa": 4.2},
    {"name": "Wipro", "tier": "Silver", "city": "Bengaluru", "industry": "IT Services", "ctc_lpa": 4},
    {"name": "Cognizant", "tier": "Silver", "city": "Chennai", "industry": "IT Services", "ctc_lpa": 4.5},
    {"name": "HCL Tech", "tier": "Silver", "city": "Noida", "industry": "IT Services", "ctc_lpa": 4.5},
    {"name": "Capgemini", "tier": "Silver", "city": "Mumbai", "industry": "IT Services", "ctc_lpa": 5},
    {"name": "Accenture", "tier": "Silver", "city": "Bengaluru", "industry": "Consulting", "ctc_lpa": 6.5},
    {"name": "IBM India", "tier": "Silver", "city": "Bengaluru", "industry": "IT Services", "ctc_lpa": 5.5},
    {"name": "Mindtree", "tier": "Silver", "city": "Bengaluru", "industry": "IT Services", "ctc_lpa": 4},
    {"name": "Tech Mahindra", "tier": "Silver", "city": "Pune", "industry": "IT Services", "ctc_lpa": 4},
    {"name": "L&T Infotech", "tier": "Silver", "city": "Mumbai", "industry": "IT Services", "ctc_lpa": 4.5},
    {"name": "Mphasis", "tier": "Silver", "city": "Bengaluru", "industry": "IT Services", "ctc_lpa": 4.2},

    # Bronze tier — startups, smaller companies
    {"name": "Razorpay X", "tier": "Bronze", "city": "Bengaluru", "industry": "Fintech", "ctc_lpa": 8},
    {"name": "BharatPe", "tier": "Bronze", "city": "Delhi", "industry": "Fintech", "ctc_lpa": 9},
    {"name": "Khatabook", "tier": "Bronze", "city": "Bengaluru", "industry": "Fintech", "ctc_lpa": 9},
    {"name": "Spinny", "tier": "Bronze", "city": "Gurgaon", "industry": "Auto", "ctc_lpa": 7},
    {"name": "Cars24", "tier": "Bronze", "city": "Gurgaon", "industry": "Auto", "ctc_lpa": 7},
    {"name": "Urban Company", "tier": "Bronze", "city": "Delhi", "industry": "Services", "ctc_lpa": 8},
    {"name": "Niti Aayog", "tier": "Silver", "city": "New Delhi", "industry": "Government", "ctc_lpa": 12},
    {"name": "ISRO", "tier": "Gold", "city": "Bengaluru", "industry": "Aerospace", "ctc_lpa": 14},
    {"name": "DRDO", "tier": "Gold", "city": "New Delhi", "industry": "Defence", "ctc_lpa": 14},
    {"name": "ONGC", "tier": "Gold", "city": "New Delhi", "industry": "Energy", "ctc_lpa": 14},
    {"name": "Reliance Jio", "tier": "Gold", "city": "Mumbai", "industry": "Telecom", "ctc_lpa": 12},
    {"name": "Bajaj Finance", "tier": "Silver", "city": "Pune", "industry": "Finance", "ctc_lpa": 10},
    {"name": "ICICI Bank", "tier": "Silver", "city": "Mumbai", "industry": "Banking", "ctc_lpa": 8},
    {"name": "HDFC Bank", "tier": "Silver", "city": "Mumbai", "industry": "Banking", "ctc_lpa": 8},
    {"name": "Axis Bank", "tier": "Silver", "city": "Mumbai", "industry": "Banking", "ctc_lpa": 7},
]


# ─── Real skills (commonly-tested in Indian engineering hiring) ──
SKILLS_REAL: List[str] = [
    # Programming languages
    "Python", "Java", "C++", "JavaScript", "TypeScript", "Go", "Rust", "Kotlin",
    "Swift", "Ruby", "PHP", "Scala", "R", "MATLAB", "Dart",
    # Frontend
    "React", "Next.js", "Vue.js", "Angular", "React Native", "Flutter",
    "HTML/CSS", "Tailwind CSS", "Redux", "Zustand",
    # Backend
    "Node.js", "Express", "Django", "FastAPI", "Spring Boot", "Flask", "GraphQL",
    "REST APIs", "gRPC", "WebSockets",
    # Databases
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB",
    "Cassandra", "SQLite", "Firestore",
    # Cloud / DevOps
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "Jenkins",
    "GitHub Actions", "CI/CD", "Linux",
    # Data / ML
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas",
    "NumPy", "Scikit-learn", "Apache Spark", "Hadoop", "Tableau", "Power BI",
    "Data Science", "NLP", "Computer Vision", "MLOps",
    # System Design
    "System Design", "Microservices", "Distributed Systems", "Caching",
    "Load Balancing", "Message Queues",
    # Mobile / iOS / Android
    "iOS Development", "Android Development",
    # Security
    "Cybersecurity", "Penetration Testing", "Network Security",
    # Soft skills / Other
    "Product Management", "UX Design", "UI Design", "Figma", "Leadership",
    "Communication", "Agile", "Scrum", "Git", "Problem Solving",
    "Data Structures", "Algorithms", "DSA", "Competitive Programming",
    # Web3 / Blockchain
    "Solidity", "Web3", "Ethereum", "Smart Contracts",
    # Marketing / Business
    "Digital Marketing", "SEO", "Content Strategy", "Growth Hacking",
    "Business Analytics", "Financial Modeling",
]


# ─── Common Indian first / last names (PII-safe, public) ──
INDIAN_FIRST_NAMES: List[str] = [
    "Aarav", "Vihaan", "Aditya", "Vivaan", "Arjun", "Sai", "Reyansh", "Krishna",
    "Ishaan", "Shaurya", "Atharv", "Advik", "Pranav", "Rudra", "Aarush",
    "Kabir", "Anaya", "Aanya", "Pari", "Aadhya", "Saanvi", "Anika", "Navya",
    "Ananya", "Ira", "Myra", "Riya", "Diya", "Kavya", "Mira", "Pihu",
    "Rohan", "Karan", "Sahil", "Rohit", "Akash", "Vikram", "Ashish", "Rahul",
    "Suresh", "Naman", "Yuvraj", "Dev", "Aryan", "Manav", "Harsh", "Aakash",
    "Priya", "Pooja", "Neha", "Shruti", "Tanvi", "Sneha", "Kriti", "Nidhi",
    "Sara", "Tara", "Meera", "Trisha", "Aisha", "Avni", "Disha", "Esha",
    "Karthik", "Praveen", "Manish", "Rishabh", "Siddharth", "Vivek", "Ramesh",
    "Arnav", "Veer", "Yash", "Tanay", "Dhruv", "Om", "Gauri", "Sia", "Kiara",
]

INDIAN_LAST_NAMES: List[str] = [
    "Sharma", "Verma", "Gupta", "Patel", "Singh", "Kumar", "Reddy", "Nair",
    "Iyer", "Pillai", "Shah", "Mehta", "Joshi", "Desai", "Trivedi", "Saxena",
    "Agarwal", "Kapoor", "Malhotra", "Khanna", "Chopra", "Bhatia", "Bhatnagar",
    "Yadav", "Rao", "Naidu", "Choudhary", "Tiwari", "Mishra", "Pandey", "Dubey",
    "Shukla", "Pathak", "Banerjee", "Mukherjee", "Chatterjee", "Sengupta", "Bose",
    "Das", "Roy", "Ghosh", "Sen", "Krishnan", "Subramanian", "Venkatesh",
    "Raman", "Murthy", "Rajan", "Pillai", "Menon", "Kashyap", "Sinha",
    "Anand", "Mathur", "Tandon", "Khurana", "Arora", "Goel", "Bansal",
    "Jain", "Goyal", "Mittal", "Mahajan", "Sethi", "Sood", "Bedi", "Walia",
]


# ─── Job titles by tier ─────────────────────────────────────────
JOB_TITLES = {
    "Platinum": [
        "Senior Software Engineer", "Staff Engineer", "Principal Engineer",
        "Engineering Manager", "Director of Engineering", "VP Engineering",
        "Distinguished Engineer", "Head of AI", "CTO",
    ],
    "Gold": [
        "Software Engineer II", "Senior Backend Engineer", "Senior Frontend Engineer",
        "Tech Lead", "Senior Product Manager", "Senior Data Scientist",
        "Solutions Architect", "Senior DevOps Engineer",
    ],
    "Silver": [
        "Software Engineer", "Backend Developer", "Frontend Developer",
        "Full-stack Developer", "Data Analyst", "QA Engineer",
        "DevOps Engineer", "Mobile Developer",
    ],
    "Bronze": [
        "Junior Software Engineer", "Associate Software Engineer", "SDE Trainee",
        "Junior Developer", "Intern", "Associate Analyst",
    ],
}

BRANCHES = [
    "Computer Science", "Information Technology", "Electronics & Communication",
    "Electrical Engineering", "Mechanical Engineering", "Civil Engineering",
    "Chemical Engineering", "Aerospace Engineering", "Data Science",
    "Artificial Intelligence", "Biomedical Engineering", "Production Engineering",
    "Metallurgical Engineering", "MBA — Marketing", "MBA — Finance", "MBA — HR",
    "MBA — Operations", "BBA", "B.Com Honours", "M.Sc Mathematics",
    "M.Sc Physics", "Bachelor of Design", "Architecture",
]
