from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from eth_account import Account
from web3 import Web3

from infernet.config import MonadConfig, StakingConfig, agent_owner_private_key
from infernet.exceptions import StakeError
from infernet.manifest import Manifest

AGENT_STAKING_ABI = [
    {
        "inputs": [{"name": "agentId", "type": "string"}],
        "name": "stake",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function",
    },
    {
        "inputs": [{"name": "agentId", "type": "string"}],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "agentId", "type": "string"}],
        "name": "stakeOf",
        "outputs": [
            {"name": "staker", "type": "address"},
            {"name": "amount", "type": "uint256"},
            {"name": "stakedAt", "type": "uint256"},
            {"name": "active", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "agentId", "type": "string"}],
        "name": "isStaked",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "minStake",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]


@dataclass(frozen=True)
class StakeInfo:
    staker: str
    amount_wei: int
    staked_at: int
    active: bool

    @property
    def amount_mon(self) -> str:
        return format(Decimal(self.amount_wei) / (Decimal(10) ** 18), "f")


@dataclass(frozen=True)
class StakeResult:
    tx_hash: str
    staker: str
    amount_wei: int

    @property
    def amount_mon(self) -> str:
        return format(Decimal(self.amount_wei) / (Decimal(10) ** 18), "f")


def _web3(config: MonadConfig | None = None) -> Web3:
    cfg = config or MonadConfig.from_env()
    web3 = Web3(Web3.HTTPProvider(cfg.rpc_url))
    if not web3.is_connected():
        raise StakeError(f"Cannot connect to Monad RPC: {cfg.rpc_url}")
    return web3


def _contract(web3: Web3, staking_contract: str):
    return web3.eth.contract(
        address=Web3.to_checksum_address(staking_contract),
        abi=AGENT_STAKING_ABI,
    )


def mon_to_wei(amount_mon: str) -> int:
    value = Decimal(str(amount_mon))
    if value < 0:
        raise StakeError("Stake amount must be non-negative")
    return int(value * (Decimal(10) ** 18))


def get_stake(
    agent_id: str,
    *,
    config: MonadConfig | None = None,
    staking_config: StakingConfig | None = None,
) -> StakeInfo:
    """Read an agent's on-chain bond from the AgentStaking contract."""
    cfg = config or MonadConfig.from_env()
    staking = staking_config or StakingConfig.from_env()
    contract_address = staking.require_contract()

    web3 = _web3(cfg)
    contract = _contract(web3, contract_address)
    staker, amount, staked_at, active = contract.functions.stakeOf(agent_id).call()
    return StakeInfo(
        staker=staker,
        amount_wei=int(amount),
        staked_at=int(staked_at),
        active=bool(active),
    )


def stake_agent(
    agent_id: str,
    amount_mon: str,
    *,
    private_key: str | None = None,
    config: MonadConfig | None = None,
    staking_config: StakingConfig | None = None,
) -> StakeResult:
    """Lock a native MON bond for an agent before listing it."""
    cfg = config or MonadConfig.from_env()
    staking = staking_config or StakingConfig.from_env()
    contract_address = staking.require_contract()
    key = private_key or agent_owner_private_key()
    if not key:
        raise StakeError(
            "AGENT_OWNER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) is required to stake"
        )

    web3 = _web3(cfg)
    account = Account.from_key(key)
    contract = _contract(web3, contract_address)
    value_wei = mon_to_wei(amount_mon)

    nonce = web3.eth.get_transaction_count(account.address)
    tx = contract.functions.stake(agent_id).build_transaction(
        {
            "from": account.address,
            "value": value_wei,
            "nonce": nonce,
            "chainId": cfg.chain_id,
            "gas": 200_000,
            "gasPrice": web3.eth.gas_price,
        }
    )
    signed = account.sign_transaction(tx)
    tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    if receipt["status"] != 1:
        raise StakeError(f"Stake transaction failed: {tx_hash.hex()}")

    return StakeResult(
        tx_hash=tx_hash.hex(),
        staker=account.address,
        amount_wei=value_wei,
    )


def verify_stake(
    agent_id: str,
    *,
    min_amount_mon: str | None = None,
    config: MonadConfig | None = None,
    staking_config: StakingConfig | None = None,
) -> StakeInfo:
    """Ensure an agent has an active on-chain bond (optionally above a minimum)."""
    info = get_stake(agent_id, config=config, staking_config=staking_config)
    if not info.active:
        raise StakeError(f"Agent '{agent_id}' has no active stake on-chain")

    if min_amount_mon is not None:
        min_wei = mon_to_wei(min_amount_mon)
        if info.amount_wei < min_wei:
            raise StakeError(
                f"Agent stake too low: {info.amount_mon} MON < required {min_amount_mon} MON"
            )

    return info


def withdraw_stake(
    agent_id: str,
    *,
    private_key: str | None = None,
    config: MonadConfig | None = None,
    staking_config: StakingConfig | None = None,
) -> str:
    """Refund an agent's bond to the original staker (delisting)."""
    cfg = config or MonadConfig.from_env()
    staking = staking_config or StakingConfig.from_env()
    contract_address = staking.require_contract()
    key = private_key or agent_owner_private_key()
    if not key:
        raise StakeError("AGENT_OWNER_PRIVATE_KEY is required to withdraw a stake")

    web3 = _web3(cfg)
    account = Account.from_key(key)
    contract = _contract(web3, contract_address)

    nonce = web3.eth.get_transaction_count(account.address)
    tx = contract.functions.withdraw(agent_id).build_transaction(
        {
            "from": account.address,
            "nonce": nonce,
            "chainId": cfg.chain_id,
            "gas": 120_000,
            "gasPrice": web3.eth.gas_price,
        }
    )
    signed = account.sign_transaction(tx)
    tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    if receipt["status"] != 1:
        raise StakeError(f"Withdraw transaction failed: {tx_hash.hex()}")
    return tx_hash.hex()


def attach_stake_to_manifest(manifest: Manifest, result: StakeResult) -> Manifest:
    return manifest.model_copy(
        update={
            "stake_amount": result.amount_mon,
            "stake_tx": result.tx_hash,
            "staker": result.staker,
        }
    )


def attach_stake_info_to_manifest(manifest: Manifest, info: StakeInfo) -> Manifest:
    """Populate manifest stake fields from an already-active on-chain bond."""
    return manifest.model_copy(
        update={
            "stake_amount": info.amount_mon,
            "stake_tx": manifest.stake_tx,
            "staker": info.staker,
        }
    )
