from __future__ import annotations

import os
from dataclasses import dataclass

DEFAULT_IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
DEFAULT_REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63"


@dataclass(frozen=True)
class MonadConfig:
    rpc_url: str
    chain_id: int
    infr_contract: str
    token_decimals: int = 18

    @classmethod
    def from_env(cls) -> MonadConfig:
        rpc_url = os.environ.get("MONAD_RPC", "https://testnet-rpc.monad.xyz")
        chain_id = int(os.environ.get("MONAD_CHAIN_ID", "10143"))
        infr_contract = os.environ.get("INFR_CONTRACT", "")
        token_decimals = int(os.environ.get("INFR_DECIMALS", "18"))
        return cls(
            rpc_url=rpc_url,
            chain_id=chain_id,
            infr_contract=infr_contract,
            token_decimals=token_decimals,
        )

    def require_contract(self) -> str:
        if not self.infr_contract:
            raise ValueError(
                "INFR_CONTRACT is not set. Deploy INFR on Monad testnet and set the env var."
            )
        return self.infr_contract


@dataclass(frozen=True)
class ERC8004Config:
    identity_registry: str
    reputation_registry: str

    @classmethod
    def from_env(cls) -> ERC8004Config:
        identity = os.environ.get("ERC8004_IDENTITY_REGISTRY", DEFAULT_IDENTITY_REGISTRY)
        reputation = os.environ.get(
            "ERC8004_REPUTATION_REGISTRY", DEFAULT_REPUTATION_REGISTRY
        )
        return cls(identity_registry=identity, reputation_registry=reputation)


@dataclass(frozen=True)
class StakingConfig:
    staking_contract: str
    min_stake: str

    @classmethod
    def from_env(cls) -> StakingConfig:
        return cls(
            staking_contract=os.environ.get("AGENT_STAKING_CONTRACT", ""),
            min_stake=os.environ.get("MIN_STAKE", "0"),
        )

    def require_contract(self) -> str:
        if not self.staking_contract:
            raise ValueError(
                "AGENT_STAKING_CONTRACT is not set. Deploy AgentStaking on Monad "
                "testnet (forge script script/DeployStaking.s.sol) and set the env var."
            )
        return self.staking_contract


def payer_private_key() -> str | None:
    return os.environ.get("PAYER_PRIVATE_KEY") or os.environ.get("MONAD_PRIVATE_KEY")


def agent_owner_private_key() -> str | None:
    return (
        os.environ.get("AGENT_OWNER_PRIVATE_KEY")
        or os.environ.get("DEPLOYER_PRIVATE_KEY")
    )
