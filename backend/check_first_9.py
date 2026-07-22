import asyncio
from db import db

ACCOUNTS = [
    "mentor01@test.com",
    "mentor02@test.com",
    "admin2@careerpath.app",
    "test-alumni-85033bd9@test.com",
    "iith@university.in",
    "iitb@university.in",
    "student01@test.com",
    "alumni-test-1777465028@test.com",
    "iiitb@university.in",
]

async def main():
    print("Detailed info for first 9 accounts:")
    print("=" * 80)
    for email in ACCOUNTS:
        u = await db.users.find_one({"email": email}, {
            "email": 1, "role": 1, "full_name": 1, "tier": 1,
            "onboarding_completed": 1, "mentor_status": 1,
            "approved": 1, "is_super_admin": 1,
            "school_info": 1, "mentor_info": 1,
            "skills": 1, "password_hash": 1,
            "_persona": 1, "category": 1,
        })
        if u:
            print(f"Email: {u.get('email')}")
            print(f"  Role:       {u.get('role')}")
            print(f"  Name:       {u.get('full_name')}")
            print(f"  Onboarded:  {u.get('onboarding_completed')}")
            print(f"  Approved:   {u.get('approved')}")
            print(f"  Super Admin:{u.get('is_super_admin')}")
            print(f"  Mentor Stat:{u.get('mentor_status')}")
            print(f"  Has skills: {len(u.get('skills') or [])}")
            print(f"  Pwd hash:   {'YES' if u.get('password_hash') else 'NO'}")
            print()

asyncio.run(main())
