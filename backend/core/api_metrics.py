"""
core.api_metrics — in-memory request latency ring buffer (SA2 system health).

Feeds `GET /api/admin/system-health` (services/system_health.py): per-request
duration + status recorded by AppLoggingMiddleware, windowed to the last 24h.
Bounded (FIFO deque) so the dashboard endpoint never allocates per request.
Process-local by design — one metric per worker, which is the whole point of
an in-memory ring rather than a Mongo write on the hot path.
"""
from __future__ import annotations

import threading
import time
from collections import deque
from typing import Deque, Dict, Tuple

_WINDOW_SECONDS = 24 * 3600
_MAX_SAMPLES = 50_000  # ~worst case memory cap regardless of traffic

_lock = threading.Lock()
# (timestamp, duration_ms, status_code)
_samples: Deque[Tuple[float, float, int]] = deque(maxlen=_MAX_SAMPLES)


def record_request(duration_ms: float, status_code: int) -> None:
    """Record one completed request. Called from the logging middleware."""
    with _lock:
        _samples.append((time.time(), duration_ms, status_code))


def api_metrics(window_seconds: int = _WINDOW_SECONDS) -> Dict[str, int | float]:
    """p50/p95 latency + error rate + total requests over the trailing window."""
    now = time.time()
    with _lock:
        snapshot = list(_samples)
    while snapshot and (now - snapshot[0][0]) > window_seconds:
        snapshot.pop(0)
    if not snapshot:
        return {
            "avg_response_ms": 0,
            "p50_response_ms": 0,
            "p95_response_ms": 0,
            "error_rate_pct": 0.0,
            "requests_24h": 0,
        }
    durations = sorted(s[1] for s in snapshot)
    n = len(durations)
    errors = sum(1 for s in snapshot if s[2] >= 500)
    return {
        "avg_response_ms": round(sum(durations) / n, 1),
        "p50_response_ms": round(durations[n // 2], 1),
        "p95_response_ms": round(durations[min(n - 1, int(n * 0.95))], 1),
        "error_rate_pct": round(100.0 * errors / n, 2),
        "requests_24h": n,
    }
