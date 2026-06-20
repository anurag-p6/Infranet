from __future__ import annotations


class InferNetError(Exception):
    """Base InferNet error."""


class PaymentError(InferNetError):
    """Raised when payment is missing or invalid."""


class PaymentRequiredError(PaymentError):
    """Raised when a paid agent is called without payment."""


class PaymentVerificationError(PaymentError):
    """Raised when on-chain payment verification fails."""
