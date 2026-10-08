"""Application-level errors for technical generation."""


class GenerationUnavailableError(RuntimeError):
    """Represent an unexpected generation failure safe to expose generically."""
