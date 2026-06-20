from __future__ import annotations

from collections.abc import Callable

from infernet.adapters.base import AgentAdapter, AgentResponse


class CallableAdapter(AgentAdapter):
    """Wrap any Python function as an agent."""

    def __init__(self, fn: Callable[[str, int], str]) -> None:
        self._fn = fn

    def infer(self, task: str, max_tokens: int = 512) -> AgentResponse:
        output = self._fn(task, max_tokens)
        return AgentResponse(output=output, tokens_used=max(1, len(output.split())))
