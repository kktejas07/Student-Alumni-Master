"""
backend/tests/test_rate_limiter.py

Unit test suite for SlidingWindowRateLimiter.
Verifies rate limiting thresholds, IP tracking, and window reset handling.
"""

import sys
import unittest
import time
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from core.rate_limiter import SlidingWindowRateLimiter


class TestRateLimiter(unittest.TestCase):
    """Test suite for SlidingWindowRateLimiter."""

    def test_rate_limiter_within_bounds(self):
        limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=60)
        ip = "192.168.1.1"

        for i in range(5):
            is_limited, count = limiter.is_rate_limited(ip)
            self.assertFalse(is_limited)

    def test_rate_limiter_exceeds_limit(self):
        limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=60)
        ip = "10.0.0.5"

        limiter.is_rate_limited(ip)
        limiter.is_rate_limited(ip)
        limiter.is_rate_limited(ip)

        is_limited, count = limiter.is_rate_limited(ip)
        self.assertTrue(is_limited)
        self.assertEqual(count, 3)

    def test_rate_limiter_window_expiry(self):
        limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=1)
        ip = "127.0.0.1"

        limiter.is_rate_limited(ip)
        limiter.is_rate_limited(ip)

        # Wait for window to expire
        time.sleep(1.1)

        is_limited, count = limiter.is_rate_limited(ip)
        self.assertFalse(is_limited)


if __name__ == "__main__":
    unittest.main()
