import asyncio
from server import get_career_suggestions, CareerSuggestionRequest

async def main():
    try:
        req = CareerSuggestionRequest(additional_context='math')
        user = {'_id': '64abcd1234abcd1234abcd12', 'onboarding_completed': True, 'career_path': 'job', 'full_name': 'test'}
        res = await get_career_suggestions(req, user)
        print(res)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
