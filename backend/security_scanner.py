"""
ClamAV virus scanner for file uploads.

Speaks the ClamAV INSTREAM protocol over a raw TCP socket so it works with a
shared ClamAV container (typically exposed on port 3310) without adding a
Python dependency.

Configuration (environment variables):
  CLAMAV_HOST     ClamAV daemon host. Empty string disables scanning. Default: ""
  CLAMAV_PORT     ClamAV daemon port.                             Default: 3310
  CLAMAV_TIMEOUT  Socket connect/recv timeout in seconds.         Default: 10
"""
import asyncio
import os
import socket
import struct

from fastapi import HTTPException

CLAMAV_HOST = (os.environ.get("CLAMAV_HOST") or "").strip()
CLAMAV_PORT = int(os.environ.get("CLAMAV_PORT", "3310"))
CLAMAV_TIMEOUT = float(os.environ.get("CLAMAV_TIMEOUT", "10"))


def scan_file_for_viruses(file_bytes: bytes) -> bool:
    """Scan raw file bytes via the ClamAV INSTREAM protocol.

    Returns True when the file is clean (or scanning is disabled because
    CLAMAV_HOST is empty).

    Raises:
        HTTPException 400  — malware signature FOUND
        HTTPException 500  — scanner unreachable or protocol failure (fail-closed)
    """
    if not file_bytes:
        return True
    if not CLAMAV_HOST:
        # Scanning deliberately disabled in environments without a ClamAV daemon.
        return True

    sock = None
    try:
        sock = socket.create_connection((CLAMAV_HOST, CLAMAV_PORT), timeout=CLAMAV_TIMEOUT)
        sock.sendall(b"zINSTREAM\0")
        chunk_size = 2048
        for i in range(0, len(file_bytes), chunk_size):
            chunk = file_bytes[i:i + chunk_size]
            sock.sendall(struct.pack("!I", len(chunk)))
            sock.sendall(chunk)
        sock.sendall(struct.pack("!I", 0))
        sock.shutdown(socket.SHUT_WR)

        response = b""
        while True:
            part = sock.recv(4096)
            if not part:
                break
            response += part
        text = response.decode("utf-8", errors="ignore").strip()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Security scanner is currently offline: {e}")
    finally:
        if sock is not None:
            try:
                sock.close()
            except Exception:
                pass

    if "OK" in text:
        return True
    if "FOUND" in text:
        parts = text.split()
        virus_name = parts[1] if len(parts) > 1 else "Unknown"
        raise HTTPException(400, f"Security Error: Malicious file detected ({virus_name}).")
    raise HTTPException(500, "Security scanner failed.")


async def scan_file_for_viruses_async(file_bytes: bytes) -> bool:
    """Async wrapper that runs the blocking socket scan off the event loop."""
    return await asyncio.to_thread(scan_file_for_viruses, file_bytes)