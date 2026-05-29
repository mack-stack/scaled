import anthropic
from scaled.core.config import get_settings


def get_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=get_settings().anthropic_api_key)


def ask_claude(system_prompt: str, user_prompt: str, model: str | None = None) -> str:
    """Single-turn Claude call. The workhorse for all modules."""
    client = get_client()
    settings = get_settings()
    response = client.messages.create(
        model=model or settings.claude_model,
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text
