from __future__ import annotations

import json
import struct
from typing import Any

from libp2p.abc import INetStream
from libp2p.network.stream.exceptions import StreamEOF

MAX_MESSAGE_SIZE = 1_048_576


async def write_json(stream: INetStream, payload: dict[str, Any]) -> None:
    data = json.dumps(payload).encode("utf-8")
    if len(data) > MAX_MESSAGE_SIZE:
        raise ValueError("Message exceeds maximum size")
    header = struct.pack(">I", len(data))
    await stream.write(header + data)


async def read_json(stream: INetStream) -> dict[str, Any]:
    header = await _read_exact(stream, 4)
    (length,) = struct.unpack(">I", header)
    if length > MAX_MESSAGE_SIZE:
        raise ValueError("Incoming message exceeds maximum size")
    body = await _read_exact(stream, length)
    return json.loads(body.decode("utf-8"))


async def _read_exact(stream: INetStream, size: int) -> bytes:
    chunks: list[bytes] = []
    remaining = size
    while remaining > 0:
        try:
            chunk = await stream.read(remaining)
        except StreamEOF as exc:
            raise EOFError("Stream closed before full message was received") from exc
        if not chunk:
            raise EOFError("Stream closed before full message was received")
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)
