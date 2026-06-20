from __future__ import annotations

import base64
import json
import os
from dataclasses import dataclass
from typing import Any

from eth_account import Account
from web3 import Web3

from infernet.config import (
    DEFAULT_IDENTITY_REGISTRY,
    DEFAULT_REPUTATION_REGISTRY,
    ERC8004Config,
    MonadConfig,
    agent_owner_private_key,
)
from infernet.exceptions import AgentVerificationError
from infernet.manifest import Manifest

REGISTRATION_TYPE = "https://eips.ethereum.org/EIPS/eip-8004#registration-v1"
INFERNET_PROTOCOL_VERSION = "1.0.0"

IDENTITY_REGISTRY_ABI = [
    {
        "inputs": [{"name": "agentURI", "type": "string"}],
        "name": "register",
        "outputs": [{"name": "agentId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "tokenURI",
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "agentId", "type": "uint256"}],
        "name": "getAgentWallet",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "ownerOf",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "agentId", "type": "uint256"},
            {"indexed": False, "name": "agentURI", "type": "string"},
            {"indexed": True, "name": "owner", "type": "address"},
        ],
        "name": "Registered",
        "type": "event",
    },
]


@dataclass(frozen=True)
class AgentRegistrationResult:
    agent_id: int
    tx_hash: str
    agent_uri: str
    registry: str


def registry_namespace(chain_id: int, identity_registry: str) -> str:
    return f"eip155:{chain_id}:{Web3.to_checksum_address(identity_registry)}"


def build_agent_registration(
    manifest: Manifest,
    *,
    chain_id: int,
    identity_registry: str,
    agent_id: int | None = None,
    description: str = "",
    image: str = "",
) -> dict[str, Any]:
    """Build an ERC-8004 registration-v1 agent card from an InferNet manifest."""
    multiaddr = manifest.multiaddr or manifest.endpoint
    if not multiaddr:
        raise ValueError("Manifest must include multiaddr or endpoint for ERC-8004 registration")

    services: list[dict[str, Any]] = [
        {
            "name": "infernet",
            "endpoint": multiaddr,
            "version": INFERNET_PROTOCOL_VERSION,
        },
        {
            "name": "infernet-manifest",
            "endpoint": manifest.protocol,
            "version": INFERNET_PROTOCOL_VERSION,
        },
    ]

    if manifest.wallet:
        services.append(
            {
                "name": "wallet",
                "endpoint": Web3.to_checksum_address(manifest.wallet),
            }
        )

    registration: dict[str, Any] = {
        "type": REGISTRATION_TYPE,
        "name": manifest.agent_id,
        "description": description
        or f"InferNet {manifest.backend} agent ({manifest.model}) over libp2p",
        "image": image,
        "services": services,
        "x402Support": False,
        "active": True,
        "supportedTrust": ["reputation", "crypto-economic"],
    }

    if agent_id is not None:
        registration["registrations"] = [
            {
                "agentId": agent_id,
                "agentRegistry": registry_namespace(chain_id, identity_registry),
            }
        ]

    return registration


def registration_to_data_uri(registration: dict[str, Any]) -> str:
    payload = json.dumps(registration, separators=(",", ":"), ensure_ascii=False)
    encoded = base64.b64encode(payload.encode("utf-8")).decode("ascii")
    return f"data:application/json;base64,{encoded}"


def parse_agent_uri(agent_uri: str) -> dict[str, Any]:
    if not agent_uri.startswith("data:application/json;base64,"):
        raise AgentVerificationError(
            "Only on-chain data:application/json;base64 agent URIs are supported locally"
        )
    encoded = agent_uri.split(",", 1)[1]
    try:
        raw = base64.b64decode(encoded).decode("utf-8")
        return json.loads(raw)
    except Exception as exc:
        raise AgentVerificationError("Could not decode agent registration URI") from exc


def _web3(config: MonadConfig | None = None) -> Web3:
    cfg = config or MonadConfig.from_env()
    web3 = Web3(Web3.HTTPProvider(cfg.rpc_url))
    if not web3.is_connected():
        raise AgentVerificationError(f"Cannot connect to Monad RPC: {cfg.rpc_url}")
    return web3


def _identity_contract(
    web3: Web3,
    identity_registry: str,
):
    return web3.eth.contract(
        address=Web3.to_checksum_address(identity_registry),
        abi=IDENTITY_REGISTRY_ABI,
    )


def register_agent(
    manifest: Manifest,
    *,
    private_key: str | None = None,
    description: str = "",
    image: str = "",
    config: MonadConfig | None = None,
    erc8004_config: ERC8004Config | None = None,
) -> AgentRegistrationResult:
    """Mint an ERC-8004 identity NFT and attach an InferNet agent card."""
    cfg = config or MonadConfig.from_env()
    e8004 = erc8004_config or ERC8004Config.from_env()
    key = private_key or agent_owner_private_key()
    if not key:
        raise AgentVerificationError(
            "AGENT_OWNER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) is required to register"
        )

    registration = build_agent_registration(
        manifest,
        chain_id=cfg.chain_id,
        identity_registry=e8004.identity_registry,
        description=description or manifest.description,
        image=image or manifest.image,
    )
    agent_uri = registration_to_data_uri(registration)

    web3 = _web3(cfg)
    account = Account.from_key(key)
    contract = _identity_contract(web3, e8004.identity_registry)

    nonce = web3.eth.get_transaction_count(account.address)
    tx = contract.functions.register(agent_uri).build_transaction(
        {
            "from": account.address,
            "nonce": nonce,
            "chainId": cfg.chain_id,
            "gas": 500_000,
            "gasPrice": web3.eth.gas_price,
        }
    )
    signed = account.sign_transaction(tx)
    tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    if receipt["status"] != 1:
        raise AgentVerificationError(f"ERC-8004 registration failed: {tx_hash.hex()}")

    registered = contract.events.Registered().process_receipt(receipt)
    if not registered:
        raise AgentVerificationError("Registered event not found in registration tx")

    agent_id = int(registered[0]["args"]["agentId"])
    return AgentRegistrationResult(
        agent_id=agent_id,
        tx_hash=tx_hash.hex(),
        agent_uri=agent_uri,
        registry=e8004.identity_registry,
    )


def attach_registration_to_manifest(
    manifest: Manifest,
    result: AgentRegistrationResult,
    *,
    chain_id: int,
) -> Manifest:
    updated = manifest.model_copy(
        update={
            "erc8004_agent_id": str(result.agent_id),
            "erc8004_registry": registry_namespace(chain_id, result.registry),
            "erc8004_tx": result.tx_hash,
        }
    )
    return updated


def verify_agent_registration(
    manifest: Manifest,
    *,
    config: MonadConfig | None = None,
    erc8004_config: ERC8004Config | None = None,
) -> None:
    """Verify manifest ERC-8004 fields against the on-chain Identity Registry."""
    if not manifest.erc8004_agent_id:
        raise AgentVerificationError("Manifest is missing erc8004_agent_id")

    cfg = config or MonadConfig.from_env()
    e8004 = erc8004_config or ERC8004Config.from_env()
    agent_id = int(manifest.erc8004_agent_id)

    web3 = _web3(cfg)
    contract = _identity_contract(web3, e8004.identity_registry)

    try:
        on_chain_uri = contract.functions.tokenURI(agent_id).call()
    except Exception as exc:
        raise AgentVerificationError(f"Agent #{agent_id} not found on registry") from exc

    registration = parse_agent_uri(on_chain_uri)
    if registration.get("name") != manifest.agent_id:
        raise AgentVerificationError(
            f"Agent name mismatch: on-chain '{registration.get('name')}' "
            f"!= manifest '{manifest.agent_id}'"
        )

    multiaddr = manifest.multiaddr or manifest.endpoint
    infernet_services = [
        svc
        for svc in registration.get("services", [])
        if svc.get("name") == "infernet"
    ]
    if not infernet_services:
        raise AgentVerificationError("On-chain registration has no infernet service")

    if infernet_services[0].get("endpoint") != multiaddr:
        raise AgentVerificationError(
            "On-chain infernet endpoint does not match manifest multiaddr"
        )

    if manifest.wallet:
        on_chain_wallet = contract.functions.getAgentWallet(agent_id).call()
        expected = Web3.to_checksum_address(manifest.wallet)
        if Web3.to_checksum_address(on_chain_wallet) != expected:
            raise AgentVerificationError(
                f"Agent wallet mismatch: on-chain {on_chain_wallet} != manifest {expected}"
            )

    if manifest.erc8004_registry:
        expected_registry = registry_namespace(cfg.chain_id, e8004.identity_registry)
        if manifest.erc8004_registry != expected_registry:
            raise AgentVerificationError(
                f"Registry namespace mismatch: {manifest.erc8004_registry} != {expected_registry}"
            )


def registration_required(manifest: Manifest) -> bool:
    return bool(manifest.erc8004_agent_id)
