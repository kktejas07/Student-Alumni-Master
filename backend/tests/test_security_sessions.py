from routers.admin.settings import _is_public_ip, _client_ip, _parse_ua, _fmt_location, _strip_port


class _Req:
    def __init__(self, headers=None, host="172.18.0.4"):
        self.headers = headers or {}
        self.client = type("C", (), {"host": host})()


def test_public_ip_detection():
    assert _is_public_ip("8.8.8.8")
    assert _is_public_ip("49.205.12.10")
    assert not _is_public_ip("127.0.0.1")
    assert not _is_public_ip("10.0.0.5")
    assert not _is_public_ip("192.168.1.9")
    assert not _is_public_ip("172.16.0.2")
    assert not _is_public_ip("172.18.0.4")
    assert not _is_public_ip("::1")
    assert not _is_public_ip("not-an-ip")


def test_client_ip_prefers_cloudflare_then_xff_public():
    req = _Req(
        headers={
            "cf-connecting-ip": "49.205.1.20",
            "x-forwarded-for": "172.18.0.1, 10.0.0.2",
        },
        host="172.18.0.4",
    )
    assert _client_ip(req) == "49.205.1.20"

    req2 = _Req(headers={"x-forwarded-for": "10.0.0.2, 8.8.4.4"}, host="172.18.0.4")
    assert _client_ip(req2) == "8.8.4.4"

    req3 = _Req(headers={}, host="172.18.0.4")
    assert _client_ip(req3, "1.2.3.4") == "1.2.3.4"


def test_parse_ua_chrome_mac():
    ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    info = _parse_ua(ua)
    assert info["device"] == "Mac"
    assert info["browser"].startswith("Chrome")
    assert info["os"].startswith("macOS")


def test_parse_ua_edge_windows():
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
    info = _parse_ua(ua)
    assert info["device"] == "Windows PC"
    assert info["browser"].startswith("Edge")
    assert "Windows" in info["os"]


def test_fmt_location_skips_blanks():
    assert _fmt_location({"city": "Hyderabad", "regionName": "Telangana", "country": "India"}) == "Hyderabad, Telangana, India"
    assert _fmt_location({"city": "", "country": ""}) == "Location unavailable"


def test_strip_ipv4_port():
    assert _strip_port("8.8.8.8:443") == "8.8.8.8"
    assert _strip_port("  1.1.1.1 ") == "1.1.1.1"
