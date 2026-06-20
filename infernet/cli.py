from __future__ import annotations

import argparse
import os

import trio

from infernet.adapters.base import AgentAdapter
from infernet.adapters.ollama_adapter import OllamaAdapter
from infernet.adapters.openclaw_adapter import OpenClawAdapter
from infernet.config import MonadConfig
from infernet.runner import run_runner


def _build_adapter(backend: str, model: str) -> AgentAdapter:
    if backend == "ollama":
        return OllamaAdapter(model=model)
    if backend == "openclaw":
        return OpenClawAdapter(model=model, token=os.environ.get("OPENCLAW_TOKEN"))
    raise ValueError(f"Unsupported backend: {backend}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Expose a local agent on InferNet")
    parser.add_argument("command", choices=["serve"], nargs="?", default="serve")
    parser.add_argument("--name", default="infernet-agent")
    parser.add_argument("--model", default="llama3.2")
    parser.add_argument(
        "--backend",
        choices=["ollama", "openclaw"],
        default="ollama",
    )
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--price", default=os.environ.get("INFR_PRICE_PER_CALL", "0"))
    parser.add_argument("--wallet", default=os.environ.get("RUNNER_WALLET", ""))
    parser.add_argument(
        "--token",
        default=os.environ.get("INFR_CONTRACT", MonadConfig.from_env().infr_contract),
    )
    parser.add_argument("--manifest", default="manifests/agent.json")
    args = parser.parse_args()

    if args.command != "serve":
        raise SystemExit(f"Unsupported command: {args.command}")

    adapter = _build_adapter(args.backend, args.model)

    async def _main() -> None:
        await run_runner(
            adapter,
            agent_id=args.name,
            model=args.model,
            port=args.port,
            price_per_call=args.price,
            price_token=args.token,
            wallet=args.wallet,
            manifest_path=args.manifest,
        )

    trio.run(_main)


if __name__ == "__main__":
    main()
