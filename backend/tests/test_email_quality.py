from core.email_quality import reject_reason, _extract_bounce_email, _junk_local, _domain_blocked, _FALLBACK


def test_blocks_disposable_and_test_gmail():
    assert reject_reason("test@gmail.com")
    assert reject_reason("testing123@yahoo.com")
    assert reject_reason("asdf@outlook.com")
    assert reject_reason("me@mailinator.com")
    assert reject_reason("x@yopmail.com")
    assert reject_reason("a@guerrillamail.com")


def test_allows_normal_inboxes():
    assert reject_reason("priya.sharma@gmail.com") is None
    assert reject_reason("rahul@vnrvjiet.in") is None
    assert reject_reason("user@test.com") is None  # used by our pytest fixtures


def test_junk_local_plus_alias():
    assert _junk_local("test+news")
    assert not _junk_local("priya")


def test_parent_domain_match():
    _FALLBACK.add("tempmail.com")
    assert _domain_blocked("mailinator.com")


def test_postal_payload_extract():
    email, status = _extract_bounce_email({
        "event": "MessageBounced",
        "payload": {
            "bounce": {"bounce_type": "hard", "email": "dead@example.com"},
            "message": {"to": ["dead@example.com"]},
        },
    })
    assert email == "dead@example.com"
    assert "hard" in status
