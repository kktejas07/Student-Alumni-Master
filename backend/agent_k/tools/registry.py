from typing import Any, Dict

from agent_k.tools.read_tools import (
    search_jobs,
    get_wallet_balance,
    search_mentors,
    search_courses,
    get_profile,
    search_events,
    search_scholarships,
)
from agent_k.tools.write_tools import (
    draft_application,
    tailor_cv_for_job,
    draft_sop,
    draft_message,
)

TOOL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "search_jobs": {
        "module": "jobs",
        "side_effect": "read",
        "requires_approval": False,
        "enabled": True,
        "description": "Search for internships/jobs matching criteria. "
                       "Returns top matches with role, company, location, match%.",
        "parameters": {
            "type": "object",
            "properties": {
                "role":     {"type": "string", "description": "e.g. 'SWE intern'"},
                "location": {"type": "string", "description": "e.g. 'India'"},
                "limit":    {"type": "integer", "default": 5, "maximum": 20},
            },
        },
    },
    "get_wallet_balance": {
        "module": "wallet",
        "side_effect": "read",
        "requires_approval": False,
        "enabled": True,
        "description": "Get current SA wallet balance + lifetime earnings + tier.",
        "parameters": {"type": "object", "properties": {}},
    },
    "search_mentors": {
        "module": "mentors",
        "side_effect": "read",
        "requires_approval": False,
        "enabled": True,
        "description": "Find mentors by skill/role. Returns top matches with rating, sessions, price.",
        "parameters": {
            "type": "object",
            "properties": {
                "expertise": {"type": "string"},
                "limit":     {"type": "integer", "default": 5, "maximum": 10},
            },
        },
    },
    "search_courses": {
        "module": "courses",
        "side_effect": "read",
        "requires_approval": False,
        "enabled": True,
        "description": "Search SA marketplace + free MOOCs by skill/topic.",
        "parameters": {
            "type": "object",
            "properties": {
                "topic":     {"type": "string"},
                "free_only": {"type": "boolean", "default": False},
                "limit":     {"type": "integer", "default": 5, "maximum": 10},
            },
        },
    },
    "get_profile": {
        "module": "profile",
        "side_effect": "read",
        "requires_approval": False,
        "enabled": True,
        "description": "Get the user's own profile (skills, tier, career goal, year).",
        "parameters": {"type": "object", "properties": {}},
    },
    "search_events": {
        "module": "events",
        "side_effect": "read",
        "requires_approval": False,
        "enabled": True,
        "description": "Search SA events and external hackathons.",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {"type": "string"},
                "limit":    {"type": "integer", "default": 5, "maximum": 10},
            },
        },
    },
    "search_scholarships": {
        "module": "financial",
        "side_effect": "read",
        "requires_approval": False,
        "enabled": True,
        "description": "Search available scholarships and financial aid.",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 5, "maximum": 10},
            },
        },
    },
    # ── Write tools (Chunk 2: ENABLED — generate drafts only, no submission) ──
    "draft_application": {
        "module": "jobs", "side_effect": "write", "requires_approval": False, "enabled": True,
        "description": "Draft a job application cover letter for a specific role. Stores draft, does NOT submit.",
        "parameters": {"type": "object", "properties": {
            "role":    {"type": "string", "description": "Job title"},
            "company": {"type": "string", "description": "Company name"},
        }},
    },
    "tailor_cv_for_job": {
        "module": "jobs", "side_effect": "write", "requires_approval": False, "enabled": True,
        "description": "Tailor a short CV summary for a specific role.",
        "parameters": {"type": "object", "properties": {
            "role":    {"type": "string"},
            "company": {"type": "string"},
        }},
    },
    "draft_sop": {
        "module": "higher-ed", "side_effect": "write", "requires_approval": False, "enabled": True,
        "description": "Draft a Statement of Purpose for a programme.",
        "parameters": {"type": "object", "properties": {
            "programme":  {"type": "string"},
            "university": {"type": "string"},
        }},
    },
    "draft_message": {
        "module": "network", "side_effect": "write", "requires_approval": False, "enabled": True,
        "description": "Draft a connection / introduction message.",
        "parameters": {"type": "object", "properties": {
            "recipient_name": {"type": "string"},
            "purpose":        {"type": "string"},
        }},
    },
    "add_money_to_wallet":    {"module": "wallet",     "side_effect": "spend",       "requires_approval": True,  "enabled": True,  "description": "Top up the SA wallet via UPI. Requires approval. (MOCKED in this build — no real payment.)", "parameters": {"type": "object", "properties": {"amount_inr": {"type": "integer"}}}},
    "withdraw_to_upi":        {"module": "wallet",     "side_effect": "spend",       "requires_approval": True,  "enabled": False, "description": "Withdraw earned credits.",                       "parameters": {"type": "object"}},
    "book_mentor_session":    {"module": "mentors",    "side_effect": "spend",       "requires_approval": True,  "enabled": True,  "description": "Book a mentor session — requires approval. (MOCKED — creates a pending booking, no payment.)", "parameters": {"type": "object", "properties": {"mentor_id": {"type": "string"}, "topic": {"type": "string"}}}},
    "submit_application":     {"module": "jobs",       "side_effect": "submit",      "requires_approval": True,  "enabled": True,  "description": "Submit a previously-drafted application — requires approval. (MOCKED — records intent, does not contact partner ATS.)", "parameters": {"type": "object", "properties": {"draft_id": {"type": "string"}, "role": {"type": "string"}, "company": {"type": "string"}}}},
    "send_message":           {"module": "network",    "side_effect": "communicate", "requires_approval": True,  "enabled": True,  "description": "Send a drafted message to a connection — requires approval. (MOCKED — records intent, does not actually send.)", "parameters": {"type": "object", "properties": {"recipient_name": {"type": "string"}, "message": {"type": "string"}}}},
}

TOOL_DISPATCH = {
    "search_jobs":         search_jobs,
    "get_wallet_balance":  get_wallet_balance,
    "search_mentors":      search_mentors,
    "search_courses":      search_courses,
    "get_profile":         get_profile,
    "search_events":       search_events,
    "search_scholarships": search_scholarships,
    "draft_application":   draft_application,
    "tailor_cv_for_job":   tailor_cv_for_job,
    "draft_sop":           draft_sop,
    "draft_message":       draft_message,
}
