from services.resume_ats import calculate_resume_ats_score


def test_empty_resume_scores_zero():
    assert calculate_resume_ats_score("", "Software engineering") == 0


def test_basic_resume_does_not_get_full_score_for_five_broad_signals():
    resume = "Jane Doe jane@example.com Experience Education bachelor degree Skills 5 years"
    assert calculate_resume_ats_score(resume, "Software engineering") < 100


def test_relevant_keywords_improve_role_match_score():
    base = (
        "jane@example.com Experience Education Skills Projects "
        + " ".join(["resume"] * 220)
    )
    software_resume = f"{base} Python Java React Docker SQL"
    design_resume = f"{base} Figma UX wireframes prototyping usability"

    assert calculate_resume_ats_score(software_resume, "Software engineering") > (
        calculate_resume_ats_score(design_resume, "Software engineering")
    )


def test_metrics_and_profile_links_increase_score():
    base = "jane@example.com Experience Education Skills Projects " + " ".join(["resume"] * 220)
    enhanced = f"{base} improved 25% served 100 users completed 12 projects github.com linkedin.com"

    assert calculate_resume_ats_score(enhanced, "Software engineering") > (
        calculate_resume_ats_score(base, "Software engineering")
    )
