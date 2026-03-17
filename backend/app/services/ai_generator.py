"""
AI Generator service — unified interface for OpenAI and Claude message generation.

Responsibilities:
- Abstract away API differences between providers
- Handle rate limiting, retries, and error normalization  
- Track token usage and cost metadata
- Enforce word count limits
"""

import logging
import time
from dataclasses import dataclass

from anthropic import AsyncAnthropic, RateLimitError as AnthropicRateLimitError, APIError as AnthropicAPIError
from openai import AsyncOpenAI, RateLimitError as OpenAIRateLimitError, APIError as OpenAIAPIError
from groq import AsyncGroq

from app.config import settings

logger = logging.getLogger(__name__)


# ============================================
# Data Types
# ============================================

@dataclass
class GenerationResult:
    """Result of an AI message generation."""
    content: str
    word_count: int
    model: str
    metadata: dict  # Token usage, latency, cost estimate


@dataclass
class GenerationError:
    """Error from AI generation."""
    error: str
    model: str
    retryable: bool


# ============================================
# Model Configuration
# ============================================

OPENAI_MODELS = {"gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"}
CLAUDE_MODELS = {"claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307",
                 "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"}
GROQ_MODELS = {"llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-3.2-90b-vision-preview",
               "mixtral-8x7b-32768", "gemma2-9b-it"}

# Approximate cost per 1K tokens (input/output)
COST_PER_1K = {
    "gpt-4": {"input": 0.03, "output": 0.06},
    "gpt-4-turbo": {"input": 0.01, "output": 0.03},
    "gpt-4o": {"input": 0.005, "output": 0.015},
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
    "claude-3-opus-20240229": {"input": 0.015, "output": 0.075},
    "claude-3-sonnet-20240229": {"input": 0.003, "output": 0.015},
    "claude-3-haiku-20240307": {"input": 0.00025, "output": 0.00125},
    "claude-3-5-sonnet-20241022": {"input": 0.003, "output": 0.015},
    "claude-3-5-haiku-20241022": {"input": 0.001, "output": 0.005},
    # Groq models are free
    "llama-3.3-70b-versatile": {"input": 0.0, "output": 0.0},
    "llama-3.1-8b-instant": {"input": 0.0, "output": 0.0},
    "llama-3.2-90b-vision-preview": {"input": 0.0, "output": 0.0},
    "mixtral-8x7b-32768": {"input": 0.0, "output": 0.0},
    "gemma2-9b-it": {"input": 0.0, "output": 0.0},
}


def _estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Estimate cost in USD for a generation."""
    rates = COST_PER_1K.get(model, {"input": 0.01, "output": 0.03})
    return (input_tokens / 1000 * rates["input"]) + (output_tokens / 1000 * rates["output"])


def _is_openai_model(model: str) -> bool:
    """Check if model name belongs to OpenAI."""
    return model in OPENAI_MODELS or model.startswith("gpt-")


def _is_claude_model(model: str) -> bool:
    """Check if model name belongs to Anthropic."""
    return model in CLAUDE_MODELS or model.startswith("claude-")


def _is_groq_model(model: str) -> bool:
    """Check if model name belongs to Groq."""
    return model in GROQ_MODELS or model.startswith("llama-") or model.startswith("mixtral-") or model.startswith("gemma")


def get_default_model() -> str:
    """Get the configured default model."""
    return settings.default_ai_model


# ============================================
# OpenAI Provider
# ============================================

async def _generate_openai(
    system_prompt: str,
    user_prompt: str,
    model: str,
    max_tokens: int = 500,
    temperature: float = 0.7,
) -> GenerationResult | GenerationError:
    """Generate message using OpenAI API."""
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    start_time = time.time()
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        latency_ms = int((time.time() - start_time) * 1000)

        content = response.choices[0].message.content or ""
        usage = response.usage

        input_tokens = usage.prompt_tokens if usage else 0
        output_tokens = usage.completion_tokens if usage else 0

        return GenerationResult(
            content=content.strip(),
            word_count=len(content.split()),
            model=model,
            metadata={
                "provider": "openai",
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": (usage.total_tokens if usage else 0),
                "latency_ms": latency_ms,
                "cost_usd": round(_estimate_cost(model, input_tokens, output_tokens), 6),
                "temperature": temperature,
            },
        )

    except OpenAIRateLimitError as e:
        logger.warning("OpenAI rate limit hit: %s", e)
        return GenerationError(error=f"Rate limit: {e}", model=model, retryable=True)

    except OpenAIAPIError as e:
        logger.error("OpenAI API error: %s", e)
        return GenerationError(error=str(e), model=model, retryable=True)

    except Exception as e:
        logger.exception("Unexpected OpenAI error")
        return GenerationError(error=str(e), model=model, retryable=False)


# ============================================
# Claude (Anthropic) Provider
# ============================================

async def _generate_claude(
    system_prompt: str,
    user_prompt: str,
    model: str,
    max_tokens: int = 500,
    temperature: float = 0.7,
) -> GenerationResult | GenerationError:
    """Generate message using Anthropic Claude API."""
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    start_time = time.time()
    try:
        response = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt},
            ],
        )
        latency_ms = int((time.time() - start_time) * 1000)

        content = response.content[0].text if response.content else ""
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens

        return GenerationResult(
            content=content.strip(),
            word_count=len(content.split()),
            model=model,
            metadata={
                "provider": "anthropic",
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens,
                "latency_ms": latency_ms,
                "cost_usd": round(_estimate_cost(model, input_tokens, output_tokens), 6),
                "temperature": temperature,
            },
        )

    except AnthropicRateLimitError as e:
        logger.warning("Claude rate limit hit: %s", e)
        return GenerationError(error=f"Rate limit: {e}", model=model, retryable=True)

    except AnthropicAPIError as e:
        logger.error("Claude API error: %s", e)
        return GenerationError(error=str(e), model=model, retryable=True)

    except Exception as e:
        logger.exception("Unexpected Claude error")
        return GenerationError(error=str(e), model=model, retryable=False)


# ============================================
# Groq Provider (Free — Llama, Mixtral, Gemma)
# ============================================

async def _generate_groq(
    system_prompt: str,
    user_prompt: str,
    model: str,
    max_tokens: int = 500,
    temperature: float = 0.7,
) -> GenerationResult | GenerationError:
    """Generate message using Groq API (OpenAI-compatible)."""
    client = AsyncGroq(api_key=settings.groq_api_key)

    start_time = time.time()
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        latency_ms = int((time.time() - start_time) * 1000)

        content = response.choices[0].message.content or ""
        usage = response.usage

        input_tokens = usage.prompt_tokens if usage else 0
        output_tokens = usage.completion_tokens if usage else 0

        return GenerationResult(
            content=content.strip(),
            word_count=len(content.split()),
            model=model,
            metadata={
                "provider": "groq",
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": (usage.total_tokens if usage else 0),
                "latency_ms": latency_ms,
                "cost_usd": 0.0,  # Groq is free
                "temperature": temperature,
            },
        )

    except Exception as e:
        logger.exception("Groq API error")
        retryable = "rate" in str(e).lower() or "limit" in str(e).lower()
        return GenerationError(error=str(e), model=model, retryable=retryable)


# ============================================
# Unified Generator
# ============================================

async def generate_message(
    system_prompt: str,
    user_prompt: str,
    model: str | None = None,
    max_tokens: int = 500,
    temperature: float = 0.7,
) -> GenerationResult | GenerationError:
    """
    Generate a message using the appropriate AI provider.

    Auto-detects provider from model name.
    Falls back to default model if not specified.

    Args:
        system_prompt: System instructions (persona, rules)
        user_prompt: User message with contact variables filled in
        model: Model name (auto-detects provider). None → use default.
        max_tokens: Max output tokens
        temperature: Creativity (0.0 = deterministic, 1.0 = creative)

    Returns:
        GenerationResult on success, GenerationError on failure
    """
    model = model or get_default_model()

    logger.info("Generating message with model=%s", model)

    if _is_openai_model(model):
        return await _generate_openai(system_prompt, user_prompt, model, max_tokens, temperature)
    elif _is_claude_model(model):
        return await _generate_claude(system_prompt, user_prompt, model, max_tokens, temperature)
    elif _is_groq_model(model):
        return await _generate_groq(system_prompt, user_prompt, model, max_tokens, temperature)
    else:
        # Default to Groq for unknown models (free)
        logger.warning("Unknown model '%s', defaulting to Groq provider", model)
        return await _generate_groq(system_prompt, user_prompt, model, max_tokens, temperature)


async def generate_cold_message(
    system_prompt: str,
    user_prompt: str,
    model: str | None = None,
) -> GenerationResult | GenerationError:
    """Generate a cold outreach message (higher creativity, max 200 characters)."""
    return await generate_message(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        model=model,
        max_tokens=150,   # plenty for max 200 characters
        temperature=0.8,  # More creative for outreach
    )


async def generate_followup_message(
    system_prompt: str,
    user_prompt: str,
    model: str | None = None,
) -> GenerationResult | GenerationError:
    """Generate a follow-up message (lower creativity, 200-300 words)."""
    return await generate_message(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        model=model,
        max_tokens=600,   # ~200-300 words
        temperature=0.6,  # More focused for follow-ups
    )
