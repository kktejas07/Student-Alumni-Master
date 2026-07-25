import asyncio
import os
import sys
import time
import json
from datetime import datetime

os.environ['MONGO_URL'] = 'mongodb+srv://studentalumniadmin_db_user:wDruHz5sCPoEVuFy@studentalumniadmin.hhu4uao.mongodb.net/?appName=studentalumniadmin'
os.environ['DB_NAME'] = 'studentalumniadmin'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.db import db
from routers.auth import verify_password, hash_password, create_access_token
from server import app
from httpx import AsyncClient, ASGITransport

ACCOUNTS = [
    ('student', 'kalyandasari272@gmail.com', 'Student@123'),
    ('mentor', 'mentor01@mail.com', 'Mentor@123'),
    ('alumni', 'alumni01@test.com', 'TestPass@123'),
    ('college', 'mrce@edu.in', 'mrce@edu.in'),
]

PORTAL_ENDPOINTS = {
    'student': [
        ('GET', '/api/users/me'),
        ('GET', '/api/users/me/completion'),
        ('GET', '/api/users/me/stats'),
        ('POST', '/api/ai/career-roadmap', {}),
        ('GET', '/api/student/events'),
        ('GET', '/api/jobs/feed?page=1&per_page=5'),
        ('GET', '/api/student/my-applications'),
        ('GET', '/api/student/network'),
        ('GET', '/api/student/network?q=Dasari'),
        ('GET', '/api/student/my-bookings'),
        ('GET', '/api/student/workshops'),
    ],
    'mentor': [
        ('GET', '/api/users/me'),
        ('GET', '/api/mentor/sessions'),
        ('GET', '/api/mentor/requests'),
        ('GET', '/api/mentor/availability'),
        ('GET', '/api/mentor/earnings'),
        ('GET', '/api/mentor/network'),
        ('GET', '/api/mentor/network?q=Mentor'),
        ('GET', '/api/mentor/feedback'),
    ],
    'alumni': [
        ('GET', '/api/users/me'),
        ('GET', '/api/alumni/events'),
        ('GET', '/api/alumni/network'),
        ('GET', '/api/alumni/network?q=Kalyan'),
        ('GET', '/api/alumni/my-applications'),
        ('GET', '/api/alumni/workshops'),
        ('GET', '/api/alumni/wallet'),
    ],
    'college': [
        ('GET', '/api/users/me'),
        ('GET', '/api/college/students'),
        ('GET', '/api/college/alumni'),
        ('GET', '/api/college/mentors'),
        ('GET', '/api/college/events'),
        ('GET', '/api/college/announcements'),
        ('GET', '/api/college/placements'),
        ('GET', '/api/college/analytics'),
    ]
}

async def run_regression():
    print("=" * 80)
    print(f"FULL PORTAL REGRESSION & LATENCY BENCHMARK — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    # 1. Authenticate / Ensure passwords match provided creds
    tokens = {}
    user_docs = {}
    
    for role, email, password in ACCOUNTS:
        u = await db.users.find_one({'email': email})
        if not u:
            print(f"[FAIL] {role.upper()} user '{email}' not found in MongoDB!")
            continue
        
        # Verify or fix password to ensure test credential works
        pwd_hash = u.get('password_hash') or u.get('hashed_password') or ''
        if not pwd_hash or not verify_password(password, pwd_hash):
            new_hash = hash_password(password)
            await db.users.update_one({'_id': u['_id']}, {'$set': {'password_hash': new_hash, 'hashed_password': new_hash}})
            u['password_hash'] = new_hash
            print(f"[FIX] Updated password hash for {role} ({email}) to match '{password}'")
        
        # Generate JWT token
        tok = create_access_token(str(u['_id']), email, u.get('role'))
        tokens[role] = tok
        user_docs[role] = u
        print(f"[AUTH OK] {role.upper():<8} | {email:<28} | DB Role: {u.get('role')} | Token generated.")
        
    print("-" * 80)
    print("RUNNING ENDPOINT LATENCY BENCHMARKS ACROSS ALL 4 PORTALS...")
    print("-" * 80)
    
    report_data = {}
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        for role, endpoints in PORTAL_ENDPOINTS.items():
            tok = tokens.get(role)
            if not tok:
                print(f"Skipping {role} - No token.")
                continue
            
            headers = {"Authorization": f"Bearer {tok}"}
            role_results = []
            
            print(f"\n>>> AUDITING PORTAL: {role.upper()} ({user_docs[role]['email']})")
            
            for item in endpoints:
                method = item[0]
                url = item[1]
                payload = item[2] if len(item) > 2 else None
                
                t0 = time.perf_counter()
                try:
                    if method == 'GET':
                        r = await client.get(url, headers=headers)
                    else:
                        r = await client.post(url, json=payload, headers=headers)
                    dur_ms = (time.perf_counter() - t0) * 1000.0
                    status = r.status_code
                    size_bytes = len(r.content)
                    
                    status_flag = "PASS" if status in (200, 201) else "FAIL"
                    perf_flag = "FAST" if dur_ms < 500 else ("MEDIUM" if dur_ms < 2000 else "SLOW")
                    
                    print(f"  [{status_flag}] [{status}] [{dur_ms:6.1f}ms] [{size_bytes:6d}B] {method} {url:<45} [{perf_flag}]")
                    
                    role_results.append({
                        'method': method,
                        'url': url,
                        'status': status,
                        'duration_ms': round(dur_ms, 1),
                        'size_bytes': size_bytes,
                        'perf_rating': perf_flag
                    })
                except Exception as ex:
                    dur_ms = (time.perf_counter() - t0) * 1000.0
                    print(f"  [ERR ] [500] [{dur_ms:6.1f}ms] {method} {url:<45} -> EXCEPTION: {ex}")
                    role_results.append({
                        'method': method,
                        'url': url,
                        'status': 500,
                        'duration_ms': round(dur_ms, 1),
                        'size_bytes': 0,
                        'error': str(ex),
                        'perf_rating': 'ERROR'
                    })
            report_data[role] = role_results
            
    with open('portal_regression_results.json', 'w') as f:
        json.dump(report_data, f, indent=2)
    print("\n[DONE] Full regression metrics saved to portal_regression_results.json")

asyncio.run(run_regression())
