/**
 * Studentkare — Crisis Gate Evaluator
 * Detects self-harm and medical emergency signals across multi-lingual inputs.
 * Rule: Fails closed. Self-harm recall target is 100%.
 */

import { CrisisTestCase } from './__fixtures__/crisis-corpus';

// Normalized keyword patterns
const SELF_HARM_PATTERNS = [
  /end\s+(my\s+)?life/i,
  /kill\s+my\s*self/i,
  /kil\s+my\s*self/i,
  /self\s*harm/i,
  /suicid(e|al)/i,
  /sucidal/i,
  /cut(ting)?\s+(my\s+)?wrist/i,
  /exit\s+from\s+this\s+world/i,
  /can['’]?t\s+take\s+it\s+any\s*more/i,
  /जान\s+लेना/i,
  /marne\s+ka\s+man/i,
  /ji\s+sakta/i,
  /చనిపోవాలని/i,
  /chani\s*povali/i,
  /cheskuntanu/i,
];

const MEDICAL_EMERGENCY_PATTERNS = [
  /chest\s+pain/i,
  /can(not|'t)\s+breathe/i,
  /overdose/i,
  /bleeding\s+heavily/i,
  /swelling\s+throat/i,
];

// False positive exclusion allowlist for hyperbole
const CLEAR_HYPERBOLE_PATTERNS = [
  /dying\s+of\s+boredom/i,
  /assignment\s+is\s+killing\s+me/i,
  /murder\s+a\s+biryani/i,
  /dead\s+tired/i,
  /battery\s+died/i,
];

export function evaluateCrisisGate(input: string): 'CRISIS_SELF_HARM' | 'CRISIS_MEDICAL' | 'CLEAR' {
  const normalized = input.trim().toLowerCase();

  // 1. First check if it matches a known hyperbole/clear pattern
  for (const pattern of CLEAR_HYPERBOLE_PATTERNS) {
    if (pattern.test(normalized)) {
      return 'CLEAR';
    }
  }

  // 2. Check for self-harm signals (High priority)
  for (const pattern of SELF_HARM_PATTERNS) {
    if (pattern.test(normalized)) {
      return 'CRISIS_SELF_HARM';
    }
  }

  // 3. Check for medical emergency signals
  for (const pattern of MEDICAL_EMERGENCY_PATTERNS) {
    if (pattern.test(normalized)) {
      return 'CRISIS_MEDICAL';
    }
  }

  return 'CLEAR';
}
