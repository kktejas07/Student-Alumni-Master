# ── Re-export from career_ai/skill_intelligence_service ─────────────────────
# Phase A extraction: skill intelligence logic lives in services/career_ai/
# This module re-exports all public symbols for backward compatibility.

from services.career_ai.skill_intelligence_service import (
    # Cache
    invalidate_intel_cache,
    _SKILL_INTEL_CACHE,
    _SKILL_INTEL_TTL_SECS,
    _check_cache,
    _store_cache,

    # Constants
    _ALL_STANDARD_MILESTONES,
    _CATEGORY_KEYWORDS,
    _CATEGORY_WEIGHTS,
    _LEVEL_THRESHOLDS,
    _MILESTONE_TYPE_MAP,
    _ACTION_TITLES,

    # Public helpers
    categorize_skill,
    get_readiness_level,
    compute_dynamic_action_impact,

    # Private helpers
    _detect_goal_weights,
    _compute_skill_dimensions,
    _build_score_explanations,
    _get_next_level_info,

    # Pipeline
    compute_full_intelligence,
)

__all__ = [
    "invalidate_intel_cache",
    "_ALL_STANDARD_MILESTONES",
    "categorize_skill",
    "get_readiness_level",
    "compute_dynamic_action_impact",
    "compute_full_intelligence",
]
