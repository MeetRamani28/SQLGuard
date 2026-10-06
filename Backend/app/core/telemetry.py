"""
SQLGuard Telemetry Engine powered by TokenTrail.
Provides zero-overhead, non-blocking observability for Text-to-SQL agents.
Strict zero-raise policy: if TokenTrail is unreachable or unconfigured,
SQLGuard execution continues with 0 latency impact and 0 errors.
"""
import logging
import os
import time
from typing import Any, Optional

logger = logging.getLogger("sqlguard.telemetry")

_tt_client = None


def get_telemetry_client():
    global _tt_client
    if _tt_client is not None:
        return _tt_client

    api_key = os.getenv("TOKENTRAIL_API_KEY")
    endpoint = os.getenv("TOKENTRAIL_ENDPOINT", "https://tokentrail-backend.onrender.com")

    if not api_key:
        return None

    try:
        from tokentrail import TokenTrail
        _tt_client = TokenTrail(api_key=api_key, endpoint=endpoint)
        logger.info("TokenTrail telemetry initialized successfully for SQLGuard.")
        return _tt_client
    except Exception as e:
        logger.debug("TokenTrail client initialization skipped: %s", e)
        return None


def record_llm_span(
    name: str,
    prompt_input: str,
    output_text: str,
    model: str = "openai/gpt-oss-20b",
    provider: str = "groq",
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    duration_ms: float = 0.0,
    metadata: Optional[dict[str, Any]] = None,
    trace_id: Optional[str] = None,
    status: str = "ok",
    error_message: Optional[str] = None,
) -> None:
    """Safely record an LLM span to TokenTrail without blocking or throwing exceptions."""
    try:
        client = get_telemetry_client()
        if not client:
            return

        with client.span(name=name, type="llm", trace_id=trace_id, metadata=metadata) as span:
            span.input = str(prompt_input) if prompt_input else ""
            span.output = str(output_text) if output_text else ""
            span.model = model
            span.provider = provider
            span.prompt_tokens = prompt_tokens
            span.completion_tokens = completion_tokens
            span.duration_ms = duration_ms
            span.status = status
            span.error_message = error_message
    except Exception as e:
        logger.debug("Failed to record TokenTrail telemetry span: %s", e)


def record_span(
    name: str,
    span_type: str = "tool",
    input_text: Optional[str] = None,
    output_text: Optional[str] = None,
    duration_ms: float = 0.0,
    trace_id: Optional[str] = None,
    status: str = "ok",
    error_message: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    """Safely record a non-LLM span (tool, retrieval, AST guard, db query) to TokenTrail."""
    try:
        client = get_telemetry_client()
        if not client:
            return

        with client.span(name=name, type=span_type, trace_id=trace_id, metadata=metadata) as span:
            span.input = str(input_text) if input_text is not None else ""
            span.output = str(output_text) if output_text is not None else ""
            span.duration_ms = duration_ms
            span.status = status
            span.error_message = error_message
    except Exception as e:
        logger.debug("Failed to record TokenTrail telemetry generic span: %s", e)


def flush_telemetry(timeout: float = 2.0) -> None:
    """Flush pending telemetry spans safely."""
    try:
        client = get_telemetry_client()
        if client:
            client.flush(timeout=timeout)
    except Exception as e:
        logger.debug("Failed to flush TokenTrail telemetry: %s", e)

