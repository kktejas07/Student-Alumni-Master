import asyncio
import os
import sys

# Ensure backend can import core modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.db import db
from server import generate_qr_code

async def main():
    print("Starting QR code migration for existing users...")
    users_cursor = db.users.find({"unique_id": {"$exists": True}})
    count = 0
    async for user in users_cursor:
        uid = user.get("unique_id")
        if uid:
            suffix = uid.split("-")[-1]
            new_qr_payload = f"https://studentalumni.app/verify/{suffix}"
            new_qr_base64 = generate_qr_code(new_qr_payload)
            
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"qr_code_base64": new_qr_base64}}
            )
            count += 1
            if count % 10 == 0:
                print(f"Updated {count} users...")

    print(f"Successfully migrated {count} user QR codes to use the verification URL.")

if __name__ == "__main__":
    asyncio.run(main())
