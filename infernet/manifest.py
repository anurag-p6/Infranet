from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from pydantic import BaseModel, Field


class Manifest(BaseModel):
    agent_id: str
    model: str
    agent_type: str = "general"
    price_per_call: str = "0"
    price_token: str = ""
    wallet: str = ""
    endpoint: str = ""
    multiaddr: str = ""
    protocol: str = "/infernet/agent/1.0.0"
    backend: str = "custom"
    tools: list[str] = Field(default_factory=list)
    description: str = ""
    image: str = ""
    erc8004_agent_id: str = ""
    erc8004_registry: str = ""
    erc8004_tx: str = ""
    stake_amount: str = ""
    stake_tx: str = ""
    staker: str = ""

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.model_dump(), indent=indent)

    def save(self, path: str | Path) -> None:
        Path(path).write_text(self.to_json(), encoding="utf-8")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Manifest:
        return cls.model_validate(data)

    @classmethod
    def from_json(cls, text: str) -> Manifest:
        return cls.from_dict(json.loads(text))

    @classmethod
    def from_file(cls, path: str | Path) -> Manifest:
        return cls.from_json(Path(path).read_text(encoding="utf-8"))

    @classmethod
    def from_url(cls, url: str, timeout: float = 10.0) -> Manifest:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            raise ValueError(f"Unsupported manifest URL scheme: {parsed.scheme}")

        with httpx.Client(timeout=timeout) as client:
            response = client.get(url)
            response.raise_for_status()
            return cls.from_json(response.text)

    @classmethod
    def from_source(cls, source: str, timeout: float = 10.0) -> Manifest:
        if source.startswith(("http://", "https://")):
            return cls.from_url(source, timeout=timeout)
        return cls.from_file(source)
