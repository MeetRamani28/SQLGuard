import logging
import os
import time
import concurrent.futures
from typing import Any, Optional

logger = logging.getLogger("sqlguard.telemetry")

_tt_client = None
_telemetry_executor = concurrent.futures.ThreadPoolExecutor(max_workers=2, thread_name_prefix="sqlguard_telemetry")

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
    model: str = "llama-3.3-70b-versatile",
    provider: str = "groq",
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    duration_ms: float = 0.0,
    metadata: Optional[dict[str, Any]] = None,
    trace_id: Optional[str] = None,
    status: str = "ok",
    error_message: Optional[str] = None,
) -> None:
    """Safely record an LLM span to TokenTrail asynchronously in background thread without blocking main request."""
    def _bg_record():
        try:
            client = get_telemetry_client()
            if not client:
                return

            with client.span(name=name, type="llm", trace_id=trace_id, metadata=metadata, model=model, provider=provider) as span:
                span.input = str(prompt_input) if prompt_input else ""
                span.output = str(output_text) if output_text else ""
                if hasattr(span, "set_tokens"):
                    span.set_tokens(prompt=int(prompt_tokens), completion=int(completion_tokens))
                else:
                    span.prompt_tokens = int(prompt_tokens)
                    span.completion_tokens = int(completion_tokens)
                if hasattr(span, "set_duration"):
                    span.set_duration(max(1.0, float(duration_ms)))
                else:
                    span.duration_ms = max(1.0, float(duration_ms))
                span.status = status
                span.error_message = error_message
        except Exception as e:
            logger.debug("Failed to record TokenTrail telemetry span: %s", e)

    _telemetry_executor.submit(_bg_record)


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
    """Safely record a non-LLM span asynchronously in background thread without blocking main request."""
    def _bg_record():
        try:
            client = get_telemetry_client()
            if not client:
                return

            with client.span(name=name, type=span_type, trace_id=trace_id, metadata=metadata) as span:
                span.input = str(input_text) if input_text is not None else ""
                span.output = str(output_text) if output_text is not None else ""
                if hasattr(span, "set_duration"):
                    span.set_duration(max(1.0, float(duration_ms)))
                else:
                    span.duration_ms = max(1.0, float(duration_ms))
                span.status = status
                span.error_message = error_message
        except Exception as e:
            logger.debug("Failed to record TokenTrail telemetry generic span: %s", e)

    _telemetry_executor.submit(_bg_record)


def flush_telemetry(timeout: float = 0.5) -> None:
    """Flush pending telemetry spans asynchronously in background thread without blocking main request."""
    def _bg_flush():
        try:
            client = get_telemetry_client()
            if client:
                client.flush(timeout=timeout)
        except Exception as e:
            logger.debug("Failed to flush TokenTrail telemetry: %s", e)

    _telemetry_executor.submit(_bg_flush)

