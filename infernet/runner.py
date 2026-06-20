from __future__ import annotations

from decimal import Decimal
from typing import Any

import trio

from infernet.adapters.base import AgentAdapter
from infernet.config import MonadConfig
from infernet.exceptions import PaymentVerificationError
from infernet.manifest import Manifest
from infernet.payment import payment_required, verify_infr_payment
from infernet.erc8004 import (
    attach_registration_to_manifest,
    register_agent,
    registration_required,
    verify_agent_registration,
)
from infernet.platform import (
    PlatformConfig,
    heartbeat_manifest,
    publish_manifest,
    should_publish_to_platform,
)
from infernet.staking import (
    attach_stake_info_to_manifest,
    attach_stake_to_manifest,
    get_stake,
    stake_agent,
)
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
    register_erc8004: bool = False,
    require_erc8004: bool = False,
    stake_amount: str = "",
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

    if stake_amount and Decimal(stake_amount) > 0:
        existing = await trio.to_thread.run_sync(get_stake, agent_id)
        if existing.active:
            manifest = attach_stake_info_to_manifest(manifest, existing)
            print(f"\nAgent already bonded: {existing.amount_mon} MON staked")
        else:
            result = await trio.to_thread.run_sync(
                stake_agent, agent_id, stake_amount
            )
            manifest = attach_stake_to_manifest(manifest, result)
            print(f"\nStaked {result.amount_mon} MON bond for '{agent_id}'")
            print(f"Stake tx: {result.tx_hash}")
        if manifest_path:
            manifest.save(manifest_path)

    if register_erc8004 and not manifest.erc8004_agent_id:
        result = await trio.to_thread.run_sync(register_agent, manifest)
        manifest = attach_registration_to_manifest(
            manifest,
            result,
            chain_id=MonadConfig.from_env().chain_id,
        )
        if manifest_path:
            manifest.save(manifest_path)
        print(f"\nERC-8004 registered: agent #{result.agent_id}")
        print(f"Registry tx: {result.tx_hash}")

    if require_erc8004 or registration_required(manifest):
        await trio.to_thread.run_sync(verify_agent_registration, manifest)
        print("ERC-8004 identity verified on-chain")

    platform_cfg = PlatformConfig.from_env()
    listing_url = ""

    if should_publish_to_platform():
        try:
            result = await trio.to_thread.run_sync(
                publish_manifest, manifest, peer_id=peer_id
            )
            rel = result.get("url", f"/agents/{manifest.agent_id}")
            if rel.startswith("http"):
                listing_url = rel
            elif platform_cfg:
                listing_url = f"{platform_cfg.base_url}{rel}"
            else:
                listing_url = rel
            print(f"Listed on platform: {listing_url}")
        except Exception as exc:
            print(f"Platform publish skipped: {exc}")
    elif platform_cfg:
        # Platform URL is known but auto-publish is off — show where it would list.
        listing_url = f"{platform_cfg.base_url}/agents/{manifest.agent_id}"

    async def heartbeat_loop() -> None:
        if not should_publish_to_platform():
            return
        while True:
            await trio.sleep(60)
            try:
                await trio.to_thread.run_sync(
                    heartbeat_manifest,
                    manifest.agent_id,
                    multiaddr=manifest.multiaddr,
                    peer_id=peer_id,
                )
            except Exception:
                pass

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
        nursery.start_soon(heartbeat_loop)

        print(f"InferNet agent '{agent_id}' is live")
        print(f"Peer ID: {peer_id}")
        print(f"Backend: {manifest.backend}")
        print("Connect with:")
        for addr in listen_addrs:
            print(f"  {addr}/p2p/{peer_id}")

        print("\n" + "─" * 56)
        if listing_url and should_publish_to_platform():
            print("Your agent is published. View & share it here:")
            print(f"  {listing_url}")
        elif listing_url:
            print("Publish this agent to the platform:")
            print("  re-run with --publish (or set PUBLISH_TO_PLATFORM=1)")
            print(f"  it will be listed at: {listing_url}")
        else:
            print("Publish this agent to the platform:")
            print("  set INFERNET_PLATFORM_URL and re-run with --publish")
        print("─" * 56)

        print("\nManifest:")
        print(manifest.to_json())
        if manifest_path:
            print(f"\nSaved manifest to {manifest_path}")

        await trio.sleep_forever()
