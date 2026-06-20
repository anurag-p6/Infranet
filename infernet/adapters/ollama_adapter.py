from __future__ import annotations

import httpx

from infernet.adapters.base import AgentAdapter, AgentResponse


class OllamaAdapter(AgentAdapter):
    """Call a local Ollama model."""

    def __init__(
        self,
        model: str = "llama3.2",
        base_url: str = "http://127.0.0.1:11434",
    ) -> None:
        self.model = model
        self.base_url = base_url.rstrip("/")

    def infer(self, task: str, max_tokens: int = 512) -> AgentResponse:
        payload = {
            "model": self.model,
            "prompt": task,
            "stream": False,
            "options": {"num_predict": max_tokens},
        }
        with httpx.Client(timeout=120.0) as client:
            response = client.post(f"{self.base_url}/api/generate", json=payload)
            response.raise_for_status()
            data = response.json()

        output = data.get("response", "")
        tokens_used = data.get("eval_count") or max(1, len(output.split()))
        return AgentResponse(output=output, tokens_used=int(tokens_used))
