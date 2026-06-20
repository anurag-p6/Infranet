"""Expose a local OpenClaw Gateway agent as a shared InferNet agent.

Prerequisites:
1. OpenClaw gateway running: openclaw gateway start
2. Enable chat completions in ~/.openclaw/openclaw.json:
   gateway.http.endpoints.chatCompletions.enabled = true
3. Optional auth token:
   set OPENCLAW_TOKEN=your-gateway-token
"""

import os

from infernet.adapters import OpenClawAdapter
from infernet.serve import ServedAgent

if __name__ == "__main__":
    ServedAgent(
        name="openclaw-default",
        model=os.environ.get("OPENCLAW_MODEL", "openclaw/default"),
        adapter=OpenClawAdapter(
            model=os.environ.get("OPENCLAW_MODEL", "openclaw/default"),
            token=os.environ.get("OPENCLAW_TOKEN"),
        ),
        price_per_call="10",
        manifest_path="manifests/openclaw-default.json",
    ).serve()
