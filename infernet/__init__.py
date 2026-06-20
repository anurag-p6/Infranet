"""InferNet — share local AI agents over libp2p."""

from infernet.client import Client, InferResult
from infernet.erc8004 import (
    AgentRegistrationResult,
    build_agent_registration,
    register_agent,
    verify_agent_registration,
)
from infernet.exceptions import (
    AgentVerificationError,
    InferNetError,
    PaymentError,
    PaymentRequiredError,
)
from infernet.exceptions import StakeError
from infernet.manifest import Manifest
from infernet.payment import send_infr_payment, verify_infr_payment
from infernet.registry import AgentNotFoundError, resolve_manifest
from infernet.serve import ServedAgent, serve_agent
from infernet.staking import (
    StakeInfo,
    StakeResult,
    get_stake,
    stake_agent,
    verify_stake,
    withdraw_stake,
)

__all__ = [
    "AgentNotFoundError",
    "AgentRegistrationResult",
    "AgentVerificationError",
    "Client",
    "InferResult",
    "InferNetError",
    "Manifest",
    "PaymentError",
    "PaymentRequiredError",
    "ServedAgent",
    "StakeError",
    "StakeInfo",
    "StakeResult",
    "build_agent_registration",
    "get_stake",
    "register_agent",
    "resolve_manifest",
    "send_infr_payment",
    "serve_agent",
    "stake_agent",
    "verify_agent_registration",
    "verify_infr_payment",
    "verify_stake",
    "withdraw_stake",
]
