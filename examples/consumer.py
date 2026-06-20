"""Use an agent listed on the InferNet platform.

Copy the agent id from the platform listing and drop it in here — the SDK
resolves the live endpoint, price, and wallet for you.

Paid agents are settled with a normal on-chain INFR transfer signed by the
consumer's own private key. Provide it via the PAYER_PRIVATE_KEY env var
(recommended — keeps the key out of shell history):

    set INFERNET_PLATFORM_URL=http://localhost:3000
    set PAYER_PRIVATE_KEY=0xYourConsumerPrivateKey
    python examples/consumer.py --agent echo-agent --task "hello"
"""

import argparse
import json
import os
import sys

from infernet import Client
from infernet.exceptions import PaymentError


def main() -> None:
    parser = argparse.ArgumentParser(description="Call a listed InferNet agent")
    parser.add_argument(
        "--agent",
        required=True,
        help="Agent id copied from the InferNet platform listing",
    )
    parser.add_argument("--task", required=True, help="Prompt or task for the agent")
    parser.add_argument("--max-tokens", type=int, default=512)
    parser.add_argument(
        "--platform-url",
        default=None,
        help="Platform base URL (defaults to INFERNET_PLATFORM_URL env var)",
    )
    parser.add_argument(
        "--no-auto-pay",
        action="store_true",
        help="Do not send INFR automatically; the agent may reject the call",
    )
    args = parser.parse_args()

    # Consumer signs the INFR payment with their own key (env var, not argv).
    private_key = os.environ.get("PAYER_PRIVATE_KEY", "")

    client = Client.from_agent(
        args.agent,
        platform_url=args.platform_url,
        private_key=private_key,
    )

    try:
        result = client.infer(
            args.task,
            max_tokens=args.max_tokens,
            auto_pay=not args.no_auto_pay,
        )
    except PaymentError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(2) from exc

    print(json.dumps(result.__dict__, indent=2))


if __name__ == "__main__":
    main()
