"""
voice_coach_agent.py — AI Voice & Speech Coach Agent
Provides:
  1. Speech Pace (WPM) & Clarity Scoring
  2. Filler Word Detection (e.g. "um", "uh", "like", "basically")
  3. Behavioral Pitch Evaluation & Constructive Feedback
"""
from __future__ import annotations
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class VoiceCoachingRequest(BaseModel):
    transcript_text: str
    audio_duration_seconds: float = 30.0
    scenario: Optional[str] = "behavioral_interview" # elevator_pitch, behavioral_interview, leadership_qa

class VoiceCoachingResponse(BaseModel):
    words_per_minute: int
    pace_assessment: str # Ideal (130-160 WPM), Too Fast (>170), Too Slow (<110)
    filler_word_count: int
    detected_fillers: List[str]
    clarity_score: int # 0 - 100
    confidence_score: int # 0 - 100
    overall_rating: str # Exemplary, Strong, Needs Improvement
    feedback: List[str]
    coaching_tips: List[str]

class VoiceCoachAgentService:
    """Analyzes speech transcripts and audio timing to coach students on verbal delivery."""

    async def analyze_speech(self, req: VoiceCoachingRequest) -> VoiceCoachingResponse:
        text = req.transcript_text.strip()
        words = text.split()
        word_count = len(words)
        duration_min = max(req.audio_duration_seconds / 60.0, 0.1)

        wpm = int(word_count / duration_min) if duration_min > 0 else 140

        if 125 <= wpm <= 165:
            pace_eval = "Ideal (Optimal conversational cadence)"
        elif wpm > 165:
            pace_eval = "Fast (Consider slowing down for complex technical points)"
        else:
            pace_eval = "Deliberate (Good clarity, could increase energy slightly)"

        # Filler word detection
        filler_patterns = [r"\bum\b", r"\buh\b", r"\blike\b", r"\bbasically\b", r"\byou know\b", r"\bactually\b"]
        found_fillers = []
        filler_count = 0
        for pat in filler_patterns:
            matches = re.findall(pat, text, re.IGNORECASE)
            if matches:
                filler_count += len(matches)
                found_fillers.append(matches[0].lower())

        # Clarity & Confidence scoring
        clarity = max(100 - (filler_count * 6), 55)
        confidence = 92 if wpm >= 130 and filler_count <= 2 else 78

        rating = "Exemplary" if clarity >= 88 and confidence >= 85 else "Strong" if clarity >= 75 else "Needs Improvement"

        feedback = [
            f"Delivered {word_count} words in {req.audio_duration_seconds}s at {wpm} WPM.",
            f"Detected {filler_count} filler words ({', '.join(found_fillers) if found_fillers else 'None'})."
        ]

        tips = [
            "Use deliberate 1-second pauses instead of filler words when transitioning between thoughts.",
            "Emphasize technical project outcomes with quantified metrics for higher memorability."
        ]

        return VoiceCoachingResponse(
            words_per_minute=wpm,
            pace_assessment=pace_eval,
            filler_word_count=filler_count,
            detected_fillers=found_fillers,
            clarity_score=clarity,
            confidence_score=confidence,
            overall_rating=rating,
            feedback=feedback,
            coaching_tips=tips
        )

# Global singleton
voice_coach_agent = VoiceCoachAgentService()
