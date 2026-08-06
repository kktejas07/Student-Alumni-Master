import sys
import os
import asyncio
from pathlib import Path

backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from agent_k.core.engine import stream_message
from agent_k.rag.store import init_collection

async def run():
    print("Testing stream_message...")
    
    user_id = "test_user_id"
    message = "How do I access student discounts and perks?"
    user_role = "student"
    
    # Run the generator
    try:
        async for chunk in stream_message(user_id, message, user_role):
            print(chunk, end="")
    except Exception as e:
        print(f"\nError: {e}")
    print("\n\nDone.")

if __name__ == "__main__":
    asyncio.run(run())
