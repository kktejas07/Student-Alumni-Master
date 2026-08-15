# PR Title: feat: AI Event Scraper, Platform RAG Engine, Composite Security Guardrails & Multi-Agent Orchestration

## 🚀 Executive Summary

This Pull Request delivers an enterprise-grade AI and security expansion for the Student Alumni Platform:

1. **AI Event Scraper Agent & Route Migration (`/student-portal/myevents`)**
   - Built `GlobalEventAgent` (`backend/services/event_agent.py`) scraping global events, hackathons, workshops, and quizzes.
   - Integrated a 30-minute interval scheduler in `backend/background_sync.py` (synced 60 live open events).
   - Migrated portal route from `/student-portal/events` to `/student-portal/myevents`.
   - Enhanced UI in `EventsView.tsx` with hero background image, category/type badges, interactive glass detail modal, analytics tracking, and direct in-portal registration (`POST /api/student/events/{id}/register`).

2. **Platform-Wide RAG Vector Search Engine (`backend/services/platform_rag.py`)**
   - Multi-entity vector indexing across **Jobs**, **Events**, **Courses**, **Mentors**, **Alumni**, **Deals**, and **Rentals** using Qdrant.
   - Enforces Role-Based Access Control (RBAC) filtering (`student`, `alumni`, `mentor`, `college`, `superadmin`).
   - Exposed unified semantic search endpoint `POST /api/ai/semantic-search`.

3. **Composite Cybersecurity & AI Guardrail Layer (`backend/core/ai_security_guardrails.py`)**
   - Combines **Guardrails AI** patterns, **Anthropic Defending-Code Harness** standards, **UK AISI Inspect** evals, and **Bandit** static analysis.
   - **Prompt Injection Defense**: Blocks prompt override attacks (e.g. `"ignore previous instructions"`, `"bypass safety filters"`).
   - **Data Loss Prevention (DLP)**: Redacts API keys (`sk-...`), JWTs, GitHub tokens, Slack keys, SSNs, and emails before LLM execution (`[REDACTED_API_KEY]`).
   - **Output XSS Protection**: Strips raw HTML script and iframe tags from AI outputs.

4. **Multi-Agent Meta-Orchestrator Network (`backend/services/meta_agent.py`)**
   - Implemented `MetaAgentOrchestrator` for AI availability health checks (`GET /api/ai/status`) and dynamic sub-agent dispatching (`POST /api/ai/agent-workflow`).
   - Spawns worker sub-agents on demand: **ATS Resume Agent**, **Alumni Outreach Agent**, **Mentor Syllabus Agent**, **Global Event Agent**, and **Platform RAG Engine**.

5. **Repository Process & Development Rules (`.agents/rules/development_standards.md`)**
   - Created mandatory rules requiring unit tests, explicit `logger.debug` metrics, analytics tracking (`trackScreen`, `trackClick`, `track`), and AI availability checks.

---

## 🛠️ Architecture & System Diagram

See complete architecture documentation in [`docs/ARCHITECTURE_AND_SECURITY.md`](file:///Users/avks/Desktop/Projects%20/Student%20Alumni/Student-Alumni-Master/docs/ARCHITECTURE_AND_SECURITY.md).

```
User Input ──► [AISecurityGuardrail] ──► [MetaAgentOrchestrator] ──► Sub-Agents ──► Qdrant / MongoDB
                 (Firewall & DLP)          (Dynamic Dispatcher)      (Scraper/RAG/ATS)
```

---

## 🧪 Automated Test Verification

**20 Total Unit Tests across 3 Test Suites — 100% PASSED (OK)**:

1. `backend/tests/test_cybersecurity_and_meta_agent.py` $\rightarrow$ **7/7 Passed**
2. `backend/tests/test_platform_rag_and_agents.py` $\rightarrow$ **7/7 Passed**
3. `backend/tests/test_event_agent_pipeline.py` $\rightarrow$ **6/6 Passed**

```bash
PYTHONPATH=backend backend/venv/bin/python backend/tests/test_cybersecurity_and_meta_agent.py
PYTHONPATH=backend backend/venv/bin/python backend/tests/test_platform_rag_and_agents.py
PYTHONPATH=backend backend/venv/bin/python backend/tests/test_event_agent_pipeline.py
```

---

## 📁 Key Files Added / Modified

- `backend/services/event_agent.py` — Global Event Scraper Agent
- `backend/services/platform_rag.py` — Platform-Wide RAG Vector Search Engine
- `backend/core/ai_security_guardrails.py` — Composite AI Security & Guardrail Layer
- `backend/services/meta_agent.py` — Multi-Agent Meta Orchestrator
- `backend/services/resume_agent.py` — ATS Resume Builder Agent
- `backend/services/outreach_agent.py` — Alumni Outreach Agent
- `backend/services/syllabus_agent.py` — Mentor Syllabus Generator Agent
- `backend/routers/ai_platform_services.py` — FastAPI Router for AI Services & Workflow Dispatch
- `frontend/src/views/web/portals/student/views/EventsView.tsx` — Updated MyEvents View UI
- `.agents/rules/development_standards.md` — Repository Process & Development Rules
- `docs/ARCHITECTURE_AND_SECURITY.md` — Architecture & Security Documentation
- `docs/PULL_REQUEST_DESCRIPTION.md` — Pull Request Description
