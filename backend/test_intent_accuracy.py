import asyncio
from agent_k.providers.factory import EmergentProvider
from agent_k.core.intent import classify_intent

async def main():
    provider = EmergentProvider()
    
    test_cases = [
        # Application
        ("How do I upload my resume to the platform?", "application"),
        ("What features are available for mentors?", "application"),
        ("Where can I find the student discounts?", "application"),
        # General
        ("What is the capital of France?", "general"),
        ("Can you write a python script for a snake game?", "general"),
        ("Who won the world cup in 2018?", "general"),
        # Greeting
        ("Hello, how are you today?", "greeting"),
        ("Hi Agent K!", "greeting"),
        # Feedback
        ("This app is really slow and buggy.", "feedback"),
        ("I love the new UI update, great job!", "feedback"),
        # Mixed
        ("How do I use the alumni directory, and also what's the weather like in Paris?", "mixed")
    ]
    
    correct = 0
    total = len(test_cases)
    
    print("Testing Agent K Intent Classification...\n")
    for msg, expected in test_cases:
        try:
            intent = await classify_intent(provider, msg)
            is_match = (intent == expected)
            if is_match:
                correct += 1
                print(f"[PASS] '{msg}' -> {intent}")
            else:
                print(f"[FAIL] '{msg}' -> Got: {intent}, Expected: {expected}")
        except Exception as e:
            print(f"[ERROR] '{msg}' -> {e}")
            
    accuracy = (correct / total) * 100
    print(f"\nFinal Accuracy: {accuracy:.2f}% ({correct}/{total})")

if __name__ == "__main__":
    asyncio.run(main())
