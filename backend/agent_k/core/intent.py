import string
from agent_k.providers.base import BaseLLMProvider
from agent_k.prompts.templates import CLASSIFIER_PROMPT

ALLOWED_INTENTS = {"application", "general", "mixed", "greeting", "feedback", "unknown"}

async def classify_intent(provider: BaseLLMProvider, message: str, history_string: str = "") -> str:
    """
    Uses the LLM to classify the user's intent based on the message and history.
    Returns one of the ALLOWED_INTENTS.
    """
    
    # If there's history, we can prepend it to the message or include it for context
    context_str = f"Previous Conversation:\n{history_string}\n\n" if history_string and history_string != "No previous conversation." else ""
    full_message = f"{context_str}Current User Message: {message}"
    
    prompt = CLASSIFIER_PROMPT.format(message=full_message)
    
    try:
        response = await provider.generate_text(prompt, system="You are an intent classification system.")
        
        # Clean the response: lowercase, strip punctuation and whitespace
        clean_response = response.strip().lower()
        # Remove punctuation
        clean_response = clean_response.translate(str.maketrans('', '', string.punctuation))
        
        # Find the first valid word in case the model returns something like "The intent is: application"
        for word in clean_response.split():
            if word in ALLOWED_INTENTS:
                return word
                
        return "unknown"
    except Exception as e:
        print(f"Intent classification failed: {e}")
        # Default to general or unknown if it fails
        return "unknown"
