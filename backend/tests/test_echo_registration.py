import pytest
from datetime import date, timedelta
from echo_showcase import RegisterSchema, PaymentOrderSchema, VerifyPaymentSchema

# ── Existing tests (unchanged) ────────────────────────────────────────────────

def test_register_schema_valid():
    data = {
        "full_name": "Test Student",
        "email": "student@snist.edu.in",
        "phone": "+919876543210",
        "date_of_birth": "2004-08-15",
        "branch": "Computer Science and Engineering",
        "year": "3rd Year",
        "college": "SNIST",
        "terms_accepted": True,
    }
    reg = RegisterSchema(**data)
    assert reg.date_of_birth == "2004-08-15"
    assert reg.branch == "CSE"
    assert reg.year == "3"
    assert reg.terms_accepted is True

def test_register_schema_future_dob():
    future_date = (date.today() + timedelta(days=10)).isoformat()
    data = {
        "full_name": "Future Student",
        "email": "future@snist.edu.in",
        "phone": "+919876543210",
        "date_of_birth": future_date,
        "branch": "CSE",
        "year": "2",
        "terms_accepted": True,
    }
    with pytest.raises(ValueError, match="Date of birth cannot be in the future"):
        RegisterSchema(**data)

def test_register_schema_invalid_branch():
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "phone": "+919876543210",
        "branch": "Fake Engineering Branch",
        "year": "1",
        "terms_accepted": True,
    }
    with pytest.raises(ValueError, match="Invalid B.Tech branch"):
        RegisterSchema(**data)

def test_register_schema_invalid_year():
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "phone": "+919876543210",
        "branch": "CSE",
        "year": "10",
        "terms_accepted": True,
    }
    with pytest.raises(ValueError, match="Academic year must be 1, 2, 3, or 4"):
        RegisterSchema(**data)


# ── Phone number validation tests ─────────────────────────────────────────────

def test_register_schema_phone_required_empty():
    """Empty phone must raise a validation error."""
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "phone": "",
        "branch": "CSE",
        "year": "1",
        "terms_accepted": True,
    }
    with pytest.raises(ValueError, match="Phone number is required"):
        RegisterSchema(**data)

def test_register_schema_phone_required_none():
    """None/missing phone must raise a validation error."""
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "phone": None,
        "branch": "CSE",
        "year": "1",
        "terms_accepted": True,
    }
    with pytest.raises(ValueError, match="Phone number is required"):
        RegisterSchema(**data)

def test_register_schema_phone_too_short():
    """Phone with fewer than 7 digits must be rejected."""
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "phone": "123",
        "branch": "CSE",
        "year": "1",
        "terms_accepted": True,
    }
    with pytest.raises(ValueError, match="valid phone number"):
        RegisterSchema(**data)

def test_register_schema_phone_valid_indian():
    """Standard Indian mobile number must be accepted."""
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "phone": "+919876543210",
        "branch": "CSE",
        "year": "1",
        "terms_accepted": True,
    }
    reg = RegisterSchema(**data)
    assert reg.phone == "+919876543210"

def test_register_schema_phone_valid_local():
    """10-digit local number without country code must be accepted."""
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "phone": "9876543210",
        "branch": "CSE",
        "year": "1",
        "terms_accepted": True,
    }
    reg = RegisterSchema(**data)
    assert reg.phone == "9876543210"

def test_payment_order_schema_phone_required():
    """PaymentOrderSchema must also require phone."""
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "phone": "",
        "terms_accepted": True,
    }
    with pytest.raises(ValueError, match="Phone number is required"):
        PaymentOrderSchema(**data)

def test_payment_order_schema_phone_valid():
    """PaymentOrderSchema accepts a valid phone."""
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "phone": "+919876543210",
        "terms_accepted": True,
    }
    schema = PaymentOrderSchema(**data)
    assert schema.phone == "+919876543210"


# ── Terms & Conditions validation tests ───────────────────────────────────────

def test_register_schema_terms_default_false():
    """terms_accepted defaults to False when not provided."""
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "phone": "+919876543210",
        "branch": "CSE",
        "year": "1",
    }
    # Schema itself should not raise — endpoint enforces this at runtime
    reg = RegisterSchema(**data)
    assert reg.terms_accepted is False

def test_register_schema_terms_accepted_true():
    """terms_accepted is correctly stored as True."""
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "phone": "+919876543210",
        "branch": "CSE",
        "year": "1",
        "terms_accepted": True,
    }
    reg = RegisterSchema(**data)
    assert reg.terms_accepted is True

def test_payment_order_schema_terms_accepted():
    """PaymentOrderSchema stores terms_accepted correctly."""
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "phone": "+919876543210",
        "terms_accepted": True,
    }
    schema = PaymentOrderSchema(**data)
    assert schema.terms_accepted is True

def test_payment_order_schema_terms_default_false():
    """PaymentOrderSchema defaults terms_accepted to False."""
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "phone": "+919876543210",
    }
    schema = PaymentOrderSchema(**data)
    assert schema.terms_accepted is False
