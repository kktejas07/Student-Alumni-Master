import os

base_path = r"c:\Users\kavya\OneDrive\Apps\Desktop\Master_\Student-Alumni-Master\knowledge_base"

docs = {
    "docs/onboarding.md": "# Onboarding\n\nWelcome to the Student-Alumni Platform. The onboarding process involves:\n\n- **Students**: Enter your college details, major, and interests to personalize your feed.\n- **Alumni**: Provide your current employment, industry, and availability for mentoring.\n\nData is synced securely during onboarding to populate the Talent Pool and personalize career Intel.",
    "docs/authentication.md": "# Authentication\n\nOur platform uses **JWT (JSON Web Tokens)** for stateless, secure authentication.\n\n- **Login/Signup**: Credentials are encrypted. We utilize a `JWT_SECRET` for signing tokens.\n- **Session**: Managed via HttpOnly cookies and bearer tokens.\n- **Encryption**: Specific sensitive user data is encrypted at rest using a `FERNET_KEY`.\n\nSee the `crud_endpoints.py` and `server.py` for route specifics.",
    "docs/student_module.md": "# Student Module\n\nThe Student Portal is designed to help current students advance their careers.\n\n- **Dashboard**: Access jobs, events, and mentor recommendations.\n- **Mentorship**: Request sessions with alumni.\n- **Career AI**: Run mock interviews and get resume feedback.\n- **Discounts**: Access the Deals Aggregator for student-only offers.",
    "docs/alumni_module.md": "# Alumni Module\n\nThe Alumni Portal allows graduates to give back and network.\n\n- **Mentoring**: Set availability to accept session requests from students.\n- **Talent Pool**: Opt-in to be visible to employers.\n- **Community**: Post jobs and refer students to your company.",
    "docs/mentoring.md": "# Mentoring System\n\nThe mentorship module (`mentor_ai.py`) matches students with alumni based on industry, role, and skills.\n\n- **AI Matching**: Suggests the top 3 mentors for a student.\n- **Scheduling**: Handled via the platform's calendar integrations.\n- **Feedback**: Post-session reviews help improve future matches.",
    "docs/events.md": "# Events\n\nThe `events_aggregator.py` handles university and corporate events.\n\n- **Types**: Webinars, career fairs, and networking sessions.\n- **RSVP**: One-click registration and calendar sync.\n- **Notifications**: Reminders sent before the event starts.",
    "docs/scholarships.md": "# Scholarships & Financial Services\n\nHandled by `financial_services.py` and `higher_ed_platform.py`.\n\n- **Listing**: Aggregates available university and external scholarships.\n- **Application**: Track application status.\n- **Grants**: Specialized funding for specific majors or demographics.",
    "docs/jobs.md": "# Jobs Feed\n\nThe `jobs_feed.py` module manages full-time, part-time, and internship listings.\n\n- **Personalization**: Jobs are ranked based on the student's profile.\n- **Applications**: Apply directly or via external links.\n- **Referrals**: Alumni can flag jobs for referral opportunities.",
    "docs/interviews.md": "# AI Interviews & Career Intel\n\nLeverages `career_ai` and `career_intel.py`.\n\n- **Mock Interviews**: Practice behavioral and technical questions with AI.\n- **Feedback**: Get real-time scoring on clarity, confidence, and accuracy.\n- **Market Trends**: Career Intel provides salary insights and skill demand.",
    "docs/notifications.md": "# Notifications\n\nManaged by `notifications.py` and `background_sync.py`.\n\n- **In-App**: Bell icon alerts for messages, event reminders, and job matches.\n- **Email**: Digest emails and critical alerts.\n- **Preferences**: Users can opt-out of specific notification types.",
    "docs/discounts.md": "# Deals & Discounts\n\nThe `deals_aggregator.py` pulls in exclusive offers.\n\n- **Categories**: Software, hardware, travel, and lifestyle.\n- **Verification**: Requires active student status verification.",
    "docs/admin_panel.md": "# Admin Panel\n\nAccess restricted to platform administrators.\n\n- **User Management**: Approve, ban, or verify users.\n- **Analytics**: View engagement metrics, job placement rates, and system health.\n- **Content Moderation**: Review reported posts or events.",
    "faq/common_questions.md": "# FAQ\n\n**Q: How do I change my role?**\nA: You can switch from Student to Alumni in your profile settings upon graduation.\n\n**Q: Are mentorship sessions free?**\nA: Yes, alumni volunteer their time.\n\n**Q: How does the AI matching work?**\nA: It uses embedding models to align your career goals with alumni experience.",
    "api/backend_endpoints.md": "# Backend Endpoints\n\nKey API routes in the FastAPI application:\n\n- `POST /api/auth/login` - Authenticate user.\n- `GET /api/users/me` - Get current user profile.\n- `GET /api/jobs` - Retrieve personalized job feed.\n- `POST /api/mentors/request` - Request a mentoring session.\n- `GET /api/events` - List upcoming events.",
    "policies/privacy.md": "# Privacy Policy\n\nWe value your privacy. Your data is used exclusively for matching you with mentors and job opportunities. We do not sell your data to third parties. All sensitive data is encrypted at rest.",
    "policies/terms.md": "# Terms of Service\n\nBy using this platform, you agree to maintain professional conduct. Harassment or spamming will result in immediate account termination.",
    "release_notes/latest_release.md": "# Release Notes\n\n## v1.0.0\n- Initial launch of the Student-Alumni Platform.\n- Features include: AI mentor matching, Job Feed, and Event Aggregation."
}

for rel_path, content in docs.items():
    full_path = os.path.join(base_path, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Documentation generated successfully.")
