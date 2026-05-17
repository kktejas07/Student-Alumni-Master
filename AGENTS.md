# Repository Guidelines

## Project Structure & Module Organization

This is a full-stack Student Alumni platform. Backend code lives in `backend/`, with the FastAPI entry point at `backend/server.py`, shared helpers in `backend/core/`, and feature modules such as `jobs_feed.py`, `portals.py`, and `analytics.py`. Backend tests are in `backend/tests/`; legacy regression scripts use top-level `backend_test*.py` names.

Frontend code lives in `frontend/`. Expo Router pages are in `frontend/app/`, reusable UI in `frontend/src/views/`, API helpers in `frontend/src/lib/` and `frontend/src/models/services/`, and tests beside modules in `__tests__/`. Static portal files are in `frontend/public/`; bundled assets are in `frontend/assets/`.

## Build, Test, and Development Commands

From `Student-Alumni-Master/`:

- `./run.sh` starts backend on `:8000` and Expo web on `:8081`.
- `./run.sh backend` or `./run.sh frontend` starts one service.
- `./run.sh docker` runs the compose stack using `docker-compose.yml`.
- `cd frontend && npm run web` starts Expo web.
- `cd frontend && npm run lint` runs Expo ESLint.
- `cd frontend && npm test` runs Jest tests.
- `cd backend && python -m venv venv && venv/bin/pip install -r requirements.txt` prepares the backend environment.
- `cd backend && venv/bin/pytest tests` runs backend tests.

## Coding Style & Naming Conventions

Use TypeScript for frontend changes. Name components in PascalCase, hooks as `useThing`, and route files according to Expo Router conventions. Prefer tokens from `frontend/src/theme/` and portal-specific token files before adding styles.

Python modules use snake_case file and function names. Keep FastAPI route logic close to its feature module, and reserve `backend/core/` for shared database, dependency, or security helpers. Backend tooling includes `black`, `flake8`, and `isort`.

## Testing Guidelines

Add focused tests near the changed surface. Frontend tests use Jest with `*.test.ts` or `*.test.tsx` under `__tests__/`. Backend tests use pytest and are generally named `test_*.py` or `backend_test_*.py`. Run both frontend and backend suites for cross-cutting API changes.

## Commit & Pull Request Guidelines

Git history is not available in this checkout, so use imperative commit subjects such as `Add mentor onboarding validation`. Keep commits scoped to one logical change.

Pull requests should include a summary, test commands run, linked issue or ticket when available, and screenshots or recordings for UI changes. Call out new environment variables, migrations, seed-data changes, or deployment impacts.

## Security & Configuration Tips

Do not commit secrets. Backend configuration is loaded from `backend/.env` for local runs; deployment values are documented in `README.md` and `DOKPLOY.md`. Keep `JWT_SECRET`, `FERNET_KEY`, database URLs, OAuth credentials, and payment keys out of source control.
