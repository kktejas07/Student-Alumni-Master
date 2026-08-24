import time
import os

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8081")
# IMPORTANT: never commit real credentials. MONGO_URL must be supplied via
# environment variable in CI/runtime — the fallback here is a local placeholder
# only (tests should not rely on a shared Atlas cluster).
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/studentalumniadmin')
DB_NAME = os.environ.get('DB_NAME', 'studentalumniadmin')

VALID_STUDENT = {
    "email": f"test_student_{int(time.time())}@student.edu",
    "password": "Password123!",
    "full_name": "Test Student"
}

VALID_ALUMNI = {
    "email": f"test_alumni_{int(time.time())}@alumni.edu",
    "password": "Password123!",
    "full_name": "Test Alumni"
}

INVALID_LOGIN = {
    "email": "invalid_user@example.com",
    "password": "WrongPassword123!"
}

def generate_email(prefix="test"):
    return f"{prefix}_{int(time.time())}@test.com"
