from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class RunRequest(BaseModel):
    prompt: str
    auto_execute: Optional[bool] = False

class StepApproveBody(BaseModel):
    step_index: int
    decision: str  # 'approved' | 'rejected'
    reason: Optional[str] = None

class AgentKPrefs(BaseModel):
    auto_approve_read: bool = True
    auto_approve_write: bool = False
    auto_approve_spend_inr_limit: int = 0
    auto_approve_communicate: bool = False
    auto_approve_submit: bool = False
    preferred_tone: str = "concise"
    daily_run_limit: int = 20

class AgentRun(BaseModel):
    user_id: str
    user_email: Optional[str] = None
    prompt: str
    status: str
    plan: dict
    steps: list = []
    audit_log: list = []
    step_approvals: dict = {}
    pending_step_index: Optional[int] = None
    result_summary: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

class PrescriptionCard(BaseModel):
    id: str                       # stable hash so UI can dedupe
    icon: str                     # lucide name
    tint: str                     # hex used for the tinted icon box
    kicker: str                   # e.g. "TOP MATCH" / "SKILL GAP"
    title: str                    # one-line headline
    subtitle: Optional[str] = None
    cta: str                      # button label ("Draft my application")
    prompt: str                   # the prompt that gets sent to Agent K
    tools: List[str] = []         # which Agent K tools this run is expected to use
