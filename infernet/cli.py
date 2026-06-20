from __future__ import annotations

import argparse
import json
import os

import trio

from infernet.adapters.base import AgentAdapter
from infernet.adapters.ollama_adapter import OllamaAdapter
from infernet.adapters.openclaw_adapter import OpenClawAdapter
from infernet.config import MonadConfig
from infernet.erc8004 import (
    attach_registration_to_manifest,
    build_agent_registration,
    register_agent,
    registration_to_data_uri,
    verify_agent_registration,
)
from infernet.client import Client
from infernet.exceptions import PaymentError
from infernet.manifest import Manifest
from infernet.platform import publish_from_file
from infernet.runner import run_runner


def _build_adapter(backend: str, model: str) -> AgentAdapter:
    if backend == "ollama":
        return OllamaAdapter(model=model)
    if backend == "openclaw":
        return OpenClawAdapter(model=model, token=os.environ.get("OPENCLAW_TOKEN"))
    raise ValueError(f"Unsupported backend: {backend}")


def _cmd_register(args: argparse.Namespace) -> None:
    manifest = Manifest.from_source(args.manifest)
    if args.dry_run:
        cfg = MonadConfig.from_env()
        registration = build_agent_registration(
            manifest,
            chain_id=cfg.chain_id,
            identity_registry=os.environ.get(
                "ERC8004_IDENTITY_REGISTRY",
                "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
            ),
            description=args.description or manifest.description,
            image=args.image or manifest.image,
        )
        print(json.dumps(registration, indent=2))
        print("\nData URI (first 120 chars):")
        uri = registration_to_data_uri(registration)
        print(uri[:120] + ("..." if len(uri) > 120 else ""))
        return

    result = register_agent(
        manifest,
        description=args.description or manifest.description,
        image=args.image or manifest.image,
    )
    updated = attach_registration_to_manifest(
        manifest,
        result,
        chain_id=MonadConfig.from_env().chain_id,
    )
    if args.out:
        updated.save(args.out)
    print(f"Registered ERC-8004 agent #{result.agent_id}")
    print(f"Tx: {result.tx_hash}")
    print(f"Registry: {updated.erc8004_registry}")
    if args.out:
        print(f"Updated manifest: {args.out}")


def _cmd_verify(args: argparse.Namespace) -> None:
    manifest = Manifest.from_source(args.manifest)
    verify_agent_registration(manifest)
    print(f"Verified ERC-8004 agent #{manifest.erc8004_agent_id}")


def _cmd_publish(args: argparse.Namespace) -> None:
    source = args.manifest or args.source
    if not source:
        raise SystemExit("Provide --manifest or --source")
    result = publish_from_file(source, peer_id=args.peer_id)
    print(f"Published {result['agent_id']} → {result.get('url', 'platform')}")


def _cmd_call(args: argparse.Namespace) -> None:
    if args.agent_id:
        client = Client.from_agent(
            args.agent_id,
            payment_tx=args.payment_tx,
            platform_url=args.platform_url,
        )
    elif args.manifest:
        client = Client.from_manifest(args.manifest, payment_tx=args.payment_tx)
    elif args.multiaddr:
        client = Client.from_multiaddr(args.multiaddr, payment_tx=args.payment_tx)
    else:
        raise SystemExit("Provide an agent id, --manifest, or --multiaddr")

    try:
        result = client.infer(
            args.task,
            max_tokens=args.max_tokens,
            auto_pay=not args.no_auto_pay,
        )
    except PaymentError as exc:
        raise SystemExit(str(exc)) from exc

    print(json.dumps(result.__dict__, indent=2))


def _cmd_serve(args: argparse.Namespace) -> None:
    adapter = _build_adapter(args.backend, args.model)

    async def _main() -> None:
        if args.publish:
            os.environ["PUBLISH_TO_PLATFORM"] = "1"
        await run_runner(
            adapter,
            agent_id=args.name,
            model=args.model,
            port=args.port,
            price_per_call=args.price,
            price_token=args.token,
            wallet=args.wallet,
            manifest_path=args.manifest,
            register_erc8004=args.register_erc8004,
            require_erc8004=args.require_erc8004,
            stake_amount=args.stake,
        )

    trio.run(_main)


def main() -> None:
    parser = argparse.ArgumentParser(description="InferNet — share and verify libp2p agents")
    sub = parser.add_subparsers(dest="command", required=True)

    serve = sub.add_parser("serve", help="Expose a local agent on libp2p")
    serve.add_argument("--name", default="infernet-agent")
    serve.add_argument("--model", default="llama3.2")
    serve.add_argument("--backend", choices=["ollama", "openclaw"], default="ollama")
    serve.add_argument("--port", type=int, default=0)
    serve.add_argument("--price", default=os.environ.get("INFR_PRICE_PER_CALL", "0"))
    serve.add_argument("--wallet", default=os.environ.get("RUNNER_WALLET", ""))
    serve.add_argument(
        "--token",
        default=os.environ.get("INFR_CONTRACT", MonadConfig.from_env().infr_contract),
    )
    serve.add_argument("--manifest", default="manifests/agent.json")
    serve.add_argument(
        "--register-erc8004",
        action="store_true",
        help="Mint ERC-8004 identity on startup (requires AGENT_OWNER_PRIVATE_KEY)",
    )
    serve.add_argument(
        "--require-erc8004",
        action="store_true",
        help="Verify ERC-8004 identity on-chain before serving",
    )
    serve.add_argument(
        "--stake",
        default=os.environ.get("AGENT_STAKE", ""),
        help="Lock a native MON bond for this agent before listing "
        "(requires AGENT_STAKING_CONTRACT + AGENT_OWNER_PRIVATE_KEY)",
    )
    serve.add_argument(
        "--publish",
        action="store_true",
        help="List agent on InferNet platform (requires INFERNET_PLATFORM_URL)",
    )
    serve.set_defaults(func=_cmd_serve)

    call = sub.add_parser("call", help="Call a listed agent by its platform id")
    call.add_argument(
        "agent_id",
        nargs="?",
        help="Agent id copied from the InferNet platform listing",
    )
    call.add_argument("--task", required=True, help="Prompt or task for the agent")
    call.add_argument("--max-tokens", type=int, default=512)
    call.add_argument(
        "--platform-url",
        default=None,
        help="Platform base URL (defaults to INFERNET_PLATFORM_URL)",
    )
    call.add_argument("--manifest", help="Manifest URL or path (instead of agent id)")
    call.add_argument("--multiaddr", help="Runner multiaddr (instead of agent id)")
    call.add_argument(
        "--payment-tx",
        default="",
        help="Existing INFR payment tx hash on Monad testnet",
    )
    call.add_argument(
        "--no-auto-pay",
        action="store_true",
        help="Do not send INFR automatically; require --payment-tx",
    )
    call.set_defaults(func=_cmd_call)

    publish = sub.add_parser("publish", help="List an agent on the InferNet platform")
    publish.add_argument("--manifest", help="Manifest JSON path")
    publish.add_argument("--source", help="Manifest URL or path (alias for --manifest)")
    publish.add_argument("--peer-id", default="")
    publish.set_defaults(func=_cmd_publish)

    register = sub.add_parser("register", help="Register an agent on ERC-8004 Identity Registry")
    register.add_argument("--manifest", required=True, help="InferNet manifest JSON path or URL")
    register.add_argument("--out", help="Write updated manifest with erc8004_* fields")
    register.add_argument("--description", default="")
    register.add_argument("--image", default="")
    register.add_argument(
        "--dry-run",
        action="store_true",
        help="Print agent card JSON without sending a transaction",
    )
    register.set_defaults(func=_cmd_register)

    verify = sub.add_parser("verify", help="Verify manifest against ERC-8004 registry")
    verify.add_argument("--manifest", required=True)
    verify.set_defaults(func=_cmd_verify)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
