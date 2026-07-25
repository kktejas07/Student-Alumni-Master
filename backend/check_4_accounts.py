import asyncio
import os
import sys

os.environ['MONGO_URL'] = 'mongodb+srv://studentalumniadmin_db_user:wDruHz5sCPoEVuFy@studentalumniadmin.hhu4uao.mongodb.net/?appName=studentalumniadmin'
os.environ['DB_NAME'] = 'studentalumniadmin'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.db import db
from routers.auth import verify_password, hash_password

ACCOUNTS = [
    ('student', 'kalyandasari272@gmail.com', 'Student@123'),
    ('mentor', 'mentor01@mail.com', 'Mentor@123'),
    ('alumni', 'alumni01@test.com', 'TestPass@123'),
    ('college', 'mrce@edu.in', 'mrce@edu.in'),
]

async def check():
    print("==================================================")
    print("VERIFYING 4 PORTAL ACCOUNTS IN MONGODB")
    print("==================================================")
    for role, email, password in ACCOUNTS:
        user = await db.users.find_one({'email': email})
        if not user:
            print(f"[MISSING] {role.upper()} | Email: {email} not found in DB!")
            continue
        
        pwd_hash = user.get('password_hash') or user.get('hashed_password') or ''
        valid = False
        if pwd_hash:
            try:
                valid = verify_password(password, pwd_hash)
            except Exception as ex:
                print(f"Error checking hash for {email}: {ex}")
        
        print(f"[{'OK' if valid else 'PWD FAIL'}] Role: {role.upper():<8} | Email: {email:<28} | DB Role: {user.get('role')} | Name: {user.get('full_name')} | Pwd Valid: {valid}")

asyncio.run(check())
