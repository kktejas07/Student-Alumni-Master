from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/studentalumniadmin?directConnection=true")
db = client["studentalumniadmin"]

c = db.echo_coupons.find_one({"coupon_code": "BREAKFAST-9EE900"})
print("Coupon:", c)
