import re

def refactor():
    with open("server.py", "r") as f:
        lines = f.readlines()

    user_endpoints = []
    new_server_lines = []

    # States
    in_me = False
    in_suggestions = False
    in_courses = False
    in_badges = False
    in_certificates = False
    in_id_card = False
    in_onboarding = False
    in_audit = False
    in_put_me = False
    in_completion = False
    in_skills = False
    in_integrations = False
    in_resume = False
    in_password = False
    in_transition = False
    
    i = 0
    while i < len(lines):
        line = lines[i]

        # 1. /auth/me
        if "@api_router.get(\"/auth/me\"" in line:
            in_me = True
        if in_me and "@api_router.get(\"/mentors/suggestions\")" in line:
            in_me = False
        if in_me:
            user_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        # 2. Mentor Suggestions & Organizations
        if line.startswith("# ----------------------------------------------------------------------------") and "Mentor Onboarding" in lines[i+1] if i+1 < len(lines) else False:
            in_suggestions = True
        if in_suggestions and line.startswith("# ----------------------------------------------------------------------------") and "Course / Stream Catalog" in lines[i+1] if i+1 < len(lines) else False:
            in_suggestions = False
        if in_suggestions:
            user_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        # 3. Courses
        if line.startswith("# ----------------------------------------------------------------------------") and "Course / Stream Catalog" in lines[i+1] if i+1 < len(lines) else False:
            in_courses = True
        if in_courses and line.startswith("# ----------------------------------------------------------------------------") and "Badge endpoints" in lines[i+1] if i+1 < len(lines) else False:
            in_courses = False
        if in_courses:
            user_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        # 4. Badges
        if line.startswith("# ----------------------------------------------------------------------------") and "Badge endpoints" in lines[i+1] if i+1 < len(lines) else False:
            in_badges = True
        if in_badges and line.startswith("# ----------------------------------------------------------------------------") and "Certificates" in lines[i+1] if i+1 < len(lines) else False:
            in_badges = False
        if in_badges:
            user_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        # 5. Certificates
        if line.startswith("# ----------------------------------------------------------------------------") and "Certificates" in lines[i+1] if i+1 < len(lines) else False:
            in_certificates = True
        if in_certificates and line.startswith("# ----------------------------------------------------------------------------") and "ID Card" in lines[i+1] if i+1 < len(lines) else False:
            in_certificates = False
        if in_certificates:
            user_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        # 6. ID Card
        if line.startswith("# ----------------------------------------------------------------------------") and "ID Card" in lines[i+1] if i+1 < len(lines) else False:
            in_id_card = True
        if in_id_card and line.startswith("# ----------------------------------------------------------------------------") and "Onboarding & Profile" in lines[i+1] if i+1 < len(lines) else False:
            in_id_card = False
        if in_id_card:
            user_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        # 7. Onboarding & Put Me & Stats & Audit Logs
        if line.startswith("# ----------------------------------------------------------------------------") and "Onboarding & Profile" in lines[i+1] if i+1 < len(lines) else False:
            in_onboarding = True
        if in_onboarding and line.startswith("# ----------------------------------------------------------------------------") and "Skills & Endorsements" in lines[i+1] if i+1 < len(lines) else False:
            in_onboarding = False
        if in_onboarding:
            user_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        # 8. Skills
        if line.startswith("# ----------------------------------------------------------------------------") and "Skills & Endorsements" in lines[i+1] if i+1 < len(lines) else False:
            in_skills = True
        if in_skills and line.startswith("# ----------------------------------------------------------------------------") and "Portals (Student/Alumni)" in lines[i+1] if i+1 < len(lines) else False:
            in_skills = False
        if in_skills:
            user_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        # 9. Integrations & Resume & Password
        if line.startswith("# ----------------------------------------------------------------------------") and "Integrations & Resume" in lines[i+1] if i+1 < len(lines) else False:
            in_integrations = True
        if in_integrations and line.startswith("# ----------------------------------------------------------------------------") and "Notifications" in lines[i+1] if i+1 < len(lines) else False:
            in_integrations = False
        if in_integrations:
            user_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue
            
        # 10. Transition Alumni
        if "@api_router.post(\"/users/me/transition-alumni\"" in line:
            in_transition = True
        if in_transition and line.startswith("# ----------------------------------------------------------------------------") and "College Metrics" in lines[i+1] if i+1 < len(lines) else False:
            in_transition = False
        if in_transition:
            user_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        new_server_lines.append(line)
        i += 1

    users_py_content = """import io
import os
import random
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Dict

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Form, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from bson import ObjectId

from core.db import db
from core.security import (
    hash_password, verify_password, create_access_token, _audit_log, _audit_log_many
)
from core.models import UserRole, UserResponse, SchoolInfo, MentorInfo, AlumniInfo, StudentInfo, CareerPath, EducationLevel
from server import serialize_user, get_current_user, validate_student_class, send_push_notification

router = APIRouter(tags=["users"])

# ----- User Endpoints -----
""" + "".join(user_endpoints)

    with open("routers/users.py", "w") as f:
        f.write(users_py_content)
        
    for i, line in enumerate(new_server_lines):
        if "from routers.auth import router as auth_router" in line:
            new_server_lines.insert(i, "from routers.users import router as users_router\napi_router.include_router(users_router)\n")
            break

    with open("server.py", "w") as f:
        f.writelines(new_server_lines)

if __name__ == "__main__":
    refactor()
