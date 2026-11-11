"""
seed_data.py — Sample data constants and seeding functions.

Extracted from server.py to reduce its size. These are used during app startup
(_lifespan) to seed empty collections with sample catalog data.
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone

import bcrypt
from db import db

logger = logging.getLogger(__name__)


# ----------------------------------------------------------------------------
# Sample data constants
# ----------------------------------------------------------------------------
SAMPLE_COURSES = [
    {"id": "c1", "title": "CS50 - Introduction to Computer Science", "provider": "Harvard / edX", "url": "https://cs50.harvard.edu", "image": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800", "duration": "12 weeks", "level": "Beginner", "is_free": True, "career_paths": ["job", "higher_education", "startup"]},
    {"id": "c2", "title": "Google Data Analytics Professional", "provider": "Coursera (Google)", "url": "https://www.coursera.org/professional-certificates/google-data-analytics", "image": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800", "duration": "6 months", "level": "Intermediate", "is_free": False, "career_paths": ["job", "business"]},
    {"id": "c3", "title": "How to Start a Startup", "provider": "Y Combinator", "url": "https://www.startupschool.org", "image": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800", "duration": "10 weeks", "level": "Beginner", "is_free": True, "career_paths": ["startup", "business"]},
    {"id": "c4", "title": "MIT 6.006 - Introduction to Algorithms", "provider": "MIT OCW", "url": "https://ocw.mit.edu", "image": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800", "duration": "Self-paced", "level": "Advanced", "is_free": True, "career_paths": ["higher_education", "job"]},
    {"id": "c5", "title": "GRE / GMAT Prep Masterclass", "provider": "Khan Academy", "url": "https://www.khanacademy.org", "image": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800", "duration": "Self-paced", "level": "All", "is_free": True, "career_paths": ["higher_education"]},
    {"id": "c6", "title": "The Lean Startup MBA", "provider": "Udemy", "url": "https://www.udemy.com", "image": "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800", "duration": "20 hours", "level": "Intermediate", "is_free": False, "career_paths": ["startup", "business"]},
    {"id": "c7", "title": "AWS Cloud Practitioner", "provider": "AWS", "url": "https://aws.amazon.com/training", "image": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800", "duration": "8 weeks", "level": "Beginner", "is_free": True, "career_paths": ["job"]},
    {"id": "c8", "title": "Financial Markets - Yale", "provider": "Coursera (Yale)", "url": "https://www.coursera.org/learn/financial-markets-global", "image": "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=800", "duration": "33 hours", "level": "Beginner", "is_free": True, "career_paths": ["business", "higher_education"]},
]

SAMPLE_MENTORS = [
    {"id": "m1", "full_name": "Priya Sharma", "title": "Senior SWE @ Google", "expertise": ["job"], "category": "it_software", "tags": ["Tech", "FAANG"], "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400", "bio": "10+ years in distributed systems.", "rating": 4.9, "sessions": 230, "linkedin_url": "https://linkedin.com/in/priya"},
    {"id": "m2", "full_name": "Arjun Mehta", "title": "Founder @ FintechX", "expertise": ["startup", "business"], "category": "startup_mentor", "tags": ["Entrepreneur", "Fintech"], "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400", "bio": "Built and sold 2 startups.", "rating": 4.8, "sessions": 110, "linkedin_url": "https://linkedin.com/in/arjun"},
    {"id": "m3", "full_name": "Dr. Anjali Rao", "title": "Professor @ IIT Bombay", "expertise": ["higher_education"], "category": "higher_education", "tags": ["Research", "PhD"], "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400", "bio": "CV researcher; PhD application mentor.", "rating": 5.0, "sessions": 88, "linkedin_url": "https://linkedin.com/in/anjali"},
    {"id": "m4", "full_name": "Rahul Iyer", "title": "VP Strategy @ Tata", "expertise": ["business", "job"], "category": "business_mentor", "tags": ["Corporate", "Strategy"], "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400", "bio": "INSEAD MBA; corporate career mentor.", "rating": 4.7, "sessions": 156, "linkedin_url": "https://linkedin.com/in/rahul"},
    {"id": "m5", "full_name": "Sneha Kapoor", "title": "Engineering Manager @ Stripe", "expertise": ["job", "startup"], "category": "engineering_manager", "tags": ["EM", "Product"], "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400", "bio": "Engineer-to-EM transitions; team scaling.", "rating": 4.9, "sessions": 175, "linkedin_url": "https://linkedin.com/in/sneha"},
    {"id": "m6", "full_name": "Vikram Singh", "title": "Investor @ Sequoia", "expertise": ["startup", "business"], "category": "startup_advisor", "tags": ["VC", "Funding"], "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400", "bio": "Helping founders raise their seed.", "rating": 4.8, "sessions": 92, "linkedin_url": "https://linkedin.com/in/vikram"},
    {"id": "m7", "full_name": "Karan Verma", "title": "Tech Recruiter @ Microsoft", "expertise": ["job"], "category": "tech_recruiter", "tags": ["Hiring", "Sourcing", "Big Tech"], "avatar": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400", "bio": "Sourced 500+ engineers for FAANG. Knows what hiring panels look for.", "rating": 4.8, "sessions": 142, "linkedin_url": "https://linkedin.com/in/karan"},
    {"id": "m8", "full_name": "Ritu Aggarwal", "title": "HR Director @ Flipkart", "expertise": ["job"], "category": "hr_mentor", "tags": ["HR", "People Ops", "Comp"], "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400", "bio": "12+ yrs in HR, talent acquisition & comp strategy.", "rating": 4.7, "sessions": 98, "linkedin_url": "https://linkedin.com/in/ritu"},
    {"id": "m9", "full_name": "Aditi Nair", "title": "Career Coach (ex-Deloitte)", "expertise": ["job"], "category": "career_coach", "tags": ["Resume", "Interviews", "Comm"], "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400", "bio": "Resume reviews, mock interviews, soft-skill workshops.", "rating": 4.9, "sessions": 312, "linkedin_url": "https://linkedin.com/in/aditi"},
    {"id": "m10", "full_name": "Vivek Bhat", "title": "Industry Advisor (Manufacturing)", "expertise": ["business"], "category": "industry_advisor", "tags": ["Manufacturing", "Strategy", "Supply Chain"], "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400", "bio": "30+ yrs in industrial ops. Advisor to 4 unicorns.", "rating": 4.8, "sessions": 64, "linkedin_url": "https://linkedin.com/in/vivek"},
]

SAMPLE_INTERNSHIPS = [
    {"id": "i1", "title": "Software Engineering Intern", "company": "Microsoft", "location": "Hyderabad / Remote", "stipend": "INR 80,000/month", "duration": "3 months", "skills": ["Python", "C++", "Algorithms"], "url": "https://careers.microsoft.com", "image": "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=800", "career_paths": ["job", "higher_education"], "type": "internship", "domain": "Engineering", "mode": "hybrid", "deadline": "2026-08-15", "applicants_count": 1240, "description": "Build features for Office 365. Code in TypeScript & C#.", "match_signals": ["Software Engineering", "Engineering", "Computer Science"]},
    {"id": "i2", "title": "Data Science Intern", "company": "Flipkart", "location": "Bangalore", "stipend": "INR 60,000/month", "duration": "6 months", "skills": ["Python", "SQL", "ML"], "url": "https://www.flipkartcareers.com", "image": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800", "career_paths": ["job"], "type": "internship", "domain": "Data Science", "mode": "onsite", "deadline": "2026-07-30", "applicants_count": 856, "description": "Apply ML to e-commerce. Work with petabyte-scale data.", "match_signals": ["Data Science", "AI/ML", "Analytics"]},
    {"id": "i3", "title": "Product Management Intern", "company": "Razorpay", "location": "Bangalore / Remote", "stipend": "INR 50,000/month", "duration": "3 months", "skills": ["Product", "SQL"], "url": "https://razorpay.com/jobs", "image": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800", "career_paths": ["job", "startup"], "type": "internship", "domain": "Product", "mode": "hybrid", "deadline": "2026-08-10", "applicants_count": 612, "description": "Drive payment-product roadmap end-to-end.", "match_signals": ["Product Manager", "Product", "Startup"]},
    {"id": "i4", "title": "Founders Office Intern", "company": "Zerodha", "location": "Bangalore", "stipend": "INR 40,000/month", "duration": "6 months", "skills": ["Strategy", "Business"], "url": "https://zerodha.com/careers", "image": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800", "career_paths": ["business", "startup"], "type": "internship", "domain": "Business", "mode": "onsite", "deadline": "2026-07-25", "applicants_count": 420, "description": "Work directly with founders on strategy & ops.", "match_signals": ["Business", "Startup", "Strategy"]},
    {"id": "i5", "title": "Research Intern", "company": "IIT Madras", "location": "Chennai", "stipend": "INR 15,000/month", "duration": "2 months", "skills": ["Research", "Python"], "url": "https://www.iitm.ac.in", "image": "https://images.unsplash.com/photo-1562774053-701939374585?w=800", "career_paths": ["higher_education"], "type": "internship", "domain": "Research", "mode": "onsite", "deadline": "2026-07-15", "applicants_count": 188, "description": "Contribute to AI research with PhD-level mentors.", "match_signals": ["Research", "AI/ML", "Higher Education"]},
    {"id": "i6", "title": "Marketing Intern", "company": "Swiggy", "location": "Bangalore / Remote", "stipend": "INR 35,000/month", "duration": "3 months", "skills": ["Marketing", "Analytics"], "url": "https://careers.swiggy.com", "image": "https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=800", "career_paths": ["job", "business"], "type": "internship", "domain": "Marketing", "mode": "hybrid", "deadline": "2026-08-20", "applicants_count": 950, "description": "Run growth & brand campaigns at scale.", "match_signals": ["Marketing", "Business"]},
    {"id": "j1", "title": "Backend Engineer (SDE-1)", "company": "Razorpay", "location": "Bangalore", "stipend": "INR 22-32 LPA", "duration": "Full-time", "skills": ["Go", "Postgres", "Redis"], "url": "https://razorpay.com/jobs", "image": "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800", "career_paths": ["job"], "type": "job", "domain": "Engineering", "mode": "onsite", "deadline": "2026-09-01", "applicants_count": 1420, "description": "Build payment APIs handling millions of TPS.", "match_signals": ["Software Engineering", "Engineering"]},
    {"id": "j2", "title": "Frontend Engineer (Remote)", "company": "Atlassian", "location": "Remote (India)", "stipend": "INR 28-40 LPA", "duration": "Full-time", "skills": ["React", "TypeScript", "GraphQL"], "url": "https://atlassian.com/careers", "image": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800", "career_paths": ["job"], "type": "job", "domain": "Engineering", "mode": "remote", "deadline": "2026-08-30", "applicants_count": 920, "description": "Ship Jira UI used by 200K+ teams worldwide.", "match_signals": ["Software Engineering", "Engineering"]},
    {"id": "j3", "title": "ML Engineer", "company": "Sarvam AI", "location": "Bangalore", "stipend": "INR 35-50 LPA", "duration": "Full-time", "skills": ["PyTorch", "LLMs", "CUDA"], "url": "https://www.sarvam.ai", "image": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800", "career_paths": ["job", "startup"], "type": "job", "domain": "Data Science", "mode": "hybrid", "deadline": "2026-09-15", "applicants_count": 480, "description": "Train India's first multilingual foundation model.", "match_signals": ["Data Science", "AI/ML", "Startup"]},
    {"id": "j4", "title": "Investment Analyst", "company": "Sequoia (Peak XV)", "location": "Bangalore / Mumbai", "stipend": "INR 25-35 LPA", "duration": "Full-time", "skills": ["Excel", "Modeling", "Diligence"], "url": "https://www.peakxv.com", "image": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800", "career_paths": ["business"], "type": "job", "domain": "Finance", "mode": "onsite", "deadline": "2026-08-05", "applicants_count": 312, "description": "Source & evaluate seed-to-Series-B investments.", "match_signals": ["Finance", "Business", "Investment"]},
    {"id": "j5", "title": "PhD-Track Researcher", "company": "Microsoft Research", "location": "Bangalore", "stipend": "INR 18-28 LPA", "duration": "Full-time", "skills": ["Research", "Publications"], "url": "https://www.microsoft.com/research", "image": "https://images.unsplash.com/photo-1532618793091-ec5fe9635fbd?w=800", "career_paths": ["higher_education", "job"], "type": "job", "domain": "Research", "mode": "onsite", "deadline": "2026-09-30", "applicants_count": 96, "description": "Publish in top venues, collaborate with global PhDs.", "match_signals": ["Research", "Higher Education"]},
    {"id": "j6", "title": "Founder's Associate", "company": "Cred", "location": "Bangalore", "stipend": "INR 18-28 LPA", "duration": "Full-time", "skills": ["Strategy", "0-to-1"], "url": "https://cred.club", "image": "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800", "career_paths": ["business", "startup"], "type": "job", "domain": "Business", "mode": "onsite", "deadline": "2026-08-12", "applicants_count": 540, "description": "Run new bets directly with the CEO.", "match_signals": ["Business", "Startup", "Strategy"]},
    {"id": "i7", "title": "UX Design Intern", "company": "Spotify", "location": "Remote", "stipend": "INR 50,000/month", "duration": "4 months", "skills": ["Figma", "User Research"], "url": "https://www.lifeatspotify.com", "image": "https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=800", "career_paths": ["job"], "type": "internship", "domain": "Design", "mode": "remote", "deadline": "2026-08-25", "applicants_count": 720, "description": "Design listening experiences for 600M+ users.", "match_signals": ["Design", "UX"]},
    {"id": "i8", "title": "DevOps Intern", "company": "Postman", "location": "Bangalore / Remote", "stipend": "INR 45,000/month", "duration": "6 months", "skills": ["AWS", "Kubernetes", "Terraform"], "url": "https://www.postman.com/company/careers", "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800", "career_paths": ["job"], "type": "internship", "domain": "Engineering", "mode": "hybrid", "deadline": "2026-09-05", "applicants_count": 380, "description": "Scale APIs used by 30M+ developers.", "match_signals": ["Software Engineering", "Engineering", "DevOps"]},
    {"id": "i9", "title": "Content Strategy Intern", "company": "The Ken", "location": "Bangalore / Remote", "stipend": "INR 25,000/month", "duration": "3 months", "skills": ["Writing", "Research"], "url": "https://the-ken.com", "image": "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800", "career_paths": ["job", "business"], "type": "internship", "domain": "Content", "mode": "remote", "deadline": "2026-07-20", "applicants_count": 290, "description": "Investigate & write deep-dive business stories.", "match_signals": ["Content", "Writing", "Business"]},
    {"id": "j7", "title": "Mechanical Design Engineer", "company": "Ola Electric", "location": "Bangalore", "stipend": "INR 14-22 LPA", "duration": "Full-time", "skills": ["CAD", "FEA", "Manufacturing"], "url": "https://olaelectric.com/careers", "image": "https://images.unsplash.com/photo-1593941707874-ef25b8b4a92b?w=800", "career_paths": ["job"], "type": "job", "domain": "Engineering", "mode": "onsite", "deadline": "2026-08-22", "applicants_count": 410, "description": "Design EV powertrain components.", "match_signals": ["Mechanical", "Engineering"]},
    {"id": "j8", "title": "Clinical Data Scientist", "company": "Apollo Hospitals", "location": "Hyderabad", "stipend": "INR 12-18 LPA", "duration": "Full-time", "skills": ["R", "Biostatistics"], "url": "https://www.apollohospitals.com/careers", "image": "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800", "career_paths": ["higher_education", "job"], "type": "job", "domain": "Healthcare", "mode": "onsite", "deadline": "2026-09-10", "applicants_count": 145, "description": "Use AI to improve patient outcomes.", "match_signals": ["Healthcare", "Data Science"]},
    {"id": "j9", "title": "Game Developer", "company": "Krafton India", "location": "Bangalore", "stipend": "INR 16-26 LPA", "duration": "Full-time", "skills": ["Unreal Engine", "C++"], "url": "https://krafton.com/careers", "image": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800", "career_paths": ["job"], "type": "job", "domain": "Engineering", "mode": "onsite", "deadline": "2026-08-28", "applicants_count": 670, "description": "Build the next BGMI feature.", "match_signals": ["Software Engineering", "Engineering", "Gaming"]},
    {"id": "i10", "title": "Architecture Intern", "company": "WeWork India", "location": "Mumbai / Bangalore", "stipend": "INR 20,000/month", "duration": "3 months", "skills": ["AutoCAD", "Sketch"], "url": "https://www.wework.co.in", "image": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800", "career_paths": ["job"], "type": "internship", "domain": "Architecture", "mode": "onsite", "deadline": "2026-07-28", "applicants_count": 110, "description": "Plan flexible workspaces of the future.", "match_signals": ["Architecture", "Design"]},
    {"id": "j10", "title": "Public Policy Associate", "company": "Niti Aayog", "location": "New Delhi", "stipend": "INR 10-15 LPA", "duration": "Full-time", "skills": ["Policy", "Writing"], "url": "https://niti.gov.in", "image": "https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800", "career_paths": ["business", "higher_education"], "type": "job", "domain": "Policy", "mode": "onsite", "deadline": "2026-09-20", "applicants_count": 234, "description": "Draft national-level economic policy.", "match_signals": ["Policy", "Business"]},
]

SAMPLE_EVENTS = [
    {"id": "e1", "title": "Smart India Hackathon 2026", "category": "hackathon", "organizer": "Govt. of India", "image": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800", "venue": "All India - Online + Offline", "start_date": "2026-08-15", "registration_deadline": "2026-07-30", "url": "https://www.sih.gov.in", "tags": ["AI/ML", "Innovation", "Govt"]},
    {"id": "e2", "title": "AI Training @ IIT Hyderabad", "category": "workshop", "organizer": "IIT Hyderabad", "image": "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=800", "venue": "IIT Hyderabad", "start_date": "2026-06-12", "registration_deadline": "2026-06-05", "url": "https://www.iith.ac.in", "tags": ["AI", "Hands-on"]},
    {"id": "e3", "title": "Startup Demo Day - Bengaluru", "category": "startup", "organizer": "T-Hub", "image": "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800", "venue": "T-Hub, Hyderabad", "start_date": "2026-09-20", "registration_deadline": "2026-09-10", "url": "https://t-hub.co", "tags": ["Pitch", "Funding"]},
    {"id": "e4", "title": "Networking Meet - SF Tech", "category": "networking", "organizer": "TechSoc", "image": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800", "venue": "Online", "start_date": "2026-07-05", "registration_deadline": "2026-07-04", "url": "https://example.com", "tags": ["Network", "Tech"]},
    {"id": "e5", "title": "TechFest IIT Bombay", "category": "fest", "organizer": "IIT Bombay", "image": "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800", "venue": "IIT Bombay", "start_date": "2026-12-15", "registration_deadline": "2026-12-01", "url": "https://techfest.org", "tags": ["Cultural", "Tech"]},
    {"id": "e6", "title": "Codeathon 2026", "category": "hackathon", "organizer": "MLH India", "image": "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800", "venue": "Online", "start_date": "2026-05-22", "registration_deadline": "2026-05-20", "url": "https://mlh.io", "tags": ["Code", "Online"]},
]

SAMPLE_DEALS = [
    {"id": "d1", "title": "GitHub Student Developer Pack", "brand": "GitHub", "category": "Tech", "discount": "Free Pro tools worth $200K+", "code": "STUDENT-PACK", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800", "url": "https://education.github.com/pack"},
    {"id": "d2", "title": "Notion Personal Pro", "brand": "Notion", "category": "Productivity", "discount": "100% OFF", "code": "STUDENT-FREE", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800", "url": "https://www.notion.so/students"},
    {"id": "d3", "title": "Figma Education Plan", "brand": "Figma", "category": "Design", "discount": "100% OFF Professional", "code": "EDU-FIGMA", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800", "url": "https://www.figma.com/education"},
    {"id": "d4", "title": "Zomato Pro Student", "brand": "Zomato", "category": "Food", "discount": "50% OFF", "code": "STUDENT50", "expires": "31 Dec 2026", "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800", "url": "https://www.zomato.com"},
    {"id": "d5", "title": "Spotify Premium Student", "brand": "Spotify", "category": "Entertainment", "discount": "INR 59/month", "code": "STUDENT-IND", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=800", "url": "https://www.spotify.com/student"},
    {"id": "d6", "title": "Apple Education Store", "brand": "Apple", "category": "Tech", "discount": "Up to 10% OFF + AirPods", "code": "EDU-APPLE", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", "url": "https://www.apple.com/in-edu/store"},
    {"id": "d7", "title": "Coursera Plus", "brand": "Coursera", "category": "Education", "discount": "Free for select students", "code": "COURSERA-EDU", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800", "url": "https://www.coursera.org"},
    {"id": "d8", "title": "Amazon Prime Student", "brand": "Amazon", "category": "Shopping", "discount": "INR 749/year", "code": "PRIME-STUDENT", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800", "url": "https://www.amazon.in/amazonprime"},
]

SAMPLE_FINANCIAL = [
    {"id": "f1", "kind": "loan", "title": "HDFC Credila Education Loan", "provider": "HDFC Credila", "highlight": "Up to INR 1.5 Cr - From 9.5%", "url": "https://www.hdfccredila.com", "description": "Education loans for India and abroad with flexible repayment."},
    {"id": "f2", "kind": "loan", "title": "SBI Scholar Loan", "provider": "State Bank of India", "highlight": "From 8.55% p.a.", "url": "https://www.sbi.co.in", "description": "Government-backed education loan with subsidy options."},
    {"id": "f3", "kind": "loan", "title": "Avanse Global Loan", "provider": "Avanse Financial Services", "highlight": "Up to INR 75 L abroad", "url": "https://www.avanse.com", "description": "Loans for international study with deferred repayment."},
    {"id": "f4", "kind": "scholarship", "title": "Inspire Scholarship", "provider": "DST, Govt of India", "highlight": "INR 80,000/year - BSc/MSc", "url": "https://online-inspire.gov.in", "description": "For top 1% rank holders in 12th board pursuing science."},
    {"id": "f5", "kind": "scholarship", "title": "Reliance Foundation Scholarship", "provider": "Reliance Foundation", "highlight": "Up to INR 2 L/year", "url": "https://www.scholarships.reliancefoundation.org", "description": "UG/PG merit + need-based scholarship for Indian students."},
    {"id": "f6", "kind": "scholarship", "title": "Tata Trusts Scholarship", "provider": "Tata Trusts", "highlight": "Need-based grants", "url": "https://www.tatatrusts.org", "description": "For deserving students across various streams."},
]

SAMPLE_INSURANCE = [
    {"id": "ins1", "kind": "medical", "title": "Star Health Student Care", "provider": "Star Health", "highlight": "INR 2,500/year", "url": "https://www.starhealth.in", "description": "Comprehensive health cover for students aged 16-25."},
    {"id": "ins2", "kind": "medical", "title": "HDFC ERGO Student Travel", "provider": "HDFC ERGO", "highlight": "From INR 5,000", "url": "https://www.hdfcergo.com", "description": "Travel & study-abroad insurance for international students."},
    {"id": "ins3", "kind": "bike", "title": "Two-Wheeler Insurance", "provider": "Acko", "highlight": "From INR 999/year", "url": "https://www.acko.com", "description": "Affordable bike insurance with claim guarantee."},
    {"id": "ins4", "kind": "loan", "title": "Loan Protection Cover", "provider": "ICICI Lombard", "highlight": "Optional add-on", "url": "https://www.icicilombard.com", "description": "Covers EMI in case of unexpected events."},
]

SAMPLE_HOUSING = [
    {"id": "h1", "country": "India", "title": "Stanza Living - Co-living", "provider": "Stanza Living", "highlight": "From INR 8,000/mo", "url": "https://www.stanzaliving.com", "cities": ["Bangalore", "Mumbai", "Delhi"], "description": "Premium co-living for students across 25+ Indian cities."},
    {"id": "h2", "country": "India", "title": "OYO Life - PG", "provider": "OYO Life", "highlight": "From INR 6,500/mo", "url": "https://www.oyorooms.com/oyo-life", "cities": ["Pune", "Hyderabad"], "description": "Furnished PG accommodation near major colleges."},
    {"id": "h3", "country": "USA", "title": "Amber Student", "provider": "Amber", "highlight": "From $600/mo", "url": "https://amberstudent.com", "cities": ["Boston", "NYC", "SF"], "description": "Verified student housing across US universities."},
    {"id": "h4", "country": "Canada", "title": "Casita Housing", "provider": "Casita", "highlight": "From CAD 700/mo", "url": "https://casita.com", "cities": ["Toronto", "Vancouver"], "description": "Student housing across Canada."},
    {"id": "h5", "country": "USA", "title": "RentSpree Student", "provider": "RentSpree", "highlight": "Roommate matching", "url": "https://rentspree.com", "cities": ["LA", "Seattle"], "description": "Apartment + roommate finder for students."},
]


async def seed_data():
    """Seed catalog collections if empty."""
    seeders = [
        (db.courses, SAMPLE_COURSES),
        (db.sample_mentors, SAMPLE_MENTORS),
        (db.internships, SAMPLE_INTERNSHIPS),
        (db.events, SAMPLE_EVENTS),
        (db.deals, SAMPLE_DEALS),
        (db.financial, SAMPLE_FINANCIAL),
        (db.insurance, SAMPLE_INSURANCE),
        (db.housing, SAMPLE_HOUSING),
    ]
    for coll, data in seeders:
        if await coll.count_documents({}) == 0:
            await coll.insert_many([dict(d) for d in data])
            logger.info(f"Seeded {coll.name}")
    # Legacy resources collection (backward-compat)
    if await db.resources.count_documents({}) == 0:
        legacy = (
            [{**i, "category": "insurance"} for i in SAMPLE_INSURANCE]
            + [{**h, "category": "housing"} for h in SAMPLE_HOUSING]
            + [{**l, "category": "loans"} for l in SAMPLE_FINANCIAL if l.get("kind") == "loan"]
        )
        await db.resources.insert_many(legacy)

    from features.routers.blog import seed_blog_posts_if_empty
    from features.routers.community import seed_community_data_if_empty
    await seed_blog_posts_if_empty()
    await seed_community_data_if_empty()


async def seed_admin():
    """Seed a default admin user from .env credentials (idempotent).

    SECURITY: ADMIN_PASSWORD must be set in .env. A hardcoded fallback
    would allow attackers to predict admin credentials on unconfirmed deployments.
    """
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@studentalumni.ai")
    admin_password = os.environ.get("ADMIN_PASSWORD", "")

    if not admin_password:
        if os.getenv("ENV") == "production":
            raise RuntimeError(
                "ADMIN_PASSWORD environment variable is required in production. "
                "Set it in .env to create the initial admin account."
            )
        admin_password = "admin123"
        logger.warning(
            "ADMIN_PASSWORD not set -- using default 'admin123' (dev only). "
            "Set ADMIN_PASSWORD in .env for production."
        )

    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        hashed = bcrypt.hashpw(admin_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        admin_doc = {
            "email": admin_email,
            "password_hash": hashed,
            "full_name": "Platform Admin",
            "role": "admin",
            "is_active": True,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "unique_id": "SA-ADMIN-001",
            "sa_id": "SA-ADMIN-001",
            "profile_completed": True,
        }
        await db.users.insert_one(admin_doc)
        logger.info("Default admin account seeded: %s", admin_email)
    else:
        logger.info("Admin account already exists: %s", admin_email)
