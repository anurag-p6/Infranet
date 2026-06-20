from __future__ import annotations

import os
from dataclasses import dataclass


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


def payer_private_key() -> str | None:
    return os.environ.get("PAYER_PRIVATE_KEY") or os.environ.get("MONAD_PRIVATE_KEY")
