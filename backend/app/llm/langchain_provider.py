"""LangChain adapter implementing MAREA's provider contract."""

import logging
from collections.abc import Sequence
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage

from app.llm.provider import LLMProvider, ProviderInvocationError
from app.llm.types import LLMRequest, LLMResponse, ProviderMetadata

logger = logging.getLogger(__name__)


class LangChainLLMProvider(LLMProvider):
    """Delegate a request to an injected LangChain chat model."""

    def __init__(self, model: BaseChatModel, metadata: ProviderMetadata) -> None:
        self._model = model
        self._metadata = metadata

    @property
    def metadata(self) -> ProviderMetadata:
        """Return the effective provider and model metadata."""

        return self._metadata

    def generate(self, request: LLMRequest) -> LLMResponse:
        """Invoke LangChain and normalize its message content to text."""

        try:
            message = self._model.invoke([HumanMessage(content=request.prompt)])
            return LLMResponse(
                text=_message_content_to_text(message),
                metadata=self.metadata,
            )
        except Exception as error:
            logger.error(
                "LLM provider invocation failed",
                extra={
                    "llm_provider": self.metadata.provider,
                    "llm_model": self.metadata.model,
                    "error_type": type(error).__name__,
                },
            )
            raise ProviderInvocationError(self.metadata) from error


def _message_content_to_text(message: BaseMessage) -> str:
    """Normalize LangChain text content without coupling callers to its shape."""

    content = message.content
    if isinstance(content, str):
        return content

    if isinstance(content, Sequence):
        fragments = [_content_block_to_text(block) for block in content]
        return "".join(fragment for fragment in fragments if fragment)

    raise TypeError("The LangChain model returned unsupported message content.")


def _content_block_to_text(block: str | dict[str, Any]) -> str:
    """Extract text from a supported LangChain content block."""

    if isinstance(block, str):
        return block
    if isinstance(block, dict) and isinstance(block.get("text"), str):
        return block["text"]
    return ""
