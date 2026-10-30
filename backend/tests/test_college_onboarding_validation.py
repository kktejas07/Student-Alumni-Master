import asyncio

import pytest
from pydantic import ValidationError

from core.models import SchoolInfo
from routers.users import OnboardingRequest
from routers.admin import colleges as college_routes


def test_school_info_rejects_blank_college_name():
    with pytest.raises(ValidationError, match="Please enter your college name"):
        OnboardingRequest(school_info=SchoolInfo(institution_name="   "))


def test_custom_college_requires_a_name():
    with pytest.raises(ValidationError, match="Please enter your college name"):
        SchoolInfo(institution_name="", is_custom_college=True, custom_college_name=" ")


def test_custom_college_is_saved_as_institution_and_clears_catalog_metadata():
    school = SchoolInfo(
        institution_name="College not listed",
        college_id="catalog:ignored",
        college_tier="Tier 1",
        is_custom_college=True,
        custom_college_name="  My Regional College  ",
    )

    assert school.institution_name == "My Regional College"
    assert school.custom_college_name == "My Regional College"
    assert school.college_id is None
    assert school.college_tier is None


def test_listed_college_preserves_its_catalog_metadata():
    school = SchoolInfo(
        institution_name="IIT Bombay",
        college_id="catalog:iit-bombay",
        college_tier="Tier 1",
    )

    assert school.institution_name == "IIT Bombay"
    assert school.college_id == "catalog:iit-bombay"
    assert school.college_tier == "Tier 1"


def test_public_search_includes_curated_college_and_tier(monkeypatch):
    class EmptyCursor:
        def limit(self, _limit):
            return self

        def __aiter__(self):
            async def empty():
                if False:
                    yield None
            return empty()

    class EmptyColleges:
        def find(self, _query):
            return EmptyCursor()

    class EmptyDatabase:
        colleges = EmptyColleges()

    monkeypatch.setattr(college_routes, "_db", EmptyDatabase())
    for name, expected_tier in (
        ("IIT Bombay", "Tier 1"),
        ("Christ University", "Tier 2"),
        ("BMS College Bangalore", "Tier 3"),
    ):
        response = asyncio.run(college_routes.search_colleges_public(q=name, limit=8))
        match = next(item for item in response["results"] if item["name"] == name)
        assert match["id"].startswith("catalog:")
        assert match["tier"] == expected_tier
