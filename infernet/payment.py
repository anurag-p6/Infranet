from __future__ import annotations

from decimal import Decimal

from eth_account import Account
from web3 import Web3
from web3.types import TxReceipt

from infernet.config import MonadConfig, payer_private_key
from infernet.exceptions import PaymentVerificationError

ERC20_ABI = [
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"},
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "from", "type": "address"},
            {"indexed": True, "name": "to", "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"},
        ],
        "name": "Transfer",
        "type": "event",
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function",
    },
]


def _web3(config: MonadConfig | None = None) -> Web3:
    cfg = config or MonadConfig.from_env()
    web3 = Web3(Web3.HTTPProvider(cfg.rpc_url))
    if not web3.is_connected():
        raise PaymentVerificationError(f"Cannot connect to Monad RPC: {cfg.rpc_url}")
    return web3


def _checksum(address: str) -> str:
    return Web3.to_checksum_address(address)


def parse_token_amount(amount: str, decimals: int) -> int:
    value = Decimal(amount)
    if value < 0:
        raise PaymentVerificationError("Payment amount must be non-negative")
    scaled = value * (Decimal(10) ** decimals)
    return int(scaled)


def format_token_amount(amount_wei: int, decimals: int) -> str:
    return format(Decimal(amount_wei) / (Decimal(10) ** decimals), "f")


def payment_required(manifest) -> bool:
    try:
        price = Decimal(manifest.price_per_call)
    except Exception:
        return False
    return price > 0 and bool(manifest.wallet) and bool(manifest.price_token)


def send_infr_payment(
    *,
    to_wallet: str,
    amount: str,
    token_contract: str | None = None,
    private_key: str | None = None,
    config: MonadConfig | None = None,
) -> str:
    cfg = config or MonadConfig.from_env()
    contract_address = token_contract or cfg.require_contract()
    key = private_key or payer_private_key()
    if not key:
        raise PaymentVerificationError(
            "PAYER_PRIVATE_KEY is not set. Provide a key or pass --payment-tx manually."
        )

    web3 = _web3(cfg)
    account = Account.from_key(key)
    contract = web3.eth.contract(
        address=_checksum(contract_address),
        abi=ERC20_ABI,
    )
    amount_wei = parse_token_amount(amount, cfg.token_decimals)

    nonce = web3.eth.get_transaction_count(account.address)
    tx = contract.functions.transfer(_checksum(to_wallet), amount_wei).build_transaction(
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
        raise PaymentVerificationError(f"INFR payment failed: {tx_hash.hex()}")
    return tx_hash.hex()


def verify_infr_payment(
    payment_tx: str,
    *,
    expected_recipient: str,
    min_amount: str,
    token_contract: str | None = None,
    config: MonadConfig | None = None,
) -> None:
    if not payment_tx:
        raise PaymentVerificationError("payment_tx is required")

    cfg = config or MonadConfig.from_env()
    contract_address = token_contract or cfg.require_contract()
    web3 = _web3(cfg)
    receipt = _get_receipt(web3, payment_tx)
    _assert_successful_receipt(receipt)

    min_amount_wei = parse_token_amount(min_amount, cfg.token_decimals)
    recipient = _checksum(expected_recipient)
    token = _checksum(contract_address)

    transfer = web3.eth.contract(address=token, abi=ERC20_ABI).events.Transfer()
    matched = False
    for event in transfer.process_receipt(receipt):
        if _checksum(event["args"]["to"]) != recipient:
            continue
        if int(event["args"]["value"]) < min_amount_wei:
            raise PaymentVerificationError(
                f"Payment amount too low: got {event['args']['value']}, "
                f"need at least {min_amount_wei}"
            )
        matched = True
        break

    if not matched:
        raise PaymentVerificationError(
            f"No INFR transfer to {recipient} found in tx {payment_tx}"
        )


def _get_receipt(web3: Web3, payment_tx: str) -> TxReceipt:
    tx_hash = payment_tx if payment_tx.startswith("0x") else f"0x{payment_tx}"
    try:
        return web3.eth.get_transaction_receipt(tx_hash)
    except Exception as exc:
        raise PaymentVerificationError(f"Could not fetch tx receipt: {payment_tx}") from exc


def _assert_successful_receipt(receipt: TxReceipt) -> None:
    if receipt.get("status") != 1:
        raise PaymentVerificationError("Transaction failed on-chain")
