from __future__ import annotations

import httpx

from infernet.adapters.base import AgentAdapter, AgentResponse


class HttpAdapter(AgentAdapter):
    """Call any OpenAI-compatible chat completions endpoint."""

    def __init__(
        self,
        model: str,
        base_url: str,
        api_key: str | None = None,
    ) -> None:
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def infer(self, task: str, max_tokens: int = 512) -> AgentResponse:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": task}],
            "max_tokens": max_tokens,
        }
        with httpx.Client(timeout=300.0) as client:
            response = client.post(
                f"{self.base_url}/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        choices = data.get("choices") or []
        if not choices:
            raise RuntimeError("HTTP adapter returned no choices")

        message = choices[0].get("message") or {}
        output = message.get("content", "")
        usage = data.get("usage") or {}
        tokens_used = usage.get("completion_tokens") or max(1, len(output.split()))
        return AgentResponse(output=output, tokens_used=int(tokens_used))
