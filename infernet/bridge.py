from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from infernet import Client
from infernet.exceptions import InferNetError, PaymentError

try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel, Field
except ImportError as exc:
    raise SystemExit(
        "Install bridge deps: pip install -e '.[bridge]'"
    ) from exc


app = FastAPI(title="InferNet Gateway", version="0.1.0")


class InferRequest(BaseModel):
    multiaddr: str = Field(min_length=1)
    task: str = Field(min_length=1)
    payment_tx: str = ""
    max_tokens: int = Field(default=512, ge=1, le=8192)
    auto_pay: bool = False


class InferResponse(BaseModel):
    output: str
    tokens_used: int
    agent_id: str
    runner_peer_id: str
    payment_tx: str = ""


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "infernet-gateway"}


@app.post("/v1/infer", response_model=InferResponse)
def infer(body: InferRequest) -> InferResponse:
    try:
        client = Client.from_multiaddr(body.multiaddr, payment_tx=body.payment_tx)
        result = client.infer(
            body.task,
            max_tokens=body.max_tokens,
            auto_pay=body.auto_pay,
        )
    except PaymentError as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    except InferNetError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return InferResponse(
        output=result.output,
        tokens_used=result.tokens_used,
        agent_id=result.agent_id,
        runner_peer_id=result.runner_peer_id,
        payment_tx=result.payment_tx,
    )


def main() -> None:
    import uvicorn

    host = os.environ.get("GATEWAY_HOST", "127.0.0.1")
    port = int(os.environ.get("GATEWAY_PORT", "8787"))
    uvicorn.run("infernet.bridge:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
