"""Reproducible, local evaluation runner with no implicit provider invocation."""

from __future__ import annotations

import json
from pathlib import Path

from app.evaluation.models import EvaluationCase, EvaluationResult
from app.guardrails.personal_facts import PersonalFactGuardrail
from app.prompts.builder import PromptBuilder
from app.prompts.models import GenerationContext

DEFAULT_DATASET_PATH = Path(__file__).resolve().parents[2] / "evaluations" / "guardrail_cases.json"
EVALUATOR_NAME = "local-rule-based-v1"


def load_evaluation_cases(path: Path = DEFAULT_DATASET_PATH) -> tuple[EvaluationCase, ...]:
    """Load versioned synthetic cases without making provider calls."""

    payload = json.loads(path.read_text(encoding="utf-8"))
    return tuple(
        EvaluationCase(
            case_id=item["case_id"],
            description=item["description"],
            context=GenerationContext.model_validate(item["context"]),
            candidate_output=item["candidate_output"],
            required_fragments=tuple(item.get("required_fragments", [])),
            forbidden_fragments=tuple(item.get("forbidden_fragments", [])),
            required_prompt_fragments=tuple(item.get("required_prompt_fragments", [])),
        )
        for item in payload["cases"]
    )


class EvaluationHarness:
    """Evaluate controlled outputs; provider use belongs to an explicit caller."""

    def __init__(
        self,
        guardrail: PersonalFactGuardrail | None = None,
        prompt_builder: PromptBuilder | None = None,
    ) -> None:
        self._guardrail = guardrail or PersonalFactGuardrail()
        self._prompt_builder = prompt_builder or PromptBuilder()

    def evaluate(
        self,
        case: EvaluationCase,
        output: str,
        *,
        provider: str,
        model: str,
    ) -> EvaluationResult:
        """Evaluate one output against deterministic local rules and expectations."""

        prompt = self._prompt_builder.build(case.context)
        trace = prompt.trace
        prompt_text = "\n".join(str(message.content) for message in prompt.request.messages)
        reasons = self._reasons(case, output, prompt_text)
        assessment = self._guardrail.assess(output, case.context)
        reasons.extend(f"guardrail:{finding.category}" for finding in assessment.findings)

        if not output.strip():
            status = "fail"
            reasons.append("empty_output")
        elif reasons:
            status = "flag"
        else:
            status = "pass"

        return EvaluationResult(
            case_id=case.case_id,
            prompt_version=trace.prompt_version,
            provider=provider,
            model=model,
            platform=case.context.platform,
            evaluator=EVALUATOR_NAME,
            status=status,
            reason="; ".join(reasons) if reasons else "Cumple las reglas locales.",
            review_required=status != "pass",
        )

    def evaluate_controlled_cases(
        self,
        cases: tuple[EvaluationCase, ...],
    ) -> tuple[EvaluationResult, ...]:
        """Run the dataset's synthetic outputs without accessing a configured provider."""

        return tuple(
            self.evaluate(
                case,
                case.candidate_output,
                provider="controlled-fixture",
                model="not-invoked",
            )
            for case in cases
        )

    @staticmethod
    def _reasons(case: EvaluationCase, output: str, prompt_text: str) -> list[str]:
        normalized_output = output.casefold()
        normalized_prompt = prompt_text.casefold()
        reasons = [
            f"missing_required:{fragment}"
            for fragment in case.required_fragments
            if fragment.casefold() not in normalized_output
        ]
        reasons.extend(
            f"forbidden_fragment:{fragment}"
            for fragment in case.forbidden_fragments
            if fragment.casefold() in normalized_output
        )
        reasons.extend(
            f"missing_prompt_instruction:{fragment}"
            for fragment in case.required_prompt_fragments
            if fragment.casefold() not in normalized_prompt
        )
        return reasons
