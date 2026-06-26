import os, sys, json, urllib.request
sys.path.insert(0, os.path.abspath('.'))
from tests.helpers.test_data import VALID_STUDENT, MONGO_URL, DB_NAME
from pymongo import MongoClient

print('Email:', VALID_STUDENT['email'])

client = MongoClient(MONGO_URL)
user = client[DB_NAME].users.find_one({'email': VALID_STUDENT['email']})
print('DB User:', user)

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/auth/login', 
    data=json.dumps({'email':VALID_STUDENT['email'],'password':VALID_STUDENT['password']}).encode('utf-8'), 
    headers={'Content-Type': 'application/json'}
)
try: 
    urllib.request.urlopen(req)
    print("API SUCCESS")
except urllib.error.HTTPError as e: 
    print('API Error:', e.read())
