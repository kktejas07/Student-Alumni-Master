import asyncio
import os
import sys

# Add backend to path so we can import core.db
sys.path.append(os.getcwd())

from core.db import db, client
from core.email import send_email

async def main():
    print("Fetching tools from Atlas...")
    count = 0
    config = None
    async for doc in db.installed_tools.find({"tool_id": "gmail"}):
        print("FOUND:", doc)
        config = doc
        count += 1
    print("TOTAL GMAIL DOCS:", count)
    
    if config:
        print("\nTesting email send with these credentials...")
        creds = config.get("credentials", {})
        sender_email = creds.get("client_id")
        # Try to send email to the sender's own email to test
        if sender_email:
            success = await send_email(sender_email, "Test Email from Backend", "This is a test email.")
            print("SEND SUCCESS:", success)
        else:
            print("No sender email found in config.")

    client.close()

asyncio.run(main())
