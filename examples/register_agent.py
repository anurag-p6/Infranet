"""Register an InferNet agent on the ERC-8004 Identity Registry (Monad testnet)."""

import os

from infernet import Manifest, register_agent, verify_agent_registration
from infernet.erc8004 import attach_registration_to_manifest
from infernet.config import MonadConfig

MANIFEST_PATH = os.environ.get("MANIFEST_PATH", "manifests/echo-agent.json")


def main() -> None:
    manifest = Manifest.from_file(MANIFEST_PATH)

    print("Registering on ERC-8004 Identity Registry...")
    result = register_agent(manifest)
    updated = attach_registration_to_manifest(
        manifest,
        result,
        chain_id=MonadConfig.from_env().chain_id,
    )
    updated.save(MANIFEST_PATH)

    print(f"Agent ID: {result.agent_id}")
    print(f"Tx: {result.tx_hash}")
    print(f"Registry: {updated.erc8004_registry}")

    verify_agent_registration(updated)
    print("On-chain verification passed")


if __name__ == "__main__":
    main()
