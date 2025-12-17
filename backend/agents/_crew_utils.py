# backend/agents/_crew_utils.py
import json
import logging
from typing import Any

logger = logging.getLogger("crew_utils")
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
logger.addHandler(handler)


def extract_crew_text(result: Any) -> str:
    """
    Robustly extract human-readable text from a CrewAI result object.
    Tries many common attribute names and dict-like fallbacks.
    Always returns a string.
    """
    # Helper to convert possibly-structured objects to string
    def safe_to_str(x):
        try:
            if isinstance(x, (dict, list)):
                return json.dumps(x, indent=2, ensure_ascii=False)
            return str(x)
        except Exception:
            return repr(x)

    # 1) If tasks_output exists and is non-empty, inspect first item
    if hasattr(result, "tasks_output"):
        try:
            tasks_out = result.tasks_output
            if tasks_out:
                first = tasks_out[0]
                # Try common attributes on the task output object
                for attr in ("output", "text", "content", "result", "response", "message", "answer", "body"):
                    if hasattr(first, attr):
                        return safe_to_str(getattr(first, attr))
                # If it's dict-like
                try:
                    fd = first.__dict__
                    for k in ("output", "text", "content", "result", "response", "message", "answer"):
                        if k in fd:
                            return safe_to_str(fd[k])
                except Exception:
                    pass
                # try JSON / to_dict
                for fn in ("json", "to_dict", "dict", "as_dict"):
                    try:
                        if hasattr(first, fn):
                            val = getattr(first, fn)()
                            return safe_to_str(val)
                    except Exception:
                        pass
                # last resort: string representation of first
                return safe_to_str(first)
        except Exception as e:
            logger.debug("Error inspecting tasks_output: %s", e)

    # 2) If result has top-level attributes
    for attr in ("output", "text", "content", "result", "response", "message", "answer", "json_dict"):
        if hasattr(result, attr):
            try:
                val = getattr(result, attr)
                return safe_to_str(val)
            except Exception:
                pass

    # 3) If result appears dict-like
    try:
        rd = getattr(result, "__dict__", None)
        if rd:
            for k in ("output", "text", "content", "result", "response", "message", "answer", "tasks_output"):
                if k in rd:
                    return safe_to_str(rd[k])
    except Exception:
        pass

    # 4) If result has .to_dict() or .json()
    for fn in ("to_dict", "dict", "as_dict", "json"):
        try:
            if hasattr(result, fn):
                maybe = getattr(result, fn)()
                return safe_to_str(maybe)
        except Exception:
            pass

    # 5) As a final fallback, return repr(result)
    try:
        return safe_to_str(result)
    except Exception:
        return "<unextractable-crew-result>"
