import re


ROLE_KEYWORDS = {
    "software": (
        "python", "java", "javascript", "typescript", "react", "node", "fastapi",
        "docker", "aws", "gcp", "sql", "mongodb", "git", "rest api", "graphql",
        "machine learning", "algorithms", "system design", "kubernetes", "ci/cd",
    ),
    "data": (
        "python", "sql", "excel", "tableau", "power bi", "statistics",
        "data analysis", "machine learning", "pandas", "data visualization",
        "analytics", "data modeling",
    ),
    "product": (
        "roadmap", "product strategy", "user research", "product analytics",
        "a/b testing", "prioritization", "requirements", "stakeholder",
        "metrics", "agile",
    ),
    "design": (
        "figma", "ux", "ui", "user research", "prototyping", "wireframes",
        "usability", "design systems", "accessibility", "interaction design",
    ),
    "finance": (
        "financial modeling", "valuation", "accounting", "excel", "forecasting",
        "budgeting", "risk analysis", "financial analysis", "investment", "audit",
    ),
    "general": (
        "project management", "communication", "leadership", "collaboration",
        "research", "problem solving",
    ),
}

SECTION_PATTERNS = (
    r"\b(experience|employment|work history)\b",
    r"\b(education|university|college|degree|bachelor|master)\b",
    r"\b(skills|technical skills|technologies)\b",
    r"\b(projects|selected projects|personal projects)\b",
)

METRIC_PATTERN = re.compile(
    r"\b\d+(?:\.\d+)?\s?%|\b\d+(?:,\d{3})*\+?\s*"
    r"(?:users?|customers?|projects?|clients?|orders?|teams?|"
    r"transactions?|hours?|days?|weeks?)\b|"
    r"[$₹]\s?\d+(?:,\d{3})*(?:\.\d+)?",
    re.IGNORECASE,
)


def calculate_resume_ats_score(text: str, target_role: str) -> int:
    """Return a deterministic resume-readiness score from 0 to 100."""
    normalized = re.sub(r"\s+", " ", text).strip().lower()
    if not normalized:
        return 0

    score = 10 if re.search(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b", normalized) else 0

    phone_matches = re.findall(r"(?<!\w)\+?[\d][\d\s().-]{6,}\d(?!\w)", normalized)
    if any(sum(character.isdigit() for character in match) >= 7 for match in phone_matches):
        score += 5

    score += sum(8 for pattern in SECTION_PATTERNS if re.search(pattern, normalized))

    word_count = len(re.findall(r"\b[\w+#.-]+\b", normalized))
    if word_count >= 200:
        score += 10
    elif word_count >= 100:
        score += 6
    elif word_count >= 50:
        score += 3

    score += min(len(METRIC_PATTERN.findall(normalized)), 3) * 5

    role = target_role.lower()
    if "software" in role or "engineering" in role:
        keywords = ROLE_KEYWORDS["software"]
    elif "data" in role or "analytics" in role:
        keywords = ROLE_KEYWORDS["data"]
    elif "product" in role:
        keywords = ROLE_KEYWORDS["product"]
    elif "design" in role:
        keywords = ROLE_KEYWORDS["design"]
    elif "finance" in role:
        keywords = ROLE_KEYWORDS["finance"]
    else:
        keywords = ROLE_KEYWORDS["general"]

    matched_keywords = sum(
        bool(re.search(rf"(?<!\w){re.escape(keyword)}(?!\w)", normalized))
        for keyword in keywords
    )
    score += round(20 * min(matched_keywords / 5, 1))

    profile_links = len(
        set(re.findall(r"\b(linkedin\.com|github\.com|behance\.net|dribbble\.com|portfolio)\b", normalized))
    )
    score += min(profile_links, 2) * 4

    return min(score, 100)
