"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { WalletButton } from "@/components/wallet-button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/auctions", label: "Auctions" },
  { href: "/sales", label: "Sales" },
  { href: "/activity", label: "Activity" },
  { href: "/transactions", label: "Transactions" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Sparkles className="size-6 text-primary" />
            <div className="leading-tight">
              <span className="block text-base font-semibold tracking-tight">
                Nova Market
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                NFT marketplace on Stellar
              </span>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <WalletButton />
      </div>
      {/* Mobile nav */}
      <nav className="flex gap-1 overflow-x-auto border-t px-4 py-2 md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
              pathname === item.href
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
