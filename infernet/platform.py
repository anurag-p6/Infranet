from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import httpx

from infernet.exceptions import InferNetError
from infernet.manifest import Manifest


class PlatformError(InferNetError):
    """Raised when platform publish or heartbeat fails."""


@dataclass(frozen=True)
class PlatformConfig:
    base_url: str
    publish_key: str

    @classmethod
    def from_env(cls) -> PlatformConfig | None:
        base_url = os.environ.get("INFERNET_PLATFORM_URL") or os.environ.get(
            "PLATFORM_URL"
        )
        if not base_url:
            return None
        publish_key = os.environ.get("PLATFORM_PUBLISH_KEY", "")
        return cls(base_url=base_url.rstrip("/"), publish_key=publish_key)


def should_publish_to_platform() -> bool:
    if os.environ.get("PUBLISH_TO_PLATFORM", "").lower() in {"1", "true", "yes"}:
        return True
    return PlatformConfig.from_env() is not None


def _headers(config: PlatformConfig) -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if config.publish_key:
        headers["Authorization"] = f"Bearer {config.publish_key}"
    return headers


def publish_manifest(
    manifest: Manifest,
    *,
    peer_id: str = "",
    config: PlatformConfig | None = None,
) -> dict:
    """Publish or update an agent listing on the InferNet platform."""
    cfg = config or PlatformConfig.from_env()
    if cfg is None:
        raise PlatformError(
            "INFERNET_PLATFORM_URL is not set. Example: http://localhost:3000"
        )

    payload = {
        "manifest": manifest.model_dump(),
        "peer_id": peer_id,
    }

    with httpx.Client(timeout=20.0) as client:
        response = client.post(
            f"{cfg.base_url}/api/manifests",
            json=payload,
            headers=_headers(cfg),
        )

    if response.status_code >= 400:
        detail = response.text
        try:
            detail = response.json().get("error", detail)
        except Exception:
            pass
        raise PlatformError(f"Platform publish failed ({response.status_code}): {detail}")

    return response.json()


def heartbeat_manifest(
    agent_id: str,
    *,
    multiaddr: str,
    peer_id: str = "",
    config: PlatformConfig | None = None,
) -> dict:
    """Tell the platform this agent is still online with the current multiaddr."""
    cfg = config or PlatformConfig.from_env()
    if cfg is None:
        raise PlatformError("INFERNET_PLATFORM_URL is not set")

    payload = {
        "agent_id": agent_id,
        "multiaddr": multiaddr,
        "peer_id": peer_id,
    }

    with httpx.Client(timeout=15.0) as client:
        response = client.post(
            f"{cfg.base_url}/api/manifests/heartbeat",
            json=payload,
            headers=_headers(cfg),
        )

    if response.status_code >= 400:
        raise PlatformError(f"Heartbeat failed ({response.status_code}): {response.text}")

    return response.json()


def publish_from_file(path: str | Path, *, peer_id: str = "") -> dict:
    manifest = Manifest.from_file(path)
    return publish_manifest(manifest, peer_id=peer_id)


def save_and_publish(
    manifest: Manifest,
    path: str | Path,
    *,
    peer_id: str = "",
) -> dict | None:
    """Save manifest locally and push to platform when configured."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    manifest.save(path)
    if not should_publish_to_platform():
        return None
    result = publish_manifest(manifest, peer_id=peer_id)
    print(f"Listed on platform: {result.get('url', manifest.agent_id)}")
    return result
