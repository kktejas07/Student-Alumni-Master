import sys
import os
import asyncio
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from motor.motor_asyncio import AsyncIOMotorClient
from newsletter import process_scheduled_campaigns

async def run_tests():
    # Use MongoDB connection URL
    uri = os.environ.get("MONGO_URL", "mongodb://localhost:27017/studentalumniadmin")
    client = AsyncIOMotorClient(uri)
    db = client["studentalumniadmin"]

    # 1. Insert a scheduled campaign due now
    due_campaign_id = "test_due_campaign_123"
    await db.email_campaigns.delete_one({"campaign_id": due_campaign_id})
    
    now = datetime.now(timezone.utc)
    due_campaign = {
        "campaign_id": due_campaign_id,
        "subject": "Test Scheduled Campaign (Due)",
        "hero_image": "",
        "intro": "This should be sent",
        "body": "Body content here",
        "cta_text": "",
        "cta_url": "https://studentalumni.ai",
        "include_upcoming": False,
        "channels": {
            "email": False,
            "push": False,
            "in_app": True,  # Use in_app so we don't send emails during test
        },
        "recipients_count": 1,
        "sent": False,
        "status": "scheduled",
        "send_at": (now - timedelta(minutes=1)).isoformat(),  # Due 1 minute ago
        "created_at": now.isoformat(),
        "created_by": "test",
        "attempts": []
    }
    await db.email_campaigns.insert_one(due_campaign)

    # 2. Insert a scheduled campaign in the future (not due)
    future_campaign_id = "test_future_campaign_123"
    await db.email_campaigns.delete_one({"campaign_id": future_campaign_id})
    future_campaign = {
        **due_campaign,
        "campaign_id": future_campaign_id,
        "subject": "Test Scheduled Campaign (Future)",
        "send_at": (now + timedelta(hours=1)).isoformat()  # Due in 1 hour
    }
    future_campaign.pop("_id", None)
    await db.email_campaigns.insert_one(future_campaign)

    print("Running process_scheduled_campaigns...")
    await process_scheduled_campaigns(db)

    # 3. Assertions
    due_doc = await db.email_campaigns.find_one({"campaign_id": due_campaign_id})
    assert due_doc is not None
    assert due_doc["status"] == "completed", f"Expected completed, got {due_doc['status']}"
    assert due_doc["sent"] is True

    future_doc = await db.email_campaigns.find_one({"campaign_id": future_campaign_id})
    assert future_doc is not None
    assert future_doc["status"] == "scheduled"
    assert future_doc["sent"] is False

    # Cleanup
    await db.email_campaigns.delete_one({"campaign_id": due_campaign_id})
    await db.email_campaigns.delete_one({"campaign_id": future_campaign_id})

    print("🎉 BACKEND SCHEDULER TESTS COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    asyncio.run(run_tests())
