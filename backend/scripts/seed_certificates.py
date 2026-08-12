import os
import sys
import csv
import io
import asyncio
import hashlib
from datetime import datetime
import certifi
from dotenv import load_dotenv

# Add parent directory to sys.path to allow core.db import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'studentalumniadmin')
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=10000)
db = client[db_name]


async def seed_certificates():
    print("[Seed] Starting certificate database import...")
    
    # ── 1. ECHO 2026 Certificates ──────────────────────────────────────
    echo_csv_path = "/Users/avks/Desktop/Projects /Student Alumni/Student-Alumni-Master/uploads/certificates/echo2026/ECHO2026_Certificate_Index.csv"
    if os.path.exists(echo_csv_path):
        print(f"[Seed] Processing ECHO 2026 Certificates: {echo_csv_path}")
        with open(echo_csv_path, 'r', encoding='utf-8') as f:
            records = list(csv.DictReader(f))
            
        for row in records:
            cert_id = (row.get("Certificate ID") or "").strip()
            name = (row.get("Name") or "").strip()
            roll_no = (row.get("Roll Number") or "").strip()
            branch = (row.get("Branch") or "").strip()
            file_path = (row.get("File") or "").strip()

            if not cert_id or not name:
                continue

            rel_image_url = f"/uploads/certificates/echo2026/{file_path}"
            v_hash = hashlib.sha256(f"{cert_id}:{roll_no}:{name}:ECHO2026".encode("utf-8")).hexdigest()[:16].upper()

            cert_doc = {
                "id": cert_id,
                "certificate_id": cert_id,
                "recipient_name": name,
                "roll_number": roll_no,
                "sa_id": roll_no,
                "branch": branch,
                "title": f"ECHO 2026 Specialization & Achievement ({branch})",
                "event_name": "ECHO 2026",
                "certification_name": "ECHO 2026 Certificate of Achievement",
                "issuer": "Student Alumni Network",
                "issuing_organization": "Student Alumni Platform & ECHO 2026 Council",
                "issue_date": "2026-02-15",
                "status": "valid",
                "status_label": "Officially Verified",
                "is_valid": True,
                "file_path": file_path,
                "image_url": rel_image_url,
                "verification_hash": v_hash,
                "type": "echo2026",
                "updated_at": datetime.now().isoformat()
            }

            await db.certificates.update_one({"id": cert_id}, {"$set": cert_doc}, upsert=True)

        print(f"[Seed OK] Processed {len(records)} ECHO 2026 certificates!")

    # ── 2. VNRVJIET 2026 Certificates ──────────────────────────────────
    vnr_base_dir = "/Users/avks/Desktop/Projects /Student Alumni/Student-Alumni-Master/uploads/certificates/vnrvjiet"
    vnr_csv_path = os.path.join(vnr_base_dir, "index.csv")
    if os.path.exists(vnr_csv_path):
        print(f"[Seed] Processing VNRVJIET 2026 Certificates: {vnr_csv_path}")
        with open(vnr_csv_path, 'r', encoding='utf-8') as f:
            vnr_records = list(csv.DictReader(f))

        for row in vnr_records:
            cert_no = (row.get("Certificate No.") or "").strip()
            recipient = (row.get("Recipient") or "").strip()
            tier = (row.get("Tier") or "").strip()
            dept = (row.get("Department / Club") or "").strip()
            file_rel = (row.get("File") or "").strip()

            if not cert_no or not recipient:
                continue

            # Determine relative folder
            subfolder = ""
            if cert_no.startswith("SA-FAC"):
                subfolder = "Faculty/"
            elif cert_no.startswith("SA-EXC"):
                subfolder = "Award_of_Excellence/"
            elif cert_no.startswith("SA-AMB"):
                subfolder = "Campus_Ambassadors/"

            rel_image_url = f"/uploads/certificates/vnrvjiet/{subfolder}{file_rel}"
            v_hash = hashlib.sha256(f"{cert_no}:{recipient}:{tier}".encode("utf-8")).hexdigest()[:16].upper()

            cert_doc = {
                "id": cert_no,
                "certificate_id": cert_no,
                "recipient_name": recipient,
                "roll_number": cert_no,
                "sa_id": cert_no,
                "branch": dept,
                "title": f"{tier} — VNR VJIET",
                "event_name": "ECHO 2026",
                "certification_name": tier,
                "issuer": "Student Alumni Network",
                "issuing_organization": "Student Alumni Platform & VNR VJIET",
                "issue_date": "2026-08-10",
                "status": "valid",
                "status_label": "Officially Verified",
                "is_valid": True,
                "file_path": f"{subfolder}{file_rel}",
                "image_url": rel_image_url,
                "verification_hash": v_hash,
                "type": "vnrvjiet2026",
                "updated_at": datetime.now().isoformat()
            }

            await db.certificates.update_one({"id": cert_no}, {"$set": cert_doc}, upsert=True)

        print(f"[Seed OK] Processed {len(vnr_records)} VNRVJIET 2026 certificates!")

    # Ensure collection indexes
    await db.certificates.create_index("id", unique=True)
    await db.certificates.create_index("roll_number")
    await db.certificates.create_index("recipient_name")
    await db.certificates.create_index("branch")

    total_count = await db.certificates.count_documents({})
    print(f"[Seed SUCCESS] Total certificates in database: {total_count}")

if __name__ == "__main__":
    asyncio.run(seed_certificates())
