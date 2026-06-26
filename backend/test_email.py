import asyncio
import os
import sys

sys.path.append(os.getcwd())
from core.email import send_email

async def main():
    print("Testing email send...")
    success = await send_email("hr@studentalumni.ai", "Test Subject", "Test Body")
    print("SUCCESS:", success)

asyncio.run(main())
