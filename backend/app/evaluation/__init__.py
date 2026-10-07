"""Local, opt-in evaluation utilities kept separate from the test suite."""

from app.evaluation.runner import EvaluationHarness, load_evaluation_cases

__all__ = ["EvaluationHarness", "load_evaluation_cases"]
