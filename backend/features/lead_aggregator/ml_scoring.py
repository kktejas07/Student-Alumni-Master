"""Enhancement #11 — ML-based Lead Scoring V2.

Trainable logistic regression that learns from conversion history.
Falls back to heuristic scorer until enough labeled data exists.
"""
from __future__ import annotations

import logging
import math
from datetime import datetime, timezone
from typing import Optional

from db import db
from .database import leads_col, brands_col
from .geo import resolve_city, in_same_region
from .scoring import compute_lead_score

logger = logging.getLogger(__name__)

ml_models_col = db.la_ml_models

FEATURE_NAMES = [
    "age_fit", "city_match", "skills_overlap", "education_match",
    "profile_completeness", "phone_verified", "domain_match",
    "has_email", "has_institution", "skills_count",
]

DEFAULT_WEIGHTS = [0.18, 0.15, 0.20, 0.12, 0.10, 0.08, 0.05, 0.04, 0.03, 0.05]
DEFAULT_BIAS = -0.5


def _temperature(score: int) -> str:
    if score >= 70:
        return "hot"
    if score >= 45:
        return "warm"
    if score >= 25:
        return "cold"
    return "low"


def extract_features(lead: dict, brand: dict) -> list[float]:
    age = lead.get("age")
    t_min = brand.get("target_age_min")
    t_max = brand.get("target_age_max")
    if age and t_min and t_max:
        if t_min <= age <= t_max:
            age_fit = 1.0
        elif abs(age - t_min) <= 5 or abs(age - t_max) <= 5:
            age_fit = 0.5
        else:
            age_fit = 0.0
    else:
        age_fit = 0.5

    lead_city = (lead.get("city") or "").strip().lower()
    target_cities = [c.lower() for c in (brand.get("target_cities") or [])]
    if not target_cities:
        city_match = 0.5
    elif resolve_city(lead_city) in [resolve_city(c) for c in target_cities]:
        city_match = 1.0
    elif any(in_same_region(lead_city, c) for c in target_cities):
        city_match = 0.5
    else:
        city_match = 0.0

    lead_skills = set(s.lower() for s in (lead.get("skills") or []))
    brand_skills = set(s.lower() for s in (brand.get("target_skills") or []))
    if lead_skills and brand_skills:
        skills_overlap = len(lead_skills & brand_skills) / len(lead_skills | brand_skills)
    elif not brand_skills:
        skills_overlap = 0.5
    else:
        skills_overlap = 0.0

    lead_edu = (lead.get("education_level") or "").lower()
    target_edus = [e.lower() for e in (brand.get("target_education_levels") or [])]
    if not target_edus:
        education_match = 0.5
    elif lead_edu in target_edus:
        education_match = 1.0
    else:
        education_match = 0.0

    fields = ["full_name", "email", "phone", "age", "city", "education_level",
              "institution", "skills", "interests"]
    filled = sum(1 for f in fields if lead.get(f))
    profile_completeness = filled / len(fields)

    phone_verified = 1.0 if lead.get("phone_verified") else 0.0

    lead_domain = (lead.get("domain") or "").lower()
    brand_domain = (brand.get("domain") or "").lower()
    domain_match = 1.0 if lead_domain and lead_domain == brand_domain else 0.0

    has_email = 1.0 if lead.get("email") else 0.0
    has_institution = 1.0 if lead.get("institution") else 0.0
    skills_count = float(min(len(lead.get("skills") or []), 10)) / 10.0

    return [
        age_fit, city_match, skills_overlap, education_match,
        profile_completeness, phone_verified, domain_match,
        has_email, has_institution, skills_count,
    ]


def sigmoid(z: float) -> float:
    z = max(-500.0, min(500.0, z))
    return 1.0 / (1.0 + math.exp(-z))


def predict_score(features: list[float], weights: list[float], bias: float) -> float:
    z = sum(f * w for f, w in zip(features, weights)) + bias
    return sigmoid(z)


def train_model(
    training_data: list[tuple[list[float], int]],
    lr: float = 0.01,
    epochs: int = 100,
) -> tuple[list[float], float]:
    if not training_data:
        return list(DEFAULT_WEIGHTS), DEFAULT_BIAS

    n_features = len(training_data[0][0])
    weights = [0.0] * n_features
    bias = 0.0
    n = len(training_data)

    for _ in range(epochs):
        dw = [0.0] * n_features
        db_val = 0.0

        for features, label in training_data:
            pred = predict_score(features, weights, bias)
            error = pred - label

            for j in range(n_features):
                dw[j] += error * features[j]
            db_val += error

        for j in range(n_features):
            weights[j] -= lr * (dw[j] / n)
        bias -= lr * (db_val / n)

    return weights, bias


class MLScorer:
    def __init__(self) -> None:
        self._weights: Optional[list[float]] = None
        self._bias: Optional[float] = None
        self._trained: bool = False
        self._sample_count: int = 0
        self._accuracy: float = 0.0
        self._trained_at: Optional[datetime] = None

    async def _load(self) -> None:
        if self._weights is not None:
            return
        doc = await ml_models_col.find_one({"model_id": "lead_scorer_v2"})
        if doc and doc.get("weights"):
            self._weights = doc["weights"]
            self._bias = doc.get("bias", DEFAULT_BIAS)
            self._trained = doc.get("trained", False)
            self._sample_count = doc.get("sample_count", 0)
            self._accuracy = doc.get("accuracy", 0.0)
            self._trained_at = doc.get("trained_at")
        else:
            self._weights = list(DEFAULT_WEIGHTS)
            self._bias = DEFAULT_BIAS
            self._trained = False

    async def score(self, lead: dict, brand: dict) -> tuple[int, dict, str]:
        await self._load()

        if not self._trained or self._sample_count < 100:
            return compute_lead_score(lead, brand)

        features = extract_features(lead, brand)
        prob = predict_score(features, self._weights, self._bias)
        raw_score = int(round(prob * 100))
        raw_score = max(0, min(100, raw_score))

        breakdown = {name: round(val, 3) for name, val in zip(FEATURE_NAMES, features)}
        breakdown["ml_probability"] = round(prob, 4)
        breakdown["model"] = "ml_v2"

        return raw_score, breakdown, _temperature(raw_score)

    async def retrain(self, min_samples: int = 100) -> dict:
        positive = await leads_col.find(
            {"status": "converted"},
        ).to_list(length=5000)

        negative = await leads_col.find(
            {"status": {"$in": ["invalid", "new"]}},
        ).to_list(length=5000)

        if len(positive) + len(negative) < min_samples:
            return {
                "status": "insufficient_data",
                "positive": len(positive),
                "negative": len(negative),
                "required": min_samples,
            }

        training_data: list[tuple[list[float], int]] = []

        for lead in positive:
            brand_ids = lead.get("matched_brands", [])
            if brand_ids:
                brand = await brands_col.find_one({"brand_id": brand_ids[0]})
                if brand:
                    features = extract_features(lead, brand)
                    training_data.append((features, 1))

        for lead in negative:
            brand_ids = lead.get("matched_brands", [])
            brand = None
            if brand_ids:
                brand = await brands_col.find_one({"brand_id": brand_ids[0]})
            if not brand:
                brand = await brands_col.find_one({"status": "active"})
            if brand:
                features = extract_features(lead, brand)
                training_data.append((features, 0))

        if len(training_data) < min_samples:
            return {"status": "insufficient_paired_data", "paired": len(training_data)}

        weights, bias = train_model(training_data, lr=0.01, epochs=200)

        correct = 0
        for features, label in training_data:
            pred = 1 if predict_score(features, weights, bias) >= 0.5 else 0
            if pred == label:
                correct += 1
        accuracy = round(correct / len(training_data), 4)

        now = datetime.now(timezone.utc)
        await ml_models_col.update_one(
            {"model_id": "lead_scorer_v2"},
            {"$set": {
                "model_id": "lead_scorer_v2",
                "weights": weights,
                "bias": bias,
                "trained": True,
                "sample_count": len(training_data),
                "positive_count": len(positive),
                "negative_count": len(negative),
                "accuracy": accuracy,
                "feature_names": FEATURE_NAMES,
                "trained_at": now,
            }},
            upsert=True,
        )

        self._weights = weights
        self._bias = bias
        self._trained = True
        self._sample_count = len(training_data)
        self._accuracy = accuracy
        self._trained_at = now

        logger.info(
            "[ML-Scorer] Retrained: %d samples, accuracy=%.2f%%",
            len(training_data), accuracy * 100,
        )

        return {
            "status": "ok",
            "samples": len(training_data),
            "positive": len(positive),
            "negative": len(negative),
            "accuracy": accuracy,
            "trained_at": now.isoformat(),
        }

    async def model_info(self) -> dict:
        await self._load()
        return {
            "model_id": "lead_scorer_v2",
            "trained": self._trained,
            "sample_count": self._sample_count,
            "accuracy": self._accuracy,
            "trained_at": self._trained_at.isoformat() if self._trained_at else None,
            "feature_names": FEATURE_NAMES,
            "weights": dict(zip(FEATURE_NAMES, self._weights or DEFAULT_WEIGHTS)),
            "bias": self._bias or DEFAULT_BIAS,
            "fallback": "heuristic_v1" if not self._trained else None,
        }


_scorer = MLScorer()


async def compute_lead_score_v2(lead: dict, brand: dict) -> tuple[int, dict, str]:
    return await _scorer.score(lead, brand)


async def retrain_model(min_samples: int = 100) -> dict:
    return await _scorer.retrain(min_samples=min_samples)


async def model_info() -> dict:
    return await _scorer.model_info()
