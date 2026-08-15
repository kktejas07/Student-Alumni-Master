# Workspace Development Rules & AI Agent Guidelines

Every developer or AI agent building features or modifying code in this codebase MUST follow these mandatory implementation standards:

---

## 1. Unit Test Requirement (Mandatory)
- **Backend (Python)**: Every new endpoint, service, or data transformation MUST include corresponding unit tests in `backend/tests/test_<feature>.py`.
  - Use `unittest` or `pytest`.
  - Verify success paths, error/fallback paths, payload transformations, and database idempotency.
- **Frontend (TypeScript/React Native)**: Every new view or complex component MUST include tests or type verification in `frontend/__tests__/`.

---

## 2. Structured Debug Logging (Mandatory)
- **Backend Logging**: Every service, background agent, or router MUST instantiate a named logger (`logger = logging.getLogger(__name__)`).
  - Log API entry/exit points, external HTTP requests, payload sizes, performance timing (`elapsed_ms`), and database query results using `logger.debug(...)`.
  - Log errors with full traceback using `logger.error(..., exc_info=True)`.
- **Frontend Logging**: Every screen or major view MUST use `analyticsLogger.debug(...)` from `@/src/analytics` to record mount states, filter selections, user interactions, and API response states.

---

## 3. Mandatory Unified Analytics
- **Screen View Tracking**: Call `trackScreen('screen_name', { path: '/url-path' })` on component mount for every new page or portal view.
- **Click Tracking**: Wrap or instrument key user actions with `trackClick('element_id', { ...props })`.
- **Event Tracking**: Call `track('event_name', { ...payload })` for critical mutations (e.g. registration, booking, apply, payment).

---

## 4. AI Agent Availability & Graceful Fallbacks
- **Availability Check**: Before executing any AI agent or LLM service call (e.g., Agent K, Claude, or external scrapers), verify model/API credential availability.
- **Graceful Fallbacks**: If external AI models or API scrapers are unreachable or rate-limited:
  - Do NOT throw unhandled exceptions or crash the user interface.
  - Fall back gracefully to cached database records or fallback mock datasets while logging a high-priority warning.
