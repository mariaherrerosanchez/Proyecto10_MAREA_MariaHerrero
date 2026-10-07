"""Typed data used by the controlled local evaluation harness."""

from dataclasses import dataclass
from typing import Literal

from app.prompts.models import GenerationContext

EvaluationStatus = Literal["pass", "flag", "fail"]


@dataclass(frozen=True, slots=True)
class EvaluationCase:
    """One synthetic, versioned example with a deterministic reference output."""

    case_id: str
    description: str
    context: GenerationContext
    candidate_output: str
    required_fragments: tuple[str, ...]
    forbidden_fragments: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class EvaluationResult:
    """Portable result shape for local output and future observability adapters."""

    case_id: str
    prompt_version: str
    provider: str
    model: str
    platform: str
    evaluator: str
    status: EvaluationStatus
    reason: str
    review_required: bool
