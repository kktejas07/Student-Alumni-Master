import pytest
from datetime import date, timedelta
from echo_showcase import RegisterSchema, PaymentOrderSchema, VerifyPaymentSchema

def test_register_schema_valid():
    data = {
        "full_name": "Test Student",
        "email": "student@snist.edu.in",
        "phone": "+919876543210",
        "date_of_birth": "2004-08-15",
        "branch": "Computer Science and Engineering",
        "year": "3rd Year",
        "college": "SNIST"
    }
    reg = RegisterSchema(**data)
    assert reg.date_of_birth == "2004-08-15"
    assert reg.branch == "CSE"
    assert reg.year == "3"

def test_register_schema_future_dob():
    future_date = (date.today() + timedelta(days=10)).isoformat()
    data = {
        "full_name": "Future Student",
        "email": "future@snist.edu.in",
        "date_of_birth": future_date,
        "branch": "CSE",
        "year": "2"
    }
    with pytest.raises(ValueError, match="Date of birth cannot be in the future"):
        RegisterSchema(**data)

def test_register_schema_invalid_branch():
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "branch": "Fake Engineering Branch",
        "year": "1"
    }
    with pytest.raises(ValueError, match="Invalid B.Tech branch"):
        RegisterSchema(**data)

def test_register_schema_invalid_year():
    data = {
        "full_name": "Student",
        "email": "test@snist.edu.in",
        "branch": "CSE",
        "year": "10"
    }
    with pytest.raises(ValueError, match="Academic year must be 1, 2, 3, or 4"):
        RegisterSchema(**data)
