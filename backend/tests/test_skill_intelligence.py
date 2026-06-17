import pytest
import secrets

BASE_URL = "http://127.0.0.1:8000"

@pytest.fixture
def auth_header(api_client):
    email = f"test-intel-{secrets.token_hex(4)}@test.com"
    # 1. Register student
    r = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "Student@123",
        "full_name": "Test Intel Student",
        "role": "student",
    })
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Complete onboarding with some profile data
    r_onboard = api_client.post(f"{BASE_URL}/api/users/onboarding", json={
        "school_info": {
            "institution_name": "Springdale School",
            "institution_type": "school",
            "class_or_year": "12",
            "branch_or_stream": "Science",
            "country": "India"
        },
        "career_path": "job",
        "student_info": {
            "age": 18,
            "education_level": "plus_two",
            "career_interests": ["Software Engineering"]
        },
        "interests": ["Coding", "Algorithms", "React"],
        "skills": ["Python", "JavaScript", "HTML", "Data Structures"],
        "bio": "Passionate software engineering student eager to learn and build cool projects.",
    }, headers=headers)
    assert r_onboard.status_code == 200, r_onboard.text

    return headers

def test_skill_intelligence_endpoint(api_client, auth_header):
    # Call skill intelligence endpoint
    r = api_client.get(f"{BASE_URL}/api/users/me/skill-intelligence", headers=auth_header)
    assert r.status_code == 200, r.text
    
    data = r.json()
    
    # Verify schema keys
    assert "readiness_score" in data
    assert "skill_scores" in data
    assert "recommendation" in data
    assert "potential_score" in data
    assert "readiness_gap" in data
    assert "profile_strength" in data
    
    # Verify values consistency
    readiness = data["readiness_score"]["score"]
    potential = data["potential_score"]
    gap = data["readiness_gap"]
    profile_strength = data["profile_strength"]
    
    assert potential >= readiness, f"Potential ({potential}) must not be lower than Current Readiness ({readiness})"
    assert gap == potential - readiness, f"Readiness Gap ({gap}) must equal Potential - Current Readiness ({potential} - {readiness})"
    assert 0 <= profile_strength <= 100, f"Profile strength ({profile_strength}) must be between 0 and 100"
    
    # Verify skill categories are present
    categories = [
        "Technical Excellence",
        "Professional Communication",
        "Personal Brand",
        "Leadership & Collaboration",
        "Career Preparation",
        "Industry Presence"
    ]
    for cat in categories:
        assert cat in data["skill_scores"]
        assert 0 <= data["skill_scores"][cat] <= 100

def test_stats_streak_endpoint(api_client, auth_header):
    # Call stats endpoint
    r = api_client.get(f"{BASE_URL}/api/users/me/stats", headers=auth_header)
    assert r.status_code == 200, r.text
    
    data = r.json()
    assert "skill_streak" in data
    assert isinstance(data["skill_streak"], int)
    assert data["skill_streak"] >= 0
