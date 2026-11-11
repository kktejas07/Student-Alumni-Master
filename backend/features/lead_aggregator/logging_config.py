"""Lead Aggregator Structured Logging — JSON logging, request middleware, and performance tracking."""
from __future__ import annotations

import json
import logging
import time
import traceback
import uuid
from datetime import datetime, timezone
from functools import wraps

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "module": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "extra_fields"):
            log_entry.update(record.extra_fields)
        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = "".join(traceback.format_exception(*record.exc_info))
        return json.dumps(log_entry, default=str)


def setup_la_logging(level: str = "INFO") -> None:
    la_logger = logging.getLogger("features.lead_aggregator")
    la_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    if not any(isinstance(h, logging.StreamHandler) and isinstance(h.formatter, JSONFormatter)
               for h in la_logger.handlers):
        handler = logging.StreamHandler()
        handler.setFormatter(JSONFormatter())
        la_logger.addHandler(handler)
        la_logger.propagate = False


class LALogger:
    def __init__(self, name: str):
        self._logger = logging.getLogger(f"features.lead_aggregator.{name}")

    def _log(self, level: int, msg: str, **kwargs):
        record = self._logger.makeRecord(
            self._logger.name, level, "(la)", 0, msg, (), None,
        )
        record.extra_fields = kwargs
        self._logger.handle(record)

    def event(self, event_name: str, **kwargs):
        self._log(logging.INFO, event_name, event=event_name, **kwargs)

    def api_call(self, method: str, path: str, status: int, duration_ms: float, **kwargs):
        self._log(
            logging.INFO,
            f"{method} {path} {status}",
            method=method, path=path, status=status, duration_ms=round(duration_ms, 2),
            **kwargs,
        )

    def error(self, msg: str, exc: Exception | None = None, **kwargs):
        extra = kwargs
        if exc:
            extra["exception_type"] = type(exc).__name__
            extra["exception_msg"] = str(exc)
            extra["traceback"] = traceback.format_exc()
        record = self._logger.makeRecord(
            self._logger.name, logging.ERROR, "(la)", 0, msg, (), None,
        )
        record.extra_fields = extra
        self._logger.handle(record)

    def metric(self, name: str, value: float, unit: str = "count", **kwargs):
        self._log(logging.INFO, f"metric:{name}", metric_name=name, metric_value=value, unit=unit, **kwargs)

    def info(self, msg: str, **kwargs):
        self._log(logging.INFO, msg, **kwargs)

    def warning(self, msg: str, **kwargs):
        self._log(logging.WARNING, msg, **kwargs)


SKIP_LOG_PATHS = {"/health", "/healthz", "/ready", "/metrics"}


class RequestLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in SKIP_LOG_PATHS:
            return await call_next(request)

        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start = time.perf_counter()

        response: Response = await call_next(request)

        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-Id"] = request_id

        la_log = LALogger("middleware")
        la_log.api_call(
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=duration_ms,
            request_id=request_id,
            client_ip=request.client.host if request.client else "unknown",
        )
        return response


def log_api_call(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        la_log = LALogger(func.__module__ or "api")
        start = time.perf_counter()
        try:
            result = await func(*args, **kwargs)
            duration_ms = (time.perf_counter() - start) * 1000
            la_log.event(
                f"endpoint:{func.__name__}",
                duration_ms=round(duration_ms, 2),
                status="ok",
            )
            return result
        except Exception as e:
            duration_ms = (time.perf_counter() - start) * 1000
            la_log.error(
                f"endpoint:{func.__name__} failed",
                exc=e,
                duration_ms=round(duration_ms, 2),
            )
            raise
    return wrapper


def start_timer() -> float:
    return time.perf_counter()


def elapsed_ms(start: float) -> float:
    return round((time.perf_counter() - start) * 1000, 2)
