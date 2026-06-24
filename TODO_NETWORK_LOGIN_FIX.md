# Network error on login — fix checklist

## Goal
Resolve “Network error — try again” when logging in.

## Root cause to target
Frontend is likely calling the wrong backend URL due to `getBaseUrl()` returning `''` on web.

## Steps
1. Set environment variable `EXPO_PUBLIC_BACKEND_URL` to the real backend origin (must include protocol and port), e.g. `http://localhost:8002`.
2. Restart frontend dev server.
3. Confirm login request URL in browser DevTools Network tab is exactly:
   - `POST http://<backend-host>:8002/api/auth/login`
4. If still failing, verify backend server is listening on port 8002.
5. If backend is up but requests still fail, check browser console for CORS/network errors.

