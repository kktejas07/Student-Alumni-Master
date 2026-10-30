# Development Standards & AI Agent Architecture

This document specifies the mandatory development rules for developers and AI coding assistants contributing to the Student Alumni platform, as well as an overview of Agentic AI paradigms and Multi-Agent Orchestration.

---

## Part 1: Mandatory Implementation Rules

### 1. Unit Test Automation
- **Backend (Python)**: All new modules, scrapers, services, and endpoints MUST be accompanied by unit test files inside `backend/tests/` (e.g. `test_event_agent_pipeline.py`).
  - Unit tests must cover: payload transformations, date parsing, edge cases, fallback structures, and database idempotency.
- **Frontend (TypeScript)**: All view components and analytics handlers must pass TypeScript compilation (`npx tsc --noEmit`) and component tests.

### 2. Structured Debug Logging
- **Backend**: Use `logger.debug(...)` for HTTP request URLs, payload byte sizes, execution timings (`ms`), and transformation mapping events.
- **Frontend**: Use `analyticsLogger.debug(...)` from `@/src/analytics` to log component mount states, filter updates, modal triggers, and API responses.

### 3. Unified Analytics
- All user-facing views must implement the standard analytics contract:
  - `trackScreen(...)` on view mount.
  - `trackClick(...)` on primary buttons, card presses, and links.
  - `track(...)` on critical business actions (e.g. `myevent_registered`, `booking_created`).

### 4. AI Agent Availability Check & Fallbacks
- AI agent pipelines (e.g. `GlobalEventAgent`, `Agent K`) must check API key/service availability before execution.
- In case of network offline state or rate limits, services must log a warning and serve cached data from MongoDB (`echo_showcases` / `events_v2`) without crashing the frontend.

---

## Part 2: Overview of Agentic AI & Meta-Agents (APC)

### What is Agentic AI?
Unlike traditional non-agentic LLM completions (which simply generate text in response to a prompt), **Agentic AI** systems possess:
1. **Autonomy**: Ability to decide execution steps independently.
2. **Tool Use**: Ability to interact with external APIs, databases, web scrapers, sandboxes, and shells.
3. **Memory**: Short-term context memory + long-term database storage.
4. **Planning & Reflection**: Ability to evaluate output quality, reflect on errors, and retry alternative strategies until a goal is met.

---

### Taxonomy of AI Agent Types

| Agent Type | Description & Capabilities | Example in Platform |
| :--- | :--- | :--- |
| **Reactive / Rule Agents** | Event-driven agents that trigger specific workflows based on incoming webhooks or DB updates. | Background sync cron tasks |
| **Tool-Using Scraper Agents** | Agents that inspect, crawl, parse, and clean unstructured web data into structured JSON. | `GlobalEventAgent` (`event_agent.py`) |
| **Planning & ReAct Agents** | Reasoning agents that break complex goals into sub-tasks (Thought $\rightarrow$ Action $\rightarrow$ Observation). | Agent K Career Assistant |
| **Multi-Agent Hierarchies** | Orchestrator manager agent delegating sub-tasks to specialized sub-agents (e.g., Code Agent, Research Agent, QA Agent). | Antigravity Pair-Programmer |
| **Meta-Agents / APC (Agents Building Agents)** | Self-orchestrating agents that dynamically generate code, schemas, and spawn sub-agents to solve complex tasks. | **Agentic Programmatic Creation (APC)** |

---

### What is APC (Agents Building Agents)?

**Agentic Programmatic Creation (APC)** is an advanced pattern where a primary meta-agent:
1. **Analyzes a Task**: Evaluates a high-level goal (e.g., "Build a global event aggregator").
2. **Generates Sub-Agents**: Dynamically writes specialized agent code (e.g. `GlobalEventAgent`), database models, and cron schedulers.
3. **Executes & Inspects**: Spawns sub-agents as independent background tasks, monitors execution, reads logs, and performs automated self-repair.
4. **Verifies Result**: Runs unit tests and validates end-to-end functionality before completing the task.
