from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class AgentResponse:
    output: str
    tokens_used: int = 0


class AgentAdapter(ABC):
    """Wrap any local agent backend behind a single infer() call."""

    @abstractmethod
    def infer(self, task: str, max_tokens: int = 512) -> AgentResponse:
        raise NotImplementedError
