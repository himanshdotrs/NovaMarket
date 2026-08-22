import Link from "next/link";
import {
  ArrowRight,
  Gavel,
  Shield,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { GithubIcon } from "@/components/github-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LandingStats } from "@/components/landing-stats";
import { SiteFooter } from "@/components/site-footer";
import { GITHUB_URL } from "@/lib/config";

const FEATURES = [
  {
    icon: Shield,
    title: "Royalties enforced on-chain",
    description:
      "Creator royalties are baked into the smart contract and paid on every sale path — direct buys, auction settlements, and accepted offers. No marketplace goodwill required.",
  },
  {
    icon: Gavel,
    title: "English auctions with real escrow",
    description:
      "Bids are escrowed in XLM by the contract itself. Outbid? You're refunded instantly. Settlement is permissionless once the deadline passes.",
  },
  {
    icon: TrendingUp,
    title: "Offer negotiation",
    description:
      "Make escrowed offers on any NFT — even unlisted ones. Owners accept with one click; buyers can raise or withdraw anytime and get their funds back.",
  },
  {
    icon: Zap,
    title: "Real-time on-chain activity",
    description:
      "Every mint, listing, bid, and sale streams into the activity feed straight from Soroban contract events — no indexer, no delay.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Connect your wallet",
    description:
      "Freighter, xBull, Albedo, Lobstr, Rabet, or Hana — switch to Testnet and fund via friendbot.",
  },
  {
    step: "02",
    title: "Mint & list",
    description:
      "Mint an NFT with your royalty percentage, then list it at a fixed price or start an auction.",
  },
  {
    step: "03",
    title: "Trade & earn",
    description:
      "Buy, bid, and negotiate offers. As a creator you earn royalties on every resale, forever.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Minimal landing header */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-6 text-primary" />
          <span className="text-base font-semibold tracking-tight">
            Nova Market
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <GithubIcon className="size-4" />
              GitHub
            </a>
          </Button>
          <Button size="sm" asChild>
            <Link href="/marketplace">
              Launch App
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24">
          <Badge variant="outline" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            Live on Stellar Testnet
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            The NFT marketplace where{" "}
            <span className="text-primary">creators always get paid</span>
          </h1>
          <p className="max-w-2xl text-balance text-muted-foreground sm:text-lg">
            Mint, auction, and trade NFTs on Stellar. Royalties aren&apos;t a
            promise here — they&apos;re enforced by the smart contract on every
            single sale.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/marketplace">
                <Wallet className="size-4" />
                Launch Marketplace
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/activity">
                See live activity
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Live stats */}
        <section className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6">
          <LandingStats />
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Built different, on purpose
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
              Everything runs through a single audited-by-tests Soroban
              contract — the frontend is just a window into it.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border bg-card p-6 transition-colors hover:border-primary/40"
                >
                  <f.icon className="size-6 text-primary" />
                  <h3 className="mt-3 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Up and running in three steps
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="rounded-xl border p-6">
                <span className="font-mono text-sm text-primary">{s.step}</span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Button size="lg" asChild>
              <Link href="/marketplace">
                Start trading
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
