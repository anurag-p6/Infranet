from __future__ import annotations

import functools
from dataclasses import dataclass
from typing import Any

import multiaddr
import trio
from libp2p import new_host
from libp2p.crypto.secp256k1 import create_new_key_pair
from libp2p.peer.peerinfo import info_from_p2p_addr

from infernet.exceptions import AgentVerificationError, PaymentError, PaymentRequiredError
from infernet.manifest import Manifest
from infernet.payment import payment_required, send_infr_payment
from infernet.erc8004 import registration_required, verify_agent_registration
from infernet.p2p import MANIFEST_PROTOCOL, send_request
from infernet.protocol import PROTOCOL_ID
from infernet.registry import resolve_manifest


@dataclass
class InferResult:
    output: str
    tokens_used: int
    agent_id: str
    runner_peer_id: str
    payment_tx: str = ""


class Client:
    """Connect to a shared agent over libp2p."""

    def __init__(
        self,
        *,
        multiaddr: str | None = None,
        manifest: Manifest | None = None,
        payment_tx: str = "",
        private_key: str = "",
        verify_erc8004: bool = True,
    ) -> None:
        if manifest is None and multiaddr is None:
            raise ValueError("Provide multiaddr or manifest")

        self.manifest = manifest
        self.multiaddr = multiaddr or (manifest.multiaddr if manifest else "")
        self.payment_tx = payment_tx
        # Consumer's private key used to sign the INFR payment transaction.
        # Falls back to PAYER_PRIVATE_KEY env var when left empty.
        self.private_key = private_key
        self.verify_erc8004 = verify_erc8004

        if not self.multiaddr:
            raise ValueError("No peer multiaddr available")

    @classmethod
    def from_multiaddr(
        cls,
        multiaddr_str: str,
        payment_tx: str = "",
        *,
        private_key: str = "",
        verify_erc8004: bool = True,
    ) -> Client:
        return cls(
            multiaddr=multiaddr_str,
            payment_tx=payment_tx,
            private_key=private_key,
            verify_erc8004=verify_erc8004,
        )

    @classmethod
    def from_manifest(
        cls,
        source: str,
        payment_tx: str = "",
        *,
        private_key: str = "",
        verify_erc8004: bool = True,
    ) -> Client:
        manifest = Manifest.from_source(source)
        multiaddr_str = manifest.multiaddr or manifest.endpoint
        if not multiaddr_str:
            raise ValueError("Manifest is missing multiaddr/endpoint")
        return cls(
            manifest=manifest,
            multiaddr=multiaddr_str,
            payment_tx=payment_tx,
            private_key=private_key,
            verify_erc8004=verify_erc8004,
        )

    @classmethod
    def from_agent(
        cls,
        agent_id: str,
        payment_tx: str = "",
        *,
        platform_url: str | None = None,
        private_key: str = "",
        verify_erc8004: bool = True,
    ) -> Client:
        """Connect using only the agent id copied from the InferNet platform.

        The manifest (live endpoint, price, wallet) is resolved from the
        platform automatically. Set ``INFERNET_PLATFORM_URL`` or pass
        ``platform_url`` to point at a specific platform. Pass ``private_key``
        (or set ``PAYER_PRIVATE_KEY``) to auto-pay the listed INFR price.
        """
        manifest = resolve_manifest(agent_id, platform_url=platform_url)
        multiaddr_str = manifest.multiaddr or manifest.endpoint
        if not multiaddr_str:
            raise ValueError(
                f"Agent '{agent_id}' is listed but has no live endpoint yet. "
                "Ask the provider to run `infernet serve --publish`."
            )
        return cls(
            manifest=manifest,
            multiaddr=multiaddr_str,
            payment_tx=payment_tx,
            private_key=private_key,
            verify_erc8004=verify_erc8004,
        )

    async def _ensure_manifest(self, host: Any, peer_id: Any) -> Manifest:
        if self.manifest is not None:
            return self.manifest

        manifest_data = await send_request(
            host,
            peer_id,
            MANIFEST_PROTOCOL,
            {},
        )
        self.manifest = Manifest.from_dict(manifest_data)
        return self.manifest

    async def _resolve_payment_tx(
        self,
        manifest: Manifest,
        payment_tx: str | None,
        *,
        auto_pay: bool,
    ) -> str:
        tx = payment_tx if payment_tx is not None else self.payment_tx
        if tx or not payment_required(manifest):
            return tx

        if not auto_pay:
            raise PaymentRequiredError(
                f"Agent requires {manifest.price_per_call} INFR to {manifest.wallet}. "
                "Pass payment_tx or enable auto_pay with a private key set."
            )

        pay = functools.partial(
            send_infr_payment,
            to_wallet=manifest.wallet,
            amount=manifest.price_per_call,
            token_contract=manifest.price_token,
            private_key=self.private_key or None,
        )
        return await trio.to_thread.run_sync(pay)

    async def infer_async(
        self,
        task: str,
        *,
        max_tokens: int = 512,
        payment_tx: str | None = None,
        auto_pay: bool = True,
    ) -> InferResult:
        host = new_host(key_pair=create_new_key_pair())
        maddr = multiaddr.Multiaddr(self.multiaddr)
        info = info_from_p2p_addr(maddr)

        async with host.run(listen_addrs=[]):
            await host.connect(info)
            manifest = await self._ensure_manifest(host, info.peer_id)
            if self.verify_erc8004 and registration_required(manifest):
                await trio.to_thread.run_sync(verify_agent_registration, manifest)
            tx = await self._resolve_payment_tx(
                manifest,
                payment_tx,
                auto_pay=auto_pay,
            )

            data = await send_request(
                host,
                info.peer_id,
                PROTOCOL_ID,
                {
                    "task": task,
                    "max_tokens": max_tokens,
                    "payment_tx": tx,
                },
            )

        if error := data.get("error"):
            message = data.get("message", "Request failed")
            raise PaymentError(f"{error}: {message}")

        return InferResult(
            output=data.get("output", ""),
            tokens_used=int(data.get("tokens_used", 0)),
            agent_id=data.get("agent_id", manifest.agent_id),
            runner_peer_id=data.get("runner_peer_id", str(info.peer_id)),
            payment_tx=data.get("payment_tx", tx),
        )

    def infer(
        self,
        task: str,
        *,
        max_tokens: int = 512,
        payment_tx: str | None = None,
        auto_pay: bool = True,
    ) -> InferResult:
        async def _run() -> InferResult:
            return await self.infer_async(
                task,
                max_tokens=max_tokens,
                payment_tx=payment_tx,
                auto_pay=auto_pay,
            )

        return trio.run(_run)

    def get_manifest(self) -> Manifest | None:
        return self.manifest
