from __future__ import annotations

import httpx

from infernet.adapters.base import AgentAdapter, AgentResponse


class OpenClawAdapter(AgentAdapter):
    """Call a locally running OpenClaw Gateway agent.

    Requires chat completions endpoint enabled in OpenClaw config:
    gateway.http.endpoints.chatCompletions.enabled = true
    """

    def __init__(
        self,
        model: str = "openclaw/default",
        base_url: str = "http://127.0.0.1:18789",
        token: str | None = None,
    ) -> None:
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.token = token

    def infer(self, task: str, max_tokens: int = 512) -> AgentResponse:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

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
            raise RuntimeError("OpenClaw returned no choices")

        message = choices[0].get("message") or {}
        output = message.get("content", "")
        usage = data.get("usage") or {}
        tokens_used = usage.get("completion_tokens") or max(1, len(output.split()))
        return AgentResponse(output=output, tokens_used=int(tokens_used))
