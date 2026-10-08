"""Run controlled evaluations by default; --live is the explicit network opt-in."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.evaluation.runner import EvaluationHarness, load_evaluation_cases  # noqa: E402
from app.llm.factory import create_llm_provider  # noqa: E402
from app.prompts.builder import PromptBuilder  # noqa: E402


def parse_arguments() -> argparse.Namespace:
    """Keep real provider use opt-in instead of part of normal validation."""

    parser = argparse.ArgumentParser(description="Run MAREA's local evaluation dataset.")
    parser.add_argument(
        "--live",
        action="store_true",
        help="Invoke the configured provider. Omit to evaluate only controlled fixtures.",
    )
    parser.add_argument("--output", type=Path, help="Optional JSON output path.")
    return parser.parse_args()


def main() -> int:
    """Emit portable JSON results without persisting data by default."""

    arguments = parse_arguments()
    cases = load_evaluation_cases()
    harness = EvaluationHarness()

    if arguments.live:
        print("Live evaluation enabled: the configured provider may receive case prompts.", file=sys.stderr)
        provider = create_llm_provider(get_settings())
        prompt_builder = PromptBuilder()
        results = tuple(
            harness.evaluate(
                case,
                provider.generate(prompt_builder.build(case.context).request).text,
                provider=provider.metadata.provider,
                model=provider.metadata.model,
            )
            for case in cases
        )
    else:
        results = harness.evaluate_controlled_cases(cases)

    output = json.dumps([asdict(result) for result in results], ensure_ascii=False, indent=2)
    if arguments.output:
        arguments.output.write_text(output + "\n", encoding="utf-8")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
