from __future__ import annotations

import secrets
from typing import Any

import trio
from libp2p.crypto.secp256k1 import create_new_key_pair
from libp2p.peer.peerinfo import info_from_p2p_addr
from libp2p import new_host
import multiaddr

from decimal import Decimal

from infernet.adapters.base import AgentAdapter
from infernet.exceptions import PaymentVerificationError
from infernet.manifest import Manifest
from infernet.payment import payment_required, verify_infr_payment
from infernet.p2p import (
    MANIFEST_PROTOCOL,
    create_host,
    register_handler,
    send_request,
)
from infernet.protocol import PROTOCOL_ID


def build_manifest(
    *,
    agent_id: str,
    model: str,
    adapter: AgentAdapter,
    port: int,
    peer_id: str,
    listen_addrs: list[Any],
    price_per_call: str = "0",
    price_token: str = "",
    wallet: str = "",
    agent_type: str = "general",
) -> Manifest:
    optimal = str(listen_addrs[0]) if listen_addrs else f"/ip4/127.0.0.1/tcp/{port}"
    multiaddr_str = f"{optimal}/p2p/{peer_id}"
    backend = adapter.__class__.__name__.replace("Adapter", "").lower()

    return Manifest(
        agent_id=agent_id,
        model=model,
        agent_type=agent_type,
        price_per_call=price_per_call,
        price_token=price_token,
        wallet=wallet,
        endpoint=multiaddr_str,
        multiaddr=multiaddr_str,
        backend=backend,
    )


async def run_runner(
    adapter: AgentAdapter,
    *,
    agent_id: str,
    model: str,
    port: int = 0,
    price_per_call: str = "0",
    price_token: str = "",
    wallet: str = "",
    agent_type: str = "general",
    manifest_path: str | None = None,
) -> None:
    host, listen_addrs, port = create_host(port)
    peer_id = host.get_id().to_string()

    manifest = build_manifest(
        agent_id=agent_id,
        model=model,
        adapter=adapter,
        port=port,
        peer_id=peer_id,
        listen_addrs=listen_addrs,
        price_per_call=price_per_call,
        price_token=price_token,
        wallet=wallet,
        agent_type=agent_type,
    )

    if manifest_path:
        manifest.save(manifest_path)

    async def infer_handler(request: dict[str, Any], _stream) -> dict[str, Any]:
        task = request.get("task", "")
        max_tokens = int(request.get("max_tokens", 512))
        payment_tx = request.get("payment_tx", "")

        if payment_required(manifest):
            if not payment_tx:
                return {
                    "error": "payment_required",
                    "message": (
                        f"Send {manifest.price_per_call} INFR to {manifest.wallet} "
                        "on Monad testnet and include payment_tx."
                    ),
                }
            try:
                await trio.to_thread.run_sync(
                    verify_infr_payment,
                    payment_tx,
                    expected_recipient=manifest.wallet,
                    min_amount=manifest.price_per_call,
                    token_contract=manifest.price_token,
                )
            except PaymentVerificationError as exc:
                return {
                    "error": "payment_invalid",
                    "message": str(exc),
                }

        result = adapter.infer(task, max_tokens=max_tokens)
        return {
            "output": result.output,
            "tokens_used": result.tokens_used,
            "agent_id": manifest.agent_id,
            "runner_peer_id": peer_id,
            "payment_tx": payment_tx,
        }

    async def manifest_handler(_request: dict[str, Any], _stream) -> dict[str, Any]:
        return manifest.model_dump()

    register_handler(host, PROTOCOL_ID, infer_handler)
    register_handler(host, MANIFEST_PROTOCOL, manifest_handler)

    async with host.run(listen_addrs=listen_addrs), trio.open_nursery() as nursery:
        nursery.start_soon(host.get_peerstore().start_cleanup_task, 60)

        print(f"InferNet agent '{agent_id}' is live")
        print(f"Peer ID: {peer_id}")
        print(f"Backend: {manifest.backend}")
        print("Connect with:")
        for addr in listen_addrs:
            print(f"  {addr}/p2p/{peer_id}")
        print("\nManifest:")
        print(manifest.to_json())
        if manifest_path:
            print(f"\nSaved manifest to {manifest_path}")

        await trio.sleep_forever()
