def check_prompt_injection(message: str) -> None:
    """Basic heuristic check to prevent common prompt injection patterns."""
    text = message.lower()
    
    blocked_phrases = [
        "ignore previous",
        "disregard previous",
        "system prompt",
        "you are now",
        "forget all",
        "ignore all",
        "bypass instructions",
        "new instructions"
    ]
    
    for phrase in blocked_phrases:
        if phrase in text:
            raise ValueError("Security Policy Violation: Prompt injection detected.")
