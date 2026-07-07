import asyncio
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger("EnsureIndexes")

async def main():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'student_alumni')
    logger.info(f"Connecting to MongoDB: {mongo_url} | DB: {db_name}")
    
    from db import client as client
    db = client[db_name]
    
    async def safe_create(collection, *args, **kwargs):
        try:
            await collection.create_index(*args, **kwargs)
        except Exception as e:
            logger.warning(f"Skipping index {args}: {e}")

    # Users
    logger.info("Creating indexes for users collection...")
    await safe_create(db.users, "email")
    await safe_create(db.users, "role")
    await safe_create(db.users, [("role", 1), ("mentor_status", 1)])
    
    # Bookings
    logger.info("Creating indexes for bookings collection...")
    await safe_create(db.bookings, "student_id")
    await safe_create(db.bookings, "mentor_id")
    await safe_create(db.bookings, [("student_id", 1), ("slot_start_iso", -1)])
    await safe_create(db.bookings, [("mentor_id", 1), ("slot_start_iso", -1)])
    
    # Internships
    logger.info("Creating indexes for internships collection...")
    await safe_create(db.internships, "deadline")
    
    # Internship Applications
    logger.info("Creating indexes for internship_applications collection...")
    await safe_create(db.internship_applications, "student_id")
    
    # Event Registrations
    logger.info("Creating indexes for event_registrations collection...")
    await safe_create(db.event_registrations, "student_id")
    await safe_create(db.event_registrations, "event_id")
    
    # Connections
    logger.info("Creating indexes for connections collection...")
    await safe_create(db.connections, "a")
    await safe_create(db.connections, "b")
    # Career AI: skill intelligence queries connections by from_id/to_id + status
    await safe_create(db.connections, "from_id")
    await safe_create(db.connections, "to_id")
    await safe_create(db.connections, [("from_id", 1), ("status", 1)])
    await safe_create(db.connections, [("to_id", 1), ("status", 1)])

    # Career Roadmaps
    logger.info("Creating indexes for career_roadmaps collection...")
    await safe_create(db.career_roadmaps, "user_id")
    
    # Sessions
    logger.info("Creating indexes for sessions collection...")
    await safe_create(db.sessions, "user_id")
    await safe_create(db.sessions, "mentor_id")
    
    # Events
    logger.info("Creating indexes for events collection...")
    await safe_create(db.events, "start_date")
    
    logger.info("All indexes created successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
