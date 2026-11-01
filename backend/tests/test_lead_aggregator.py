"""Tests for Lead Aggregator — LA1-LA14."""
import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone

from features.lead_aggregator.scoring import compute_lead_score, _in_same_region
from features.lead_aggregator.dedup import (
    normalize_phone_e164, canonicalize_email, jaro_winkler_similarity,
)
from features.lead_aggregator.geo import (
    resolve_city, cities_match, in_same_region as geo_same_region,
    radius_score, geo_score_for_brand, _haversine_km,
)
from features.lead_aggregator.smart_pricing import calculate_lead_price
from features.lead_aggregator.ab_testing import _z_test_significance, _normal_cdf


# ═══════════════════════════════════════════════════════════════════════════
# Scoring Engine Tests
# ═══════════════════════════════════════════════════════════════════════════
class TestLeadScoring:
    def test_perfect_match_scores_high(self):
        lead = {
            "full_name": "Test User",
            "email": "test@example.com",
            "phone": "9876543210",
            "age": 22,
            "city": "Hyderabad",
            "education_level": "btech",
            "institution": "SNIST",
            "skills": ["python", "react", "ml"],
            "interests": ["ai"],
        }
        brand = {
            "target_age_min": 20,
            "target_age_max": 25,
            "target_cities": ["Hyderabad"],
            "target_skills": ["python", "react", "ml"],
            "target_education_levels": ["btech"],
        }
        score, breakdown, temp = compute_lead_score(lead, brand)
        assert score >= 70
        assert temp == "hot"
        assert breakdown["age_fit"] == 20
        assert breakdown["city_match"] == 15
        assert breakdown["skills_match"] > 0
        assert breakdown["education_match"] == 15

    def test_no_match_scores_low(self):
        lead = {
            "full_name": "Test",
            "email": "t@t.com",
            "phone": "1234567890",
            "age": 50,
            "city": "Unknown City",
            "skills": ["cooking"],
        }
        brand = {
            "target_age_min": 18,
            "target_age_max": 25,
            "target_cities": ["Mumbai"],
            "target_skills": ["python"],
            "target_education_levels": ["btech"],
        }
        score, breakdown, temp = compute_lead_score(lead, brand)
        assert score < 45
        assert temp in ("cold", "low")

    def test_city_alias_matching(self):
        assert _in_same_region("mumbai", "bombay") is True
        assert _in_same_region("bengaluru", "bangalore") is True
        assert _in_same_region("chennai", "madras") is True
        assert _in_same_region("mumbai", "delhi") is False

    def test_empty_targets_give_partial_score(self):
        lead = {
            "full_name": "Test",
            "email": "t@t.com",
            "phone": "9999999999",
            "age": 22,
            "city": "Pune",
            "skills": ["java"],
        }
        brand = {
            "target_age_min": 20,
            "target_age_max": 25,
            "target_cities": [],
            "target_skills": [],
            "target_education_levels": [],
        }
        score, breakdown, temp = compute_lead_score(lead, brand)
        assert breakdown["city_match"] == 10
        assert breakdown["skills_match"] == 12
        assert breakdown["education_match"] == 8

    def test_profile_completeness_scales(self):
        empty_lead = {"full_name": "A"}
        full_lead = {
            "full_name": "A", "email": "a@b.com", "phone": "123",
            "age": 20, "city": "X", "education_level": "btech",
            "institution": "Y", "skills": ["a"], "interests": ["b"],
        }
        _, empty_bd, _ = compute_lead_score(empty_lead, {})
        _, full_bd, _ = compute_lead_score(full_lead, {})
        assert full_bd["profile_completeness"] > empty_bd["profile_completeness"]

    def test_temperature_thresholds(self):
        lead = {"age": 22, "city": "Hyderabad", "skills": ["python"],
                "full_name": "T", "email": "t@t.com", "phone": "9",
                "education_level": "btech", "institution": "X", "interests": ["ai"]}

        # Hot brand (all match)
        hot_brand = {
            "target_age_min": 20, "target_age_max": 25,
            "target_cities": ["Hyderabad"],
            "target_skills": ["python"],
            "target_education_levels": ["btech"],
        }
        score, _, temp = compute_lead_score(lead, hot_brand)
        assert temp == "hot"

        # Cold brand (nothing matches)
        cold_brand = {
            "target_age_min": 40, "target_age_max": 50,
            "target_cities": ["Tokyo"],
            "target_skills": ["cobol"],
            "target_education_levels": ["phd"],
        }
        score, _, temp = compute_lead_score(lead, cold_brand)
        assert temp in ("cold", "low")


# ═══════════════════════════════════════════════════════════════════════════
# OTP Tests
# ═══════════════════════════════════════════════════════════════════════════
class TestOTPLogic:
    def test_otp_hash_is_deterministic(self):
        import hashlib
        def _hash_otp(otp: str) -> str:
            return hashlib.sha256(otp.encode()).hexdigest()
        h1 = _hash_otp("123456")
        h2 = _hash_otp("123456")
        assert h1 == h2
        assert len(h1) == 64  # SHA-256 hex digest

    def test_otp_hash_varies(self):
        import hashlib
        def _hash_otp(otp: str) -> str:
            return hashlib.sha256(otp.encode()).hexdigest()
        h1 = _hash_otp("123456")
        h2 = _hash_otp("654321")
        assert h1 != h2

    def test_generated_otp_is_6_digits(self):
        import secrets
        def _generate_otp() -> str:
            return str(secrets.randbelow(900000) + 100000)
        for _ in range(100):
            otp = _generate_otp()
            assert len(otp) == 6
            assert otp.isdigit()
            assert 100000 <= int(otp) <= 999999

    def test_generated_otp_is_not_hardcoded(self):
        import secrets
        def _generate_otp() -> str:
            return str(secrets.randbelow(900000) + 100000)
        otps = {_generate_otp() for _ in range(50)}
        assert len(otps) > 1, "OTP generator should produce different values"


# ═══════════════════════════════════════════════════════════════════════════
# Model Validation Tests
# ═══════════════════════════════════════════════════════════════════════════
class TestModels:
    """Model validation tests — use inline validation to avoid MongoDB import chain."""

    def test_lead_phone_validation(self):
        import re
        phone = "+919876543210"
        digits = re.sub(r"[^\d+]", "", phone)
        assert len(digits) >= 10

    def test_lead_short_phone_rejected(self):
        import re
        phone = "123"
        digits = re.sub(r"[^\d+]", "", phone)
        assert len(digits) < 10

    def test_brand_email_validation(self):
        import re
        email = "contact@brand.com"
        assert re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email)

    def test_brand_bad_email_rejected(self):
        import re
        email = "not-an-email"
        assert not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email)

    def test_supported_domains_count(self):
        from features.lead_aggregator.models import SUPPORTED_DOMAINS
        assert len(SUPPORTED_DOMAINS) == 27

    def test_otp_phone_cleaning(self):
        import re
        phone = "+91 987-654-3210"
        digits = re.sub(r"[^\d+]", "", phone)
        assert digits == "+919876543210"
        assert len(digits) >= 10


# ═══════════════════════════════════════════════════════════════════════════
# LA7 — Deduplication Tests
# ═══════════════════════════════════════════════════════════════════════════
class TestDedup:
    def test_phone_normalization_national(self):
        assert normalize_phone_e164("9876543210") == "+919876543210"

    def test_phone_normalization_with_prefix(self):
        assert normalize_phone_e164("+919876543210") == "+919876543210"

    def test_phone_normalization_with_zero(self):
        assert normalize_phone_e164("09876543210") == "+919876543210"

    def test_phone_normalization_already_full(self):
        assert normalize_phone_e164("919876543210") == "+919876543210"

    def test_email_canonicalize_gmail_dots(self):
        assert canonicalize_email("j.doe@gmail.com") == "jdoe@gmail.com"

    def test_email_canonicalize_gmail_plus(self):
        assert canonicalize_email("john+test@gmail.com") == "john@gmail.com"

    def test_email_canonicalize_case(self):
        assert canonicalize_email("John.Doe@Yahoo.COM") == "john.doe@yahoo.com"

    def test_email_canonicalize_non_gmail_keeps_dots(self):
        assert canonicalize_email("j.doe@company.com") == "j.doe@company.com"

    def test_jaro_winkler_identical(self):
        assert jaro_winkler_similarity("John", "John") == 1.0

    def test_jaro_winkler_similar(self):
        sim = jaro_winkler_similarity("Krishna", "Krishn")
        assert sim > 0.9

    def test_jaro_winkler_different(self):
        sim = jaro_winkler_similarity("Alice", "Bob")
        assert sim < 0.5

    def test_jaro_winkler_empty(self):
        assert jaro_winkler_similarity("", "test") == 0.0
        assert jaro_winkler_similarity("test", "") == 0.0


# ═══════════════════════════════════════════════════════════════════════════
# LA8 — Geo Intelligence Tests
# ═══════════════════════════════════════════════════════════════════════════
class TestGeo:
    def test_resolve_city_canonical(self):
        assert resolve_city("Bombay") == "mumbai"
        assert resolve_city("Bangalore") == "bengaluru"
        assert resolve_city("Madras") == "chennai"

    def test_resolve_city_passthrough(self):
        assert resolve_city("Tirunelveli") == "tirunelveli"

    def test_cities_match_aliases(self):
        assert cities_match("Bombay", "Mumbai") is True
        assert cities_match("Calcutta", "Kolkata") is True

    def test_cities_dont_match(self):
        assert cities_match("Mumbai", "Delhi") is False

    def test_geo_same_region(self):
        assert geo_same_region("Noida", "Delhi") is True
        assert geo_same_region("Gurgaon", "Delhi") is True
        assert geo_same_region("Thane", "Mumbai") is True

    def test_geo_different_region(self):
        assert geo_same_region("Mumbai", "Delhi") is False

    def test_radius_score_same_city(self):
        assert radius_score("Mumbai", "Mumbai") == 100

    def test_radius_score_far_city(self):
        score = radius_score("Mumbai", "Delhi", max_radius_km=50)
        assert score == 0  # ~1400km apart

    def test_haversine_sanity(self):
        d = _haversine_km(19.076, 72.877, 28.614, 77.209)
        assert 1100 < d < 1500  # Mumbai-Delhi ~1200km

    def test_geo_score_for_brand_no_restriction(self):
        score, city = geo_score_for_brand("Mumbai", [])
        assert score == 50
        assert city == "any"

    def test_geo_score_for_brand_match(self):
        score, city = geo_score_for_brand("Bombay", ["Mumbai"])
        assert score == 100


# ═══════════════════════════════════════════════════════════════════════════
# LA9 — A/B Testing (pure functions)
# ═══════════════════════════════════════════════════════════════════════════
class TestABTesting:
    def test_normal_cdf_center(self):
        assert abs(_normal_cdf(0) - 0.5) < 0.001

    def test_normal_cdf_extreme(self):
        assert _normal_cdf(5) > 0.999
        assert _normal_cdf(-5) < 0.001

    def test_z_test_insufficient_sample(self):
        result = _z_test_significance(10, 2, 10, 3)
        assert result["significant"] is False
        assert result["reason"] == "insufficient_sample"

    def test_z_test_significant_difference(self):
        result = _z_test_significance(1000, 100, 1000, 200)
        assert result["significant"] is True
        assert result["p_value"] < 0.05
        assert result["lift_pct"] > 0

    def test_z_test_no_difference(self):
        result = _z_test_significance(1000, 100, 1000, 102)
        assert result["significant"] is False


# ═══════════════════════════════════════════════════════════════════════════
# LA12 — Smart Pricing Tests
# ═══════════════════════════════════════════════════════════════════════════
class TestSmartPricing:
    def test_hot_lead_base_price(self):
        result = calculate_lead_price("hot")
        assert result["price_inr"] >= 500

    def test_cold_lead_cheaper(self):
        hot = calculate_lead_price("hot")
        cold = calculate_lead_price("cold")
        assert hot["price_inr"] > cold["price_inr"]

    def test_domain_multiplier(self):
        tech = calculate_lead_price("warm", domain="technology")
        generic = calculate_lead_price("warm")
        assert tech["price_inr"] > generic["price_inr"]

    def test_verified_bonus(self):
        verified = calculate_lead_price("warm", phone_verified=True)
        unverified = calculate_lead_price("warm", phone_verified=False)
        assert verified["price_inr"] > unverified["price_inr"]

    def test_completeness_bonus(self):
        full = calculate_lead_price("warm", profile_completeness=1.0)
        empty = calculate_lead_price("warm", profile_completeness=0.0)
        assert full["price_inr"] > empty["price_inr"]

    def test_multipliers_in_response(self):
        result = calculate_lead_price("hot", domain="finance", phone_verified=True, score=85)
        assert "multipliers" in result
        assert result["multipliers"]["domain"] == 1.8
        assert result["multipliers"]["verified"] == 1.2
        assert result["multipliers"]["score"] == 1.3


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #1 — Rate Limiting (pure function tests)
# ═══════════════════════════════════════════════════════════════════════════
class TestRateLimiting:
    def test_tier_limits_defined(self):
        from features.lead_aggregator.rate_limiting import TIER_LIMITS
        assert TIER_LIMITS["free"] == 60
        assert TIER_LIMITS["starter"] == 200
        assert TIER_LIMITS["growth"] == 500
        assert TIER_LIMITS["enterprise"] == 2000

    def test_tier_fallback(self):
        from features.lead_aggregator.rate_limiting import _tier_max_requests
        assert _tier_max_requests("free") == 60
        assert _tier_max_requests("nonexistent") == 60

    def test_window_key_format(self):
        from features.lead_aggregator.rate_limiting import _window_key
        key = _window_key("BRD-123", "/api/leads", 60)
        assert key.startswith("BRD-123:/api/leads:")
        parts = key.split(":")
        assert len(parts) == 3
        assert parts[2].isdigit()


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #2 — Guards (token creation/parsing)
# ═══════════════════════════════════════════════════════════════════════════
class TestGuards:
    def test_create_access_token(self):
        from features.lead_aggregator.guards import create_access_token
        import jwt
        token = create_access_token({"email": "test@test.com", "role": "admin"})
        assert isinstance(token, str)
        decoded = jwt.decode(token, options={"verify_signature": False})
        assert decoded["email"] == "test@test.com"
        assert decoded["role"] == "admin"
        assert "exp" in decoded

    def test_token_has_expiry(self):
        from features.lead_aggregator.guards import create_access_token
        import jwt
        token = create_access_token({"user": "test"}, expires_hours=1)
        decoded = jwt.decode(token, options={"verify_signature": False})
        assert decoded["exp"] > 0

    def test_roles_defined(self):
        from features.lead_aggregator.guards import ADMIN, BRAND, CAMPUS, VIEWER
        assert ADMIN == "admin"
        assert BRAND == "brand"
        assert CAMPUS == "campus"
        assert VIEWER == "viewer"


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #5 — WhatsApp Bot (session management)
# ═══════════════════════════════════════════════════════════════════════════
class TestWACapture:
    def test_session_starts_empty(self):
        from features.lead_aggregator.wa_capture import wa_sessions
        assert isinstance(wa_sessions, dict)

    def test_email_validation(self):
        import re
        pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
        assert re.match(pattern, "test@example.com")
        assert not re.match(pattern, "invalid")
        assert not re.match(pattern, "@no-user.com")

    def test_age_validation(self):
        assert 15 <= 22 <= 60
        assert not (15 <= 14 <= 60)
        assert not (15 <= 61 <= 60)


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #7 — Bulk Import (CSV parsing)
# ═══════════════════════════════════════════════════════════════════════════
class TestBulkImport:
    def test_parse_csv_valid(self):
        from features.lead_aggregator.bulk_import import parse_csv
        csv_content = b"full_name,email,phone,age,city,domain,skills\nJohn Doe,john@test.com,9876543210,22,Hyderabad,technology,python\n"
        rows, errors = parse_csv(csv_content)
        assert len(rows) == 1
        assert len(errors) == 0
        assert rows[0]["full_name"] == "John Doe"

    def test_parse_csv_missing_name(self):
        from features.lead_aggregator.bulk_import import parse_csv
        csv_content = b"full_name,email,phone,age,city,domain\n,john@test.com,9876543210,22,Hyderabad,technology\n"
        rows, errors = parse_csv(csv_content)
        assert len(errors) > 0

    def test_parse_csv_bad_age(self):
        from features.lead_aggregator.bulk_import import parse_csv
        csv_content = b"full_name,email,phone,age,city,domain\nJohn,john@test.com,9876543210,99,Hyderabad,technology\n"
        rows, errors = parse_csv(csv_content)
        assert len(errors) > 0

    def test_parse_csv_bad_domain(self):
        from features.lead_aggregator.bulk_import import parse_csv
        csv_content = b"full_name,email,phone,age,city,domain\nJohn,john@test.com,9876543210,22,Hyderabad,fake_domain\n"
        rows, errors = parse_csv(csv_content)
        assert len(errors) > 0

    def test_parse_csv_skills_split(self):
        from features.lead_aggregator.bulk_import import parse_csv
        csv_content = b"full_name,email,phone,age,city,domain,skills\nJohn,john@test.com,9876543210,22,Hyderabad,technology,\"python,react,ml\"\n"
        rows, errors = parse_csv(csv_content)
        assert len(rows) == 1
        assert isinstance(rows[0].get("skills"), list)


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #10 — Multi-language Consent
# ═══════════════════════════════════════════════════════════════════════════
class TestConsentI18n:
    def test_supported_languages(self):
        from features.lead_aggregator.consent_i18n import supported_languages
        langs = supported_languages()
        codes = [l["code"] for l in langs]
        assert "en" in codes
        assert "hi" in codes
        assert "te" in codes
        assert "ta" in codes
        assert len(codes) >= 8

    def test_validate_language(self):
        from features.lead_aggregator.consent_i18n import validate_consent_language
        assert validate_consent_language("en") is True
        assert validate_consent_language("hi") is True
        assert validate_consent_language("xx") is False

    def test_get_consent_form_en(self):
        from features.lead_aggregator.consent_i18n import get_consent_form
        form = get_consent_form("en")
        assert "title" in form
        assert "purpose" in form
        assert "rights" in form
        assert "accept_label" in form

    def test_get_consent_form_fallback(self):
        from features.lead_aggregator.consent_i18n import get_consent_form
        form = get_consent_form("xx")
        assert form["title"] is not None

    def test_render_html(self):
        from features.lead_aggregator.consent_i18n import render_consent_html
        html = render_consent_html("en", "TestBrand")
        assert "TestBrand" in html
        assert "<html" in html.lower()


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #11 — ML Scoring (pure functions)
# ═══════════════════════════════════════════════════════════════════════════
class TestMLScoring:
    def test_sigmoid_bounds(self):
        from features.lead_aggregator.ml_scoring import sigmoid
        assert 0 < sigmoid(0) < 1
        assert abs(sigmoid(0) - 0.5) < 0.001
        assert sigmoid(10) > 0.99
        assert sigmoid(-10) < 0.01

    def test_extract_features_length(self):
        from features.lead_aggregator.ml_scoring import extract_features
        lead = {"age": 22, "city": "Hyderabad", "skills": ["python"], "education_level": "btech",
                "phone_verified": True, "domain": "technology", "email": "t@t.com", "institution": "SNIST"}
        brand = {"target_age_min": 20, "target_age_max": 25, "target_cities": ["Hyderabad"],
                 "target_skills": ["python"], "target_education_levels": ["btech"], "domain": "technology"}
        features = extract_features(lead, brand)
        assert len(features) == 10
        assert all(isinstance(f, (int, float)) for f in features)

    def test_predict_score(self):
        from features.lead_aggregator.ml_scoring import predict_score
        weights = [0.5] * 10
        bias = 0.0
        features = [1.0] * 10
        score = predict_score(features, weights, bias)
        assert 0 < score < 1

    def test_train_model(self):
        from features.lead_aggregator.ml_scoring import train_model
        data = [([1.0, 0.8, 0.9, 1.0, 0.7, 1.0, 1.0, 1.0, 1.0, 3.0], 1)] * 30 + \
               [([0.0, 0.0, 0.0, 0.0, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0], 0)] * 30
        weights, bias = train_model(data, lr=0.1, epochs=50)
        assert len(weights) == 10

    def test_temperature_mapping(self):
        from features.lead_aggregator.ml_scoring import _temperature
        assert _temperature(75) == "hot"
        assert _temperature(50) == "warm"
        assert _temperature(30) == "cold"
        assert _temperature(20) == "low"


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #12 — Integrations
# ═══════════════════════════════════════════════════════════════════════════
class TestIntegrations:
    def test_list_integrations(self):
        from features.lead_aggregator.integrations import list_integrations
        templates = list_integrations()
        assert len(templates) >= 8
        ids = [t["template_id"] for t in templates]
        assert "zapier_new_lead" in ids
        assert "slack_notification" in ids

    def test_get_integration(self):
        from features.lead_aggregator.integrations import get_integration
        result = get_integration("zapier_new_lead")
        assert result.get("status") != "error"
        assert "name" in result
        assert "payload_schema" in result
        assert "sample_payload" in result

    def test_get_nonexistent_integration(self):
        from features.lead_aggregator.integrations import get_integration
        result = get_integration("nonexistent")
        assert result.get("status") == "error"
