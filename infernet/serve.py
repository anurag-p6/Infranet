from __future__ import annotations

import os
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import trio

from infernet.adapters.base import AgentAdapter
from infernet.adapters.callable_adapter import CallableAdapter
from infernet.adapters.ollama_adapter import OllamaAdapter
from infernet.adapters.openclaw_adapter import OpenClawAdapter
from infernet.config import MonadConfig
from infernet.runner import run_runner


def _payment_defaults() -> tuple[str, str, str]:
    cfg = MonadConfig.from_env()
    wallet = os.environ.get("RUNNER_WALLET", "")
    token = os.environ.get("INFR_CONTRACT", cfg.infr_contract)
    price = os.environ.get("INFR_PRICE_PER_CALL", "0")
    return price, token, wallet


def _adapter_from_backend(
    backend: str,
    *,
    model: str,
    fn: Callable[[str, int], str] | None = None,
) -> AgentAdapter:
    if backend == "callable":
        if fn is None:
            raise ValueError("Callable backend requires a function")
        return CallableAdapter(fn)

    if backend == "ollama":
        return OllamaAdapter(model=model)

    if backend == "openclaw":
        token = os.environ.get("OPENCLAW_TOKEN")
        return OpenClawAdapter(model=model, token=token)

    raise ValueError(f"Unsupported backend: {backend}")


@dataclass
class ServedAgent:
    name: str
    model: str
    adapter: AgentAdapter
    price_per_call: str = "0"
    price_token: str = ""
    wallet: str = ""
    agent_type: str = "general"
    port: int = 0
    manifest_path: str | None = None
    stake_amount: str = ""

    def serve(self) -> None:
        async def _main() -> None:
            await run_runner(
                self.adapter,
                agent_id=self.name,
                model=self.model,
                port=self.port,
                price_per_call=self.price_per_call,
                price_token=self.price_token,
                wallet=self.wallet,
                agent_type=self.agent_type,
                manifest_path=self.manifest_path,
                register_erc8004=os.environ.get("REGISTER_ERC8004", "").lower()
                in {"1", "true", "yes"},
                stake_amount=self.stake_amount or os.environ.get("AGENT_STAKE", ""),
            )

        trio.run(_main)


def serve_agent(
    *,
    name: str,
    model: str = "custom",
    adapter: AgentAdapter | None = None,
    backend: str = "callable",
    price_per_call: str = "0",
    price_token: str = "",
    wallet: str = "",
    agent_type: str = "general",
    port: int = 0,
    manifest_path: str | None = None,
    stake_amount: str = "",
) -> Callable[[Callable[[str, int], str]], ServedAgent]:
    """Decorator to expose a Python function as a shared libp2p agent."""

    def decorator(fn: Callable[[str, int], str]) -> ServedAgent:
        default_price, default_token, default_wallet = _payment_defaults()
        resolved = adapter or _adapter_from_backend(backend, model=model, fn=fn)
        final_price = price_per_call if price_per_call != "0" else default_price
        return ServedAgent(
            name=name,
            model=model,
            adapter=resolved,
            price_per_call=final_price,
            price_token=price_token or default_token,
            wallet=wallet or default_wallet,
            agent_type=agent_type,
            port=port,
            manifest_path=manifest_path,
            stake_amount=stake_amount or os.environ.get("AGENT_STAKE", ""),
        )

    return decorator
