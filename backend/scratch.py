from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/studentalumniadmin?directConnection=true')
db = client.studentalumniadmin

# Let's list collections first
print("Collections:", db.list_collection_names())

user = db.users.find_one({"email": "ksaiabhigna@gamil.com"})
print("Found User:", user)

if user:
    res = db.users.update_one({"_id": user["_id"]}, {"$set": {"email": "ksaiabhigna@gmail.com"}})
    print("Update Result:", res.modified_count)
