from __future__ import annotations

import secrets
from collections.abc import Awaitable, Callable
from typing import Any

import trio
from libp2p import new_host
from libp2p.crypto.secp256k1 import create_new_key_pair
from libp2p.custom_types import TProtocol
from libp2p.host.basic_host import IHost
from libp2p.utils.address_validation import find_free_port, get_available_interfaces

from infernet.protocol import PROTOCOL_ID
from infernet.stream_codec import read_json, write_json

MANIFEST_PROTOCOL = TProtocol("/infernet/manifest/1.0.0")

RequestHandler = Callable[[dict[str, Any], Any], Awaitable[dict[str, Any]]]


def create_host(port: int) -> tuple[IHost, list[Any], int]:
    if port <= 0:
        port = find_free_port()
    secret = secrets.token_bytes(32)
    host = new_host(key_pair=create_new_key_pair(secret))
    listen_addrs = get_available_interfaces(port)
    return host, listen_addrs, port


def _wrap_handler(handler: RequestHandler) -> Callable[[Any], Awaitable[None]]:
    async def stream_handler(stream: Any) -> None:
        try:
            request = await read_json(stream)
            response = await handler(request, stream)
            await write_json(stream, response)
        finally:
            await stream.close()

    return stream_handler


def register_handler(
    host: IHost,
    protocol_id: TProtocol,
    handler: RequestHandler,
) -> None:
    host.set_stream_handler(protocol_id, _wrap_handler(handler))


async def send_request(
    host: IHost,
    peer_id: Any,
    protocol_id: TProtocol,
    request: dict[str, Any],
) -> dict[str, Any]:
    stream = await host.new_stream(peer_id, [protocol_id])
    try:
        await write_json(stream, request)
        return await read_json(stream)
    finally:
        await stream.close()
