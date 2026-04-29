"""
Mock data seeder — 100+ records across the platform for development/demo.

Run via:
    cd /app/backend && python3 seed_mock_data.py
Or auto-run on startup via env: AUTO_SEED_MOCK=1

Creates:
  - 4 admins (1 platform + 3 college)
  - 6 universities (tenant accounts, role=college)
  - 30 students (across +1, +2, BTech, Masters, with mixed career paths)
  - 20 alumni (with different industries)
  - 15 mentors (12 approved + 3 pending) across all 4 categories
  - 30 events (hackathons, workshops, fests, networking, with varied deadlines)
  - 30 courses (across providers, free + paid, all career paths)
  - 30 internships
  - 30 deals
  - 12 knowledge rooms
  - 25 bookings (mix of statuses)
  - 50+ room messages
  - 15 cached career suggestions

All test passwords printed at the end. Idempotent: running twice won't duplicate.
"""
from __future__ import annotations
import os
import sys
import random
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

from dotenv import load_dotenv
load_dotenv()

# Reuse server.py utilities (hash_password, generate_qr_code, generate_unique_id)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from server import (  # noqa: E402
    hash_password, generate_qr_code, generate_unique_id, db,
)

random.seed(42)
NOW = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Test user credentials — printed at end. Universal password: TestPass@123
# ---------------------------------------------------------------------------
COMMON_PWD = "TestPass@123"

TEST_USERS: List[Dict[str, Any]] = [
    # ===== ADMINS =====
    {"email": "admin@careerpath.app", "password": "Admin@12345", "full_name": "Platform Admin",
     "role": "admin", "_unique_prefix": "ADM"},
    {"email": "admin2@careerpath.app", "password": COMMON_PWD, "full_name": "Senior Admin",
     "role": "admin", "_unique_prefix": "ADM"},

    # ===== UNIVERSITIES (tenant accounts) =====
    {"email": "iith@university.in", "password": COMMON_PWD, "full_name": "IIT Hyderabad",
     "role": "college", "phone": "+91-40-23016000",
     "school_info": {"institution_name": "IIT Hyderabad", "institution_type": "university",
                     "class_or_year": "Tenant", "city": "Hyderabad", "state": "Telangana", "country": "India"},
     "_unique_prefix": "COL"},
    {"email": "iitb@university.in", "password": COMMON_PWD, "full_name": "IIT Bombay",
     "role": "college", "phone": "+91-22-25722545",
     "school_info": {"institution_name": "IIT Bombay", "institution_type": "university",
                     "class_or_year": "Tenant", "city": "Mumbai", "state": "Maharashtra", "country": "India"},
     "_unique_prefix": "COL"},
    {"email": "bits@university.in", "password": COMMON_PWD, "full_name": "BITS Pilani",
     "role": "college", "phone": "+91-1596-242210",
     "school_info": {"institution_name": "BITS Pilani", "institution_type": "university",
                     "class_or_year": "Tenant", "city": "Pilani", "state": "Rajasthan", "country": "India"},
     "_unique_prefix": "COL"},
    {"email": "vit@university.in", "password": COMMON_PWD, "full_name": "VIT Vellore",
     "role": "college", "phone": "+91-416-2243091",
     "school_info": {"institution_name": "VIT Vellore", "institution_type": "university",
                     "class_or_year": "Tenant", "city": "Vellore", "state": "Tamil Nadu", "country": "India"},
     "_unique_prefix": "COL"},
    {"email": "iiitb@university.in", "password": COMMON_PWD, "full_name": "IIIT Bangalore",
     "role": "college", "phone": "+91-80-41407777",
     "school_info": {"institution_name": "IIIT Bangalore", "institution_type": "university",
                     "class_or_year": "Tenant", "city": "Bangalore", "state": "Karnataka", "country": "India"},
     "_unique_prefix": "COL"},
    {"email": "stanford@university.in", "password": COMMON_PWD, "full_name": "Stanford University",
     "role": "college", "phone": "+1-650-723-2300",
     "school_info": {"institution_name": "Stanford University", "institution_type": "university",
                     "class_or_year": "Tenant", "city": "Stanford", "state": "CA", "country": "USA"},
     "_unique_prefix": "COL"},
]

# ===== STUDENTS — varied profiles =====
STUDENT_INSTITUTIONS = [
    "IIT Hyderabad", "IIT Bombay", "BITS Pilani", "VIT Vellore", "IIIT Bangalore",
    "DTU Delhi", "NIT Trichy", "IIT Madras", "Manipal Institute of Technology", "SRM University",
]
STUDENT_BRANCHES = ["CSE", "ECE", "Mechanical", "EEE", "Civil", "Information Technology", "Data Science"]
STUDENT_FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna",
                      "Ishaan", "Shaurya", "Atharv", "Aanya", "Diya", "Saanvi", "Anika",
                      "Pari", "Ananya", "Avani", "Riya", "Myra", "Sara", "Nisha", "Pooja",
                      "Kavya", "Rohan", "Karan", "Abhishek", "Manish", "Tanvi", "Neha"]

# ===== MENTORS =====
MENTOR_FIRST = ["Priya", "Arjun", "Anjali", "Rahul", "Sneha", "Vikram", "Neha", "Karthik",
                "Divya", "Sanjay", "Meera", "Suresh", "Lakshmi", "Rohit", "Pooja"]

ALUMNI_COMPANIES = ["Google", "Microsoft", "Amazon", "Meta", "Apple", "Goldman Sachs",
                    "Flipkart", "Razorpay", "Swiggy", "Stripe", "Salesforce", "Adobe",
                    "Tata Consultancy", "Infosys", "Wipro", "Tesla", "OpenAI", "Anthropic"]


# ---------------------------------------------------------------------------
# 100+ catalog records
# ---------------------------------------------------------------------------
COURSES_FULL = [
    # CS / Tech (job + higher_education)
    ("CS50 - Introduction to Computer Science", "Harvard / edX", "https://cs50.harvard.edu", "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800", "12 weeks", "Beginner", True, ["job", "higher_education", "startup"]),
    ("MIT 6.006 - Introduction to Algorithms", "MIT OCW", "https://ocw.mit.edu", "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800", "Self-paced", "Advanced", True, ["higher_education", "job"]),
    ("Stanford CS229 - Machine Learning", "Stanford Online", "https://online.stanford.edu", "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800", "11 weeks", "Advanced", True, ["job", "higher_education"]),
    ("Google Data Analytics", "Coursera (Google)", "https://www.coursera.org/professional-certificates/google-data-analytics", "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800", "6 months", "Intermediate", False, ["job", "business"]),
    ("AWS Cloud Practitioner", "AWS Training", "https://aws.amazon.com/training", "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800", "8 weeks", "Beginner", True, ["job"]),
    ("Full Stack Web Development", "freeCodeCamp", "https://www.freecodecamp.org", "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800", "Self-paced", "Beginner", True, ["job", "startup"]),
    ("React Native - The Complete Guide", "Udemy", "https://www.udemy.com/course/react-native-the-practical-guide", "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800", "40 hours", "Intermediate", False, ["job", "startup"]),
    ("Deep Learning Specialization", "Coursera (DeepLearning.AI)", "https://www.coursera.org/specializations/deep-learning", "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800", "5 months", "Advanced", False, ["job", "higher_education"]),
    ("System Design Interview Prep", "ByteByteGo", "https://bytebytego.com", "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800", "Self-paced", "Advanced", False, ["job"]),
    ("DevOps with Docker & Kubernetes", "Linux Foundation", "https://training.linuxfoundation.org", "https://images.unsplash.com/photo-1605379399642-870262d3d051?w=800", "10 weeks", "Intermediate", True, ["job"]),
    # Higher Education
    ("GRE Prep Masterclass", "Khan Academy", "https://www.khanacademy.org/test-prep/gre", "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800", "Self-paced", "All", True, ["higher_education"]),
    ("GMAT Official Prep", "GMAC", "https://www.mba.com/exams/gmat", "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800", "12 weeks", "Intermediate", False, ["higher_education", "business"]),
    ("IELTS Academic Preparation", "British Council", "https://www.britishcouncil.org/ielts", "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800", "8 weeks", "All", False, ["higher_education"]),
    ("TOEFL iBT Test Prep", "ETS", "https://www.ets.org/toefl", "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800", "8 weeks", "All", False, ["higher_education"]),
    ("US University Application Guide", "CollegeBoard", "https://bigfuture.collegeboard.org", "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800", "Self-paced", "All", True, ["higher_education"]),
    # Startup / Business
    ("How to Start a Startup", "Y Combinator", "https://www.startupschool.org", "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800", "10 weeks", "Beginner", True, ["startup", "business"]),
    ("The Lean Startup MBA", "Udemy", "https://www.udemy.com", "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800", "20 hours", "Intermediate", False, ["startup", "business"]),
    ("Financial Markets - Yale", "Coursera (Yale)", "https://www.coursera.org/learn/financial-markets-global", "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=800", "33 hours", "Beginner", True, ["business", "higher_education"]),
    ("Wharton Foundations of Strategy", "Coursera (Wharton)", "https://www.coursera.org/learn/wharton-strategy", "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800", "16 hours", "Beginner", False, ["business"]),
    ("Product Management Fundamentals", "Reforge", "https://www.reforge.com", "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800", "6 weeks", "Intermediate", False, ["job", "startup"]),
    # Design / Creative
    ("UX Design Professional", "Coursera (Google)", "https://www.coursera.org/professional-certificates/google-ux-design", "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=800", "6 months", "Beginner", False, ["job", "startup"]),
    ("Figma for Beginners", "Figma Academy", "https://www.figma.com/community", "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800", "10 hours", "Beginner", True, ["job"]),
    # School (Class 11/12)
    ("Class 12 PCM Complete Course", "Khan Academy", "https://www.khanacademy.org", "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800", "Year-long", "School", True, ["higher_education"]),
    ("JEE Main + Advanced Prep", "Vedantu", "https://www.vedantu.com", "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800", "12 months", "School", False, ["higher_education", "job"]),
    ("NEET Foundation", "BYJU'S", "https://byjus.com", "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800", "12 months", "School", False, ["higher_education"]),
    ("Coding for Class 11 students", "Code.org", "https://code.org", "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800", "8 weeks", "School", True, ["job", "higher_education"]),
    # Misc
    ("Photography for Beginners", "Skillshare", "https://www.skillshare.com", "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800", "5 hours", "Beginner", False, ["business"]),
    ("Public Speaking Mastery", "Toastmasters", "https://www.toastmasters.org", "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800", "Self-paced", "All", True, ["job", "business"]),
    ("Excel for Business Analysts", "LinkedIn Learning", "https://www.linkedin.com/learning", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800", "12 hours", "Intermediate", False, ["business", "job"]),
    ("Cybersecurity Fundamentals", "IBM SkillsBuild", "https://skillsbuild.org", "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800", "8 weeks", "Beginner", True, ["job"]),
]

EVENTS_FULL = [
    # Hackathons (Tech)
    ("Smart India Hackathon 2026", "hackathon", "Govt. of India", "All India · Online + Offline",
     "2026-08-15", 12, "https://www.sih.gov.in", ["AI/ML", "Innovation", "Govt"], "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"),
    ("Codeathon 2026", "hackathon", "MLH India", "Online",
     "2026-05-22", 2, "https://mlh.io", ["Code", "Online"], "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800"),
    ("HackOn With IIT Roorkee", "hackathon", "IIT Roorkee", "IIT Roorkee Campus",
     "2026-07-10", 5, "https://hackon.iitr.ac.in", ["Hardware", "AI"], "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800"),
    ("HashCode India", "hackathon", "Google", "Online",
     "2026-06-08", 3, "https://codingcompetitions.withgoogle.com/hashcode", ["Algo", "Code"], "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800"),
    ("BITS APOGEE Hackathon", "hackathon", "BITS Pilani", "BITS Pilani",
     "2026-09-15", 30, "https://bits-apogee.org", ["Innovation"], "https://images.unsplash.com/photo-1605379399642-870262d3d051?w=800"),
    # Workshops
    ("AI Training @ IIT Hyderabad", "workshop", "IIT Hyderabad", "IIT Hyderabad Campus",
     "2026-06-12", 1, "https://www.iith.ac.in", ["AI", "Hands-on"], "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=800"),
    ("Web Dev Bootcamp", "workshop", "GeeksforGeeks", "Online",
     "2026-06-20", 4, "https://www.geeksforgeeks.org", ["Web", "Code"], "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800"),
    ("Resume Writing Workshop", "workshop", "Naukri", "Online",
     "2026-05-25", 1, "https://www.naukri.com", ["Career", "Resume"], "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800"),
    ("Mock Interview Marathon", "workshop", "Internshala", "Online",
     "2026-06-02", 1, "https://internshala.com", ["Interview", "Career"], "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800"),
    ("Data Structures Live Class", "workshop", "Scaler", "Online",
     "2026-06-15", 7, "https://www.scaler.com", ["DSA", "Code"], "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800"),
    ("React Native Mobile Apps", "workshop", "GDG Bangalore", "Bangalore",
     "2026-07-22", 14, "https://gdg.community.dev", ["Mobile", "React"], "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800"),
    # Fests
    ("TechFest IIT Bombay", "fest", "IIT Bombay", "IIT Bombay",
     "2026-12-15", 60, "https://techfest.org", ["Cultural", "Tech"], "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800"),
    ("Mood Indigo IIT Bombay", "fest", "IIT Bombay", "IIT Bombay",
     "2026-12-22", 55, "https://moodi.org", ["Cultural"], "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800"),
    ("Saarang IIT Madras", "fest", "IIT Madras", "IIT Madras",
     "2027-01-10", 90, "https://saarang.org", ["Cultural", "Music"], "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800"),
    ("Rendezvous IIT Delhi", "fest", "IIT Delhi", "IIT Delhi",
     "2026-10-12", 40, "https://www.rendezvous.iitd.ac.in", ["Cultural"], "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800"),
    # Networking
    ("Networking Meet - SF Tech", "networking", "TechSoc", "Online",
     "2026-07-05", 5, "https://example.com", ["Network", "Tech"], "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800"),
    ("Alumni Reunion Bangalore", "networking", "IIIT-B Alumni", "Bangalore",
     "2026-08-08", 25, "https://example.com", ["Alumni"], "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800"),
    ("Women in Tech Conference", "networking", "Grace Hopper India", "Bangalore",
     "2026-11-04", 40, "https://ghc.anitab.org", ["Women", "Tech"], "https://images.unsplash.com/photo-1573164574572-cb89e39749b4?w=800"),
    ("LinkedIn Career Connect", "networking", "LinkedIn India", "Online",
     "2026-06-30", 5, "https://www.linkedin.com", ["Career"], "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800"),
    # Startup
    ("Startup Demo Day - Bengaluru", "startup", "T-Hub", "T-Hub Hyderabad",
     "2026-09-20", 18, "https://t-hub.co", ["Pitch", "Funding"], "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800"),
    ("Pitch Perfect 2026", "startup", "TiE Bangalore", "Bangalore",
     "2026-08-25", 22, "https://bangalore.tie.org", ["Pitch", "VC"], "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800"),
    ("YC Startup School", "startup", "Y Combinator", "Online",
     "2026-09-01", 28, "https://www.startupschool.org", ["YC", "Founders"], "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800"),
    ("HashCode Hackathon", "hackathon", "Google", "Online", "2026-08-12", 12,
     "https://example.com", ["Algo"], "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800"),
    # Workshops (school students friendly)
    ("Campus Tour: IIT Madras Open Day", "fest", "IIT Madras", "IIT Madras",
     "2026-07-15", 14, "https://example.com", ["Campus Visit"], "https://images.unsplash.com/photo-1562774053-701939374585?w=800"),
    ("STEM Olympiad National 2026", "fest", "STEM Foundation India", "All India",
     "2026-08-30", 35, "https://example.com", ["School", "Olympiad"], "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800"),
    ("Career Fair - Class 12", "networking", "Career Launcher", "Mumbai",
     "2026-06-20", 6, "https://www.careerlauncher.com", ["School", "Career"], "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800"),
    ("Coding Bootcamp for Class 11/12", "workshop", "Coding Ninjas", "Online",
     "2026-07-01", 9, "https://www.codingninjas.com", ["School", "Code"], "https://images.unsplash.com/photo-1610563166150-b34df4f3bcd6?w=800"),
    ("Robotics Camp Stanford", "workshop", "Stanford Robotics", "Stanford",
     "2026-08-05", 15, "https://stanford.edu", ["Robotics"], "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=800"),
    ("CodeChef SnackDown", "hackathon", "CodeChef", "Online",
     "2026-09-12", 25, "https://www.codechef.com", ["Code", "Online"], "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800"),
    ("Adobe Design Achievement Awards", "networking", "Adobe", "Online",
     "2026-10-20", 50, "https://adobeawards.com", ["Design"], "https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800"),
]

INTERNSHIPS_FULL = [
    ("Software Engineering Intern", "Microsoft", "Hyderabad / Remote", "₹80,000/month", "3 months",
     ["Python", "C++", "Algorithms"], "https://careers.microsoft.com",
     "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=800", ["job", "higher_education"]),
    ("Data Science Intern", "Flipkart", "Bangalore", "₹60,000/month", "6 months",
     ["Python", "SQL", "ML"], "https://www.flipkartcareers.com",
     "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800", ["job"]),
    ("Product Management Intern", "Razorpay", "Bangalore / Remote", "₹50,000/month", "3 months",
     ["Product", "SQL"], "https://razorpay.com/jobs",
     "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800", ["job", "startup"]),
    ("Founders Office Intern", "Zerodha", "Bangalore", "₹40,000/month", "6 months",
     ["Strategy", "Business"], "https://zerodha.com/careers",
     "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800", ["business", "startup"]),
    ("Research Intern", "IIT Madras", "Chennai", "₹15,000/month", "2 months",
     ["Research", "Python"], "https://www.iitm.ac.in",
     "https://images.unsplash.com/photo-1562774053-701939374585?w=800", ["higher_education"]),
    ("Marketing Intern", "Swiggy", "Bangalore / Remote", "₹35,000/month", "3 months",
     ["Marketing", "Analytics"], "https://careers.swiggy.com",
     "https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=800", ["job", "business"]),
    ("Frontend Engineering Intern", "Zomato", "Gurgaon", "₹50,000/month", "6 months",
     ["React", "TypeScript"], "https://www.zomato.com/careers",
     "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800", ["job"]),
    ("Backend Engineering Intern", "PhonePe", "Bangalore", "₹70,000/month", "3 months",
     ["Java", "Microservices"], "https://www.phonepe.com/careers",
     "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800", ["job"]),
    ("ML Engineering Intern", "Ola", "Bangalore", "₹65,000/month", "6 months",
     ["TensorFlow", "PyTorch"], "https://www.olacabs.com/careers",
     "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800", ["job", "higher_education"]),
    ("Mobile Engineering Intern", "Cred", "Bangalore", "₹75,000/month", "6 months",
     ["iOS", "Swift", "Kotlin"], "https://cred.club/careers",
     "https://images.unsplash.com/photo-1605379399642-870262d3d051?w=800", ["job"]),
    ("Growth Intern", "Unacademy", "Bangalore", "₹45,000/month", "3 months",
     ["Growth", "SQL"], "https://unacademy.com/careers",
     "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800", ["business", "startup"]),
    ("Design Intern", "Cleartrip", "Mumbai", "₹40,000/month", "3 months",
     ["Figma", "UX"], "https://www.cleartrip.com/careers",
     "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800", ["job"]),
    ("Quantitative Research Intern", "Goldman Sachs", "Bengaluru", "₹1,20,000/month", "10 weeks",
     ["Math", "Python"], "https://www.goldmansachs.com/careers",
     "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800", ["job", "higher_education"]),
    ("Investment Banking Summer Analyst", "JPMorgan", "Mumbai", "₹2,00,000/month", "10 weeks",
     ["Finance", "Excel"], "https://www.jpmorgan.com/careers",
     "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800", ["business"]),
    ("UX Research Intern", "Adobe", "Noida", "₹55,000/month", "6 months",
     ["UX Research", "Figma"], "https://www.adobe.com/careers",
     "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=800", ["job"]),
    ("DevOps Intern", "Atlassian", "Bangalore / Remote", "₹70,000/month", "3 months",
     ["AWS", "Docker"], "https://www.atlassian.com/company/careers",
     "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800", ["job"]),
    ("Cybersecurity Intern", "Palo Alto Networks", "Bangalore", "₹85,000/month", "3 months",
     ["Security", "Networking"], "https://www.paloaltonetworks.com/company/careers",
     "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800", ["job"]),
    ("Robotics Intern", "Boston Dynamics", "Boston", "$8,000/month", "12 weeks",
     ["ROS", "C++"], "https://www.bostondynamics.com/careers",
     "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=800", ["job", "higher_education"]),
    ("AI Safety Intern", "Anthropic", "SF / Remote", "$10,000/month", "12 weeks",
     ["Python", "Research"], "https://www.anthropic.com/careers",
     "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800", ["job", "higher_education"]),
    ("Strategy Consulting Intern", "McKinsey", "Mumbai", "₹2,50,000/month", "10 weeks",
     ["Consulting", "Excel"], "https://www.mckinsey.com/careers",
     "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800", ["business"]),
    ("Startup Founder Office", "Razorpay", "Bangalore", "₹65,000/month", "6 months",
     ["Strategy"], "https://razorpay.com/jobs",
     "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800", ["startup"]),
    ("Game Dev Intern", "Dream11", "Mumbai", "₹70,000/month", "6 months",
     ["Unity", "C#"], "https://www.dream11careers.com",
     "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800", ["job"]),
    ("Backend Intern", "Twilio", "Bangalore / Remote", "$5,000/month", "12 weeks",
     ["Python", "API"], "https://www.twilio.com/careers",
     "https://images.unsplash.com/photo-1605379399642-870262d3d051?w=800", ["job"]),
    ("ML Intern", "OpenAI", "SF / Remote", "$12,000/month", "12 weeks",
     ["PyTorch", "Research"], "https://openai.com/careers",
     "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800", ["higher_education", "job"]),
    ("Engineering Intern", "Spotify", "Stockholm", "€2,500/month", "3 months",
     ["Java", "Scala"], "https://www.lifeatspotify.com/jobs",
     "https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=800", ["job"]),
    ("Data Engineering Intern", "Databricks", "Bangalore", "₹95,000/month", "6 months",
     ["Spark", "SQL"], "https://www.databricks.com/company/careers",
     "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800", ["job"]),
    ("Brand Marketing Intern", "Nike India", "Bangalore", "₹40,000/month", "3 months",
     ["Brand", "Content"], "https://jobs.nike.com",
     "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800", ["business"]),
    ("Climate Tech Intern", "Zen Robotics", "Bangalore", "₹50,000/month", "3 months",
     ["Sustainability"], "https://example.com",
     "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=800", ["startup"]),
    ("Edtech Content Intern", "BYJU'S", "Bangalore / Remote", "₹30,000/month", "6 months",
     ["Content"], "https://byjus.com/careers",
     "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800", ["business"]),
    ("Healthcare Intern", "Practo", "Bangalore", "₹45,000/month", "3 months",
     ["Healthcare"], "https://www.practo.com/careers",
     "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800", ["job"]),
]

DEALS_FULL = [
    ("GitHub Student Developer Pack", "GitHub", "Tech", "Free Pro tools worth $200K+", "STUDENT-PACK", "Ongoing", "https://education.github.com/pack", "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800"),
    ("Notion Personal Pro", "Notion", "Productivity", "100% OFF", "STUDENT-FREE", "Ongoing", "https://www.notion.so/students", "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800"),
    ("Figma Education Plan", "Figma", "Design", "100% OFF Professional", "EDU-FIGMA", "Ongoing", "https://www.figma.com/education", "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800"),
    ("Zomato Pro Student", "Zomato", "Food", "50% OFF", "STUDENT50", "31 Dec 2026", "https://www.zomato.com", "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800"),
    ("Spotify Premium Student", "Spotify", "Entertainment", "₹59/month", "STUDENT-IND", "Ongoing", "https://www.spotify.com/student", "https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=800"),
    ("Apple Education Store", "Apple", "Tech", "Up to 10% OFF + AirPods", "EDU-APPLE", "Ongoing", "https://www.apple.com/in-edu/store", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"),
    ("Coursera Plus", "Coursera", "Education", "Free for select students", "COURSERA-EDU", "Ongoing", "https://www.coursera.org", "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800"),
    ("Amazon Prime Student", "Amazon", "Shopping", "₹749/year", "PRIME-STUDENT", "Ongoing", "https://www.amazon.in/amazonprime", "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800"),
    ("YouTube Premium Student", "YouTube", "Entertainment", "₹79/month", "YT-STUDENT", "Ongoing", "https://www.youtube.com/premium/student", "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800"),
    ("Microsoft Office 365 Edu", "Microsoft", "Productivity", "100% OFF", "MS-EDU", "Ongoing", "https://www.microsoft.com/en-in/education/products/office", "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=800"),
    ("Adobe Creative Cloud Student", "Adobe", "Design", "60% OFF", "ADOBE-EDU", "Ongoing", "https://www.adobe.com/in/creativecloud/buy/students.html", "https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800"),
    ("Canva Pro for Students", "Canva", "Design", "Free Pro Account", "CANVA-EDU", "Ongoing", "https://www.canva.com/edu", "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800"),
    ("Grammarly Premium Edu", "Grammarly", "Productivity", "30% OFF", "GRAMMARLY-EDU", "Ongoing", "https://www.grammarly.com/edu", "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800"),
    ("LinkedIn Learning", "LinkedIn", "Education", "Free month", "LIL-1MONTH", "Ongoing", "https://www.linkedin.com/learning", "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800"),
    ("Uber Eats Student", "Uber Eats", "Food", "30% OFF first 5 orders", "UE-STUDENT", "31 Dec 2026", "https://www.ubereats.com", "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"),
    ("MakeMyTrip Student", "MakeMyTrip", "Shopping", "10% OFF flights", "MMT-STUDENT", "Ongoing", "https://www.makemytrip.com", "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800"),
    ("Booking.com Student", "Booking.com", "Shopping", "Genius Level 2 free", "BOOK-EDU", "Ongoing", "https://www.booking.com", "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800"),
    ("StudentBeans India", "StudentBeans", "Shopping", "Aggregator of 1000+ deals", "STUDENT-BEANS", "Ongoing", "https://www.studentbeans.com/in", "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800"),
    ("Discord Nitro Trial", "Discord", "Entertainment", "Free 3 months", "DISCORD-EDU", "Ongoing", "https://discord.com/nitro", "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800"),
    ("Headspace Student", "Headspace", "Productivity", "85% OFF", "HEAD-STUDENT", "Ongoing", "https://www.headspace.com/studentplan", "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800"),
    ("Calm Premium Student", "Calm", "Productivity", "85% OFF", "CALM-STUDENT", "Ongoing", "https://www.calm.com/schools", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"),
    ("Squarespace Student", "Squarespace", "Productivity", "50% OFF", "SQUARE-EDU", "Ongoing", "https://www.squarespace.com", "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800"),
    ("Hostinger Student", "Hostinger", "Tech", "75% OFF hosting", "HOST-STUDENT", "Ongoing", "https://www.hostinger.in", "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800"),
    ("DigitalOcean Credit", "DigitalOcean", "Tech", "$200 free credit", "DO-STUDENT", "Ongoing", "https://www.digitalocean.com/community/pages/hatch", "https://images.unsplash.com/photo-1605379399642-870262d3d051?w=800"),
    ("Domino's Student Combo", "Domino's", "Food", "Buy 1 Get 1 Free", "DOMINOS50", "30 Sep 2026", "https://www.dominos.co.in", "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800"),
    ("Swiggy One Student", "Swiggy", "Food", "₹99/month", "SWIGGY-STUDENT", "Ongoing", "https://www.swiggy.com/one", "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"),
    ("Croma Edu Discount", "Croma", "Shopping", "10% OFF laptops", "CROMA-EDU", "31 Aug 2026", "https://www.croma.com", "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800"),
    ("Flipkart Student Plus", "Flipkart", "Shopping", "Free Plus + bonuses", "FK-STUDENT", "Ongoing", "https://www.flipkart.com", "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800"),
    ("Gymnation Student", "Gymnation", "Productivity", "₹999/month", "GYM-STUDENT", "Ongoing", "https://example.com", "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800"),
    ("PayPal Student Edition", "PayPal", "Tech", "Zero forex fees", "PP-STUDENT", "Ongoing", "https://www.paypal.com", "https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=800"),
]

KNOWLEDGE_ROOMS_FULL = [
    {"id": "tech", "name": "Tech & Engineering", "description": "Coding, AI/ML, software, hardware", "icon": "💻", "category": "tech", "members": 1240},
    {"id": "higher_ed", "name": "Higher Education Abroad", "description": "GRE, GMAT, US/UK/Canada applications", "icon": "🎓", "category": "higher_ed", "members": 890},
    {"id": "startups", "name": "Startups & Entrepreneurship", "description": "Building, funding, scaling startups", "icon": "🚀", "category": "startups", "members": 670},
    {"id": "careers", "name": "Career Guidance", "description": "Jobs, internships, interviews, resumes", "icon": "💼", "category": "careers", "members": 1580},
    {"id": "design", "name": "Design & Product", "description": "UX, UI, product management", "icon": "🎨", "category": "design", "members": 420},
    {"id": "finance", "name": "Finance & Business", "description": "MBA, consulting, investment banking", "icon": "📊", "category": "finance", "members": 540},
    {"id": "ai_ml", "name": "AI & Machine Learning", "description": "Deep learning, ChatGPT, research papers", "icon": "🤖", "category": "tech", "members": 980},
    {"id": "interview_prep", "name": "Interview Prep", "description": "DSA, system design, behavioral", "icon": "🎯", "category": "careers", "members": 1100},
    {"id": "scholarships", "name": "Scholarships Hub", "description": "Govt, private and international scholarships", "icon": "🏆", "category": "higher_ed", "members": 720},
    {"id": "alumni_network", "name": "Alumni Network", "description": "Reunions, mentorship, referrals", "icon": "🌐", "category": "careers", "members": 850},
    {"id": "competitive_exams", "name": "Competitive Exams", "description": "JEE, NEET, GATE, UPSC", "icon": "📚", "category": "higher_ed", "members": 1380},
    {"id": "women_in_tech", "name": "Women in Tech", "description": "Mentorship and community for women", "icon": "💪", "category": "careers", "members": 480},
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def upsert_user(email: str, password: str, full_name: str, role: str,
                      unique_prefix: str, **extra) -> str:
    """Idempotent — returns the user's _id as a string."""
    existing = await db.users.find_one({"email": email})
    if existing:
        return str(existing["_id"])
    user_doc: Dict[str, Any] = {
        "email": email,
        "password_hash": hash_password(password),
        "full_name": full_name,
        "role": role,
        "phone": extra.get("phone"),
        "unique_id": generate_unique_id(role),
        "qr_code_base64": generate_qr_code(f"SA-USER:{email}|{role}"),
        "school_info": extra.get("school_info"),
        "career_path": extra.get("career_path"),
        "interests": extra.get("interests", []),
        "skills": extra.get("skills", []),
        "bio": extra.get("bio"),
        "face_image_base64": None,
        "onboarding_completed": True,
        "created_at": NOW,
    }
    if "student_info" in extra:
        user_doc["student_info"] = extra["student_info"]
    if "alumni_info" in extra:
        user_doc["alumni_info"] = extra["alumni_info"]
    if "mentor_info" in extra:
        user_doc["mentor_info"] = extra["mentor_info"]
        user_doc["mentor_status"] = extra.get("mentor_status", "approved")
    res = await db.users.insert_one(user_doc)
    return str(res.inserted_id)


def make_email(prefix: str, idx: int) -> str:
    return f"{prefix}{idx:02d}@test.com"


# ---------------------------------------------------------------------------
# Seed sequence
# ---------------------------------------------------------------------------
async def seed_admins_and_universities():
    print("→ Seeding admins + universities…")
    for u in TEST_USERS:
        await upsert_user(
            email=u["email"],
            password=u.get("password", COMMON_PWD),
            full_name=u["full_name"],
            role=u["role"],
            unique_prefix=u["_unique_prefix"],
            phone=u.get("phone"),
            school_info=u.get("school_info"),
        )


async def seed_students():
    print("→ Seeding 30 students…")
    paths = ["job", "higher_education", "startup", "business"]
    levels_pool = (
        # Mix of education levels per spec
        [("plus_one", "Class 11", 16)] * 4 +
        [("plus_two", "Class 12", 17)] * 4 +
        [("btech", "B.Tech 1st Year", 18)] * 4 +
        [("btech", "B.Tech 2nd Year", 19)] * 4 +
        [("btech", "B.Tech 3rd Year", 20)] * 4 +
        [("btech", "B.Tech 4th Year", 21)] * 4 +
        [("masters", "MBA 1st Year", 23)] * 3 +
        [("masters", "MS 1st Year", 23)] * 3
    )
    seeded_emails: List[str] = []
    for idx in range(30):
        first = STUDENT_FIRST_NAMES[idx % len(STUDENT_FIRST_NAMES)]
        last = "Student"
        email = make_email("student", idx + 1)
        edu_level, class_year, age = levels_pool[idx % len(levels_pool)]
        career = paths[idx % 4]
        institution = STUDENT_INSTITUTIONS[idx % len(STUDENT_INSTITUTIONS)]
        branch = STUDENT_BRANCHES[idx % len(STUDENT_BRANCHES)]
        await upsert_user(
            email=email,
            password=COMMON_PWD,
            full_name=f"{first} {last}",
            role="student",
            unique_prefix="STU",
            school_info={
                "institution_name": institution,
                "institution_type": "school" if "Class" in class_year else "college",
                "class_or_year": class_year,
                "branch_or_stream": branch,
                "country": "India",
                "city": ["Hyderabad", "Mumbai", "Bangalore", "Delhi", "Chennai"][idx % 5],
                "state": ["Telangana", "Maharashtra", "Karnataka", "Delhi", "Tamil Nadu"][idx % 5],
            },
            career_path=career,
            student_info={
                "age": age,
                "education_level": edu_level,
                "career_interests": random.sample(["AI/ML", "Web Dev", "Data Science", "Mobile Dev",
                                                    "Cloud", "Product", "Finance", "Design"], k=2),
            },
            interests=random.sample(["AI/ML", "Web Dev", "Data Science", "Cloud / DevOps",
                                     "UX Design", "Marketing", "Finance", "Entrepreneurship"], k=3),
            skills=random.sample(["Python", "JavaScript", "SQL", "React", "Java", "C++"], k=2),
        )
        seeded_emails.append(email)
    return seeded_emails


async def seed_alumni():
    print("→ Seeding 20 alumni…")
    for idx in range(20):
        first = STUDENT_FIRST_NAMES[(idx + 5) % len(STUDENT_FIRST_NAMES)]
        last = "Alumni"
        email = make_email("alumni", idx + 1)
        company = ALUMNI_COMPANIES[idx % len(ALUMNI_COMPANIES)]
        await upsert_user(
            email=email,
            password=COMMON_PWD,
            full_name=f"{first} {last}",
            role="alumni",
            unique_prefix="ALU",
            school_info={
                "institution_name": STUDENT_INSTITUTIONS[idx % len(STUDENT_INSTITUTIONS)],
                "institution_type": "university",
                "class_or_year": "Graduated",
                "graduation_year": 2020 + (idx % 5),
                "country": "India",
            },
            career_path=["job", "startup", "business"][idx % 3],
            alumni_info={
                "graduation_year": 2020 + (idx % 5),
                "university": STUDENT_INSTITUTIONS[idx % len(STUDENT_INSTITUTIONS)],
                "current_employer": company,
                "current_role": ["Software Engineer", "Product Manager", "Founder", "VP", "Analyst"][idx % 5],
                "employment_status": "employed",
            },
            interests=["Mentorship", "Networking", "Career"],
            skills=random.sample(["Python", "Leadership", "Product", "Strategy", "Java"], k=3),
        )


async def seed_mentors():
    print("→ Seeding 15 mentors (12 approved + 3 pending)…")
    categories = ["it_software", "higher_education", "startup_business", "education"]
    for idx in range(15):
        cat = categories[idx % 4]
        first = MENTOR_FIRST[idx % len(MENTOR_FIRST)]
        email = make_email("mentor", idx + 1)
        is_pending = idx >= 12
        status = "pending" if is_pending else "approved"
        org_titles = {
            "it_software":      [("Google", "Senior SWE"), ("Microsoft", "Principal Engineer"), ("Amazon", "SDE-3")],
            "higher_education": [("MIT", "Professor"), ("Stanford", "Associate Dean"), ("IIT Bombay", "Asst. Prof")],
            "startup_business": [("Y Combinator", "Partner"), ("Sequoia", "VC"), ("Self", "Founder")],
            "education":        [("Wharton MBA", "Career Coach"), ("Coursera", "Instructor"), ("BYJU'S", "Lead Educator")],
        }[cat]
        org, title = org_titles[idx % 3]
        await upsert_user(
            email=email,
            password=COMMON_PWD,
            full_name=f"{first} Mentor{idx+1}",
            role="mentor",
            unique_prefix="MEN",
            school_info={
                "institution_name": STUDENT_INSTITUTIONS[idx % len(STUDENT_INSTITUTIONS)],
                "institution_type": "university",
                "class_or_year": "Graduated",
                "country": "India",
            },
            mentor_info={
                "category": cat,
                "organization": org,
                "job_title": title,
                "linkedin_url": f"https://linkedin.com/in/{first.lower()}{idx}",
                "years_of_experience": 5 + (idx % 12),
                "bio": f"Helping students navigate {cat.replace('_', ' ')} careers.",
            },
            mentor_status=status,
            interests=["Mentorship"],
            skills=random.sample(["Mentoring", "Strategy", "Coaching", "Networking"], k=2),
        )


async def seed_catalogs():
    print("→ Seeding catalog (events, courses, internships, deals, rooms)…")

    # Reset & seed events with fresh deadlines (relative to NOW)
    await db.events.delete_many({})
    events_docs = []
    for idx, (title, cat, org, venue, start_date, days_ahead, url, tags, image) in enumerate(EVENTS_FULL):
        deadline = NOW + timedelta(days=days_ahead)
        events_docs.append({
            "id": f"e{idx+1}",
            "title": title,
            "category": cat,
            "organizer": org,
            "venue": venue,
            "start_date": start_date,
            "registration_deadline": deadline.isoformat(),
            "url": url,
            "tags": tags,
            "image": image,
        })
    await db.events.insert_many(events_docs)

    # Reset & seed courses
    await db.courses.delete_many({})
    course_docs = []
    for idx, (title, provider, url, image, duration, level, is_free, paths) in enumerate(COURSES_FULL):
        course_docs.append({
            "id": f"c{idx+1}",
            "title": title,
            "provider": provider,
            "url": url,
            "image": image,
            "duration": duration,
            "level": level,
            "is_free": is_free,
            "career_paths": paths,
        })
    await db.courses.insert_many(course_docs)

    # Reset & seed internships
    await db.internships.delete_many({})
    intern_docs = []
    for idx, (title, company, location, stipend, duration, skills, url, image, paths) in enumerate(INTERNSHIPS_FULL):
        intern_docs.append({
            "id": f"i{idx+1}",
            "title": title,
            "company": company,
            "location": location,
            "stipend": stipend,
            "duration": duration,
            "skills": skills,
            "url": url,
            "image": image,
            "career_paths": paths,
        })
    await db.internships.insert_many(intern_docs)

    # Reset & seed deals
    await db.deals.delete_many({})
    deal_docs = []
    for idx, (title, brand, cat, discount, code, expires, url, image) in enumerate(DEALS_FULL):
        deal_docs.append({
            "id": f"d{idx+1}",
            "title": title,
            "brand": brand,
            "category": cat,
            "discount": discount,
            "code": code,
            "expires": expires,
            "url": url,
            "image": image,
        })
    await db.deals.insert_many(deal_docs)

    # Knowledge rooms collection (for browsing)
    await db.rooms.delete_many({})
    await db.rooms.insert_many([dict(r) for r in KNOWLEDGE_ROOMS_FULL])


async def seed_bookings_and_messages(student_emails: List[str]):
    print("→ Seeding 25 bookings + 60 room messages…")
    students = await db.users.find({"role": "student"}).to_list(50)
    mentors = await db.users.find({"role": "mentor", "mentor_status": "approved"}).to_list(50)
    sample_mentors = await db.sample_mentors.find({}, {"_id": 0}).to_list(20)

    if not students or not (mentors or sample_mentors):
        return

    await db.bookings.delete_many({})
    bookings = []
    for i in range(25):
        student = students[i % len(students)]
        mentor_id = (mentors or sample_mentors)[i % max(len(mentors), len(sample_mentors))]
        mentor_id = mentor_id.get("id") or str(mentor_id["_id"])
        bookings.append({
            "id": f"book-{i+1}",
            "student_id": str(student["_id"]),
            "mentor_id": mentor_id,
            "topic": ["Career advice", "Resume review", "Mock interview", "PhD applications", "Startup pitch"][i % 5],
            "scheduled_at": (NOW + timedelta(days=(i % 14) - 7)).isoformat(),
            "duration_minutes": [30, 45, 60][i % 3],
            "status": ["pending", "confirmed", "completed", "cancelled"][i % 4],
            "notes": f"Auto-seeded session #{i+1}",
            "created_at": NOW - timedelta(days=i),
        })
    await db.bookings.insert_many(bookings)

    # Room messages — seed each room with 5 sample messages
    await db.room_messages.delete_many({})
    msgs = []
    sample_texts = [
        "Hey everyone, anyone up for collaborating on a hackathon?",
        "Just got my Google offer - happy to share interview tips!",
        "Has anyone applied for the Reliance scholarship?",
        "What's the best way to prepare for system design rounds?",
        "Looking for a study partner for GRE prep starting next week.",
        "Sharing my MIT application essays — DM me!",
        "Y Combinator W26 batch — anyone applying?",
        "Razorpay PM internship results out — got interview!",
        "Best resources for ML in 2026?",
        "Anyone in Bangalore want to meet up this weekend?",
    ]
    for room in KNOWLEDGE_ROOMS_FULL:
        for j in range(5):
            user = students[(j + len(room["id"])) % len(students)]
            msgs.append({
                "id": f"msg-{room['id']}-{j+1}",
                "room_id": room["id"],
                "user_id": str(user["_id"]),
                "user_name": user["full_name"],
                "user_avatar": None,
                "text": sample_texts[(j + len(room["id"])) % len(sample_texts)],
                "created_at": NOW - timedelta(hours=j * 4 + 1),
            })
    if msgs:
        await db.room_messages.insert_many(msgs)


async def main():
    await seed_admins_and_universities()
    student_emails = await seed_students()
    await seed_alumni()
    await seed_mentors()
    await seed_catalogs()
    await seed_bookings_and_messages(student_emails)

    # Print summary
    print("\n" + "=" * 70)
    print("✅ MOCK SEED COMPLETE")
    print("=" * 70)
    counts = {}
    for coll in ["users", "events", "courses", "internships", "deals", "rooms", "room_messages", "bookings"]:
        counts[coll] = await db[coll].count_documents({})
    for k, v in counts.items():
        print(f"  {k:18s} : {v}")
    print("\n" + "=" * 70)
    print("🔑 TEST CREDENTIALS")
    print("=" * 70)
    print(f"\nADMINS")
    print(f"  admin@careerpath.app          / Admin@12345  (existing)")
    print(f"  admin2@careerpath.app         / {COMMON_PWD}")
    print(f"\nUNIVERSITIES (role=college, tenant accounts)")
    print(f"  iith@university.in            / {COMMON_PWD}")
    print(f"  iitb@university.in            / {COMMON_PWD}")
    print(f"  bits@university.in            / {COMMON_PWD}")
    print(f"  vit@university.in             / {COMMON_PWD}")
    print(f"  iiitb@university.in           / {COMMON_PWD}")
    print(f"  stanford@university.in        / {COMMON_PWD}")
    print(f"\nMENTORS (12 approved + 3 pending)")
    print(f"  mentor01@test.com → mentor12@test.com  / {COMMON_PWD}  (approved)")
    print(f"  mentor13@test.com → mentor15@test.com  / {COMMON_PWD}  (pending)")
    print(f"\nSTUDENTS (30, mixed education levels)")
    print(f"  student01@test.com → student30@test.com / {COMMON_PWD}")
    print(f"    student01-08  : Class 11 / Class 12")
    print(f"    student09-24  : B.Tech 1st-4th Year")
    print(f"    student25-30  : MBA / MS")
    print(f"\nALUMNI (20)")
    print(f"  alumni01@test.com → alumni20@test.com   / {COMMON_PWD}")
    print(f"\nLEGACY (existing)")
    print(f"  student@test.com              / Student@123")
    print()


if __name__ == "__main__":
    asyncio.run(main())
