from __future__ import annotations

import os

from infernet.exceptions import InferNetError
from infernet.manifest import Manifest

DEFAULT_PLATFORM_URL = "http://localhost:3000"


class AgentNotFoundError(InferNetError):
    """Raised when an agent id cannot be resolved on the platform."""


def default_platform_url() -> str:
    return (
        os.environ.get("INFERNET_PLATFORM_URL")
        or os.environ.get("PLATFORM_URL")
        or DEFAULT_PLATFORM_URL
    ).rstrip("/")


def manifest_url(agent_id: str, platform_url: str | None = None) -> str:
    base = (platform_url or default_platform_url()).rstrip("/")
    return f"{base}/api/manifests/{agent_id}"


def resolve_manifest(
    agent_id: str,
    *,
    platform_url: str | None = None,
    timeout: float = 10.0,
) -> Manifest:
    """Fetch an agent manifest from the InferNet platform by its agent id.

    This is what powers the "copy the agent id into your project" flow: a
    consumer only needs the id shown on the listing, and the SDK resolves the
    live endpoint, price, and payment details from the platform.
    """
    if not agent_id or not agent_id.strip():
        raise AgentNotFoundError("agent_id is required")

    url = manifest_url(agent_id, platform_url)
    try:
        return Manifest.from_url(url, timeout=timeout)
    except Exception as exc:  # noqa: BLE001 - surface a clear, actionable error
        raise AgentNotFoundError(
            f"Could not resolve agent '{agent_id}' from {url}. "
            "Check the agent id and INFERNET_PLATFORM_URL."
        ) from exc
