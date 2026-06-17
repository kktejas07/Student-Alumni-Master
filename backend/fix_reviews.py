import asyncio

async def main():
    from db import client as client
    db = client.studentalumniadmin

    reviews = await db.reviews.find({"mentor_id": "auto-resolved"}).to_list(1000)
    print(f"Found {len(reviews)} reviews with auto-resolved mentor_id")
    
    fixed = 0
    for r in reviews:
        if r.get("booking_id"):
            b_id = r["booking_id"]
            booking = None
            if ObjectId.is_valid(b_id):
                booking = await db.bookings.find_one({"_id": ObjectId(b_id)})
            if not booking:
                booking = await db.bookings.find_one({"id": b_id})
                
            if booking and "mentor_id" in booking:
                mentor_id = str(booking["mentor_id"])
                await db.reviews.update_one({"_id": r["_id"]}, {"$set": {"mentor_id": mentor_id}})
                print(f"Fixed review {r['_id']} -> mentor {mentor_id}")
                
                # Update mentor stats
                from reviews import refresh_mentor_rating
                await refresh_mentor_rating(db, mentor_id)
                fixed += 1
            else:
                print(f"Could not find booking for review {r['_id']}")
                
    print(f"Successfully fixed {fixed} reviews.")

if __name__ == "__main__":
    asyncio.run(main())
