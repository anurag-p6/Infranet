import Link from "next/link";
import {
  addressUrl,
  erc8004IdentityAddress,
  erc8004ReputationAddress,
  explorerUrl,
  faucetUrl,
  infrAddress,
} from "@/lib/contracts";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="container section-pad">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="display text-xl">InferNet</p>
            <p className="mt-3 text-sm text-foreground/60">
              Share a URL, not your code. Verified agent, verified payment.
            </p>
          </div>

          <div>
            <p className="section-label">Contracts</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={addressUrl(infrAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-violet-primary hover:underline"
                >
                  INFR token
                </a>
              </li>
              <li>
                <a
                  href={addressUrl(erc8004IdentityAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-violet-primary hover:underline"
                >
                  ERC-8004 Identity
                </a>
              </li>
              <li>
                <a
                  href={addressUrl(erc8004ReputationAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-violet-primary hover:underline"
                >
                  ERC-8004 Reputation
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="section-label">Network</p>
            <ul className="mt-3 space-y-2 text-sm text-foreground/65">
              <li>Monad Testnet · Chain 10143</li>
              <li>
                <a href={explorerUrl} target="_blank" rel="noreferrer" className="hover:text-violet-primary">
                  Explorer
                </a>
              </li>
              <li>
                <a href={faucetUrl} target="_blank" rel="noreferrer" className="hover:text-violet-primary">
                  Faucet
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="section-label">Product</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/agents" className="text-foreground/65 hover:text-violet-primary">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/list" className="text-foreground/65 hover:text-violet-primary">
                  List agent
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-foreground/65 hover:text-violet-primary">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-border pt-6 text-xs text-foreground/45">
          Python SDK · libp2p · INFR on Monad · ERC-8004 trustless agents
        </p>
      </div>
    </footer>
  );
}
