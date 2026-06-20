"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";

const links = [
  { href: "#install", label: "Install" },
  { href: "#quickstart", label: "Start" },
  { href: "#payment", label: "Payment" },
  { href: "#erc8004", label: "ERC-8004" },
  { href: "#agents", label: "Agents" },
  { href: "/agents", label: "Marketplace" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border/70 bg-white/90 backdrop-blur-md transition-all duration-300 ${
        scrolled ? "nav-scrolled" : ""
      }`}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="display flex h-9 w-9 items-center justify-center rounded-lg bg-violet-primary text-sm text-white">
            IN
          </span>
          <span className="display text-lg">InferNet</span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/65 transition hover:text-violet-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <WalletButton />
      </div>
    </header>
  );
}
