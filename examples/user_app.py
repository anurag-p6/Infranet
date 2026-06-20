"""Call a shared InferNet agent from another machine or terminal."""

import argparse
import json
import sys

from infernet import Client
from infernet.exceptions import PaymentError


def main() -> None:
    parser = argparse.ArgumentParser(description="Call a shared InferNet agent")
    parser.add_argument(
        "--manifest",
        help="Manifest URL or JSON file path",
    )
    parser.add_argument(
        "--multiaddr",
        help="Runner multiaddr, e.g. /ip4/127.0.0.1/tcp/8000/p2p/12D3Koo...",
    )
    parser.add_argument("--task", required=True, help="Prompt or task for the agent")
    parser.add_argument("--max-tokens", type=int, default=512)
    parser.add_argument(
        "--payment-tx",
        default="",
        help="Existing INFR payment tx hash on Monad testnet",
    )
    parser.add_argument(
        "--no-auto-pay",
        action="store_true",
        help="Do not send INFR automatically; require --payment-tx",
    )
    args = parser.parse_args()

    if not args.manifest and not args.multiaddr:
        print("Provide --manifest or --multiaddr", file=sys.stderr)
        raise SystemExit(1)

    if args.manifest:
        client = Client.from_manifest(args.manifest, payment_tx=args.payment_tx)
    else:
        client = Client.from_multiaddr(args.multiaddr, payment_tx=args.payment_tx)

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
