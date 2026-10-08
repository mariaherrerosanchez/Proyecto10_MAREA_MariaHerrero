"""Tests for deterministic local LLM-behaviour evaluation."""

from app.evaluation.runner import EvaluationHarness, load_evaluation_cases


def test_controlled_evaluation_dataset_is_versioned_and_reproducible() -> None:
    cases = load_evaluation_cases()
    results = EvaluationHarness().evaluate_controlled_cases(cases)

    assert len(cases) == 15
    assert [result.case_id for result in results] == [case.case_id for case in cases]
    assert {result.status for result in results} == {"pass", "flag", "fail"}
    assert all(result.provider == "controlled-fixture" for result in results)
    assert all(result.model == "not-invoked" for result in results)
    assert all(result.prompt_version == "v7" for result in results)


def test_controlled_evaluation_checks_linkedin_prompt_instructions() -> None:
    case = next(
        item for item in load_evaluation_cases() if item.case_id == "linkedin-editorial-instructions"
    )

    result = EvaluationHarness().evaluate(
        case,
        case.candidate_output,
        provider="controlled-fixture",
        model="not-invoked",
    )

    assert result.status == "pass"
    assert result.review_required is False


def test_controlled_evaluation_checks_instagram_prompt_instructions() -> None:
    case = next(
        item for item in load_evaluation_cases() if item.case_id == "instagram-editorial-instructions"
    )

    result = EvaluationHarness().evaluate(
        case,
        case.candidate_output,
        provider="controlled-fixture",
        model="not-invoked",
    )

    assert result.status == "pass"
    assert result.review_required is False


def test_controlled_evaluation_checks_facebook_editorial_instructions() -> None:
    case = next(
        item for item in load_evaluation_cases() if item.case_id == "facebook-editorial-instructions"
    )

    result = EvaluationHarness().evaluate(
        case,
        case.candidate_output,
        provider="controlled-fixture",
        model="not-invoked",
    )

    assert result.status == "pass"
    assert result.review_required is False


def test_controlled_evaluation_checks_blog_editorial_instructions() -> None:
    case = next(
        item for item in load_evaluation_cases() if item.case_id == "blog-editorial-instructions"
    )

    result = EvaluationHarness().evaluate(
        case,
        case.candidate_output,
        provider="controlled-fixture",
        model="not-invoked",
    )

    assert result.status == "pass"
    assert result.review_required is False


def test_controlled_evaluation_results_keep_required_comparison_metadata() -> None:
    case = load_evaluation_cases()[0]

    result = EvaluationHarness().evaluate(
        case,
        case.candidate_output,
        provider="example-provider",
        model="example-model",
    )

    assert result.case_id == case.case_id
    assert result.provider == "example-provider"
    assert result.model == "example-model"
    assert result.platform == "linkedin"
    assert result.evaluator == "local-rule-based-v1"
    assert result.status == "pass"
    assert result.review_required is False


def test_controlled_evaluation_flags_missing_instruction_for_human_review() -> None:
    case = next(
        item
        for item in load_evaluation_cases()
        if item.case_id == "missing-required-instruction"
    )

    result = EvaluationHarness().evaluate(
        case,
        case.candidate_output,
        provider="controlled-fixture",
        model="not-invoked",
    )

    assert result.status == "flag"
    assert result.review_required is True
    assert "missing_required" in result.reason


def test_controlled_evaluation_fails_empty_output_and_requires_review() -> None:
    case = next(item for item in load_evaluation_cases() if item.case_id == "empty-output")

    result = EvaluationHarness().evaluate(
        case,
        case.candidate_output,
        provider="controlled-fixture",
        model="not-invoked",
    )

    assert result.status == "fail"
    assert result.review_required is True
    assert result.reason == "empty_output"
