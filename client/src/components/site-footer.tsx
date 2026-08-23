import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";
import { GithubIcon } from "@/components/github-icon";
import {
  CONTRACT_ID,
  EXPLORER_CONTRACT_URL,
  GITHUB_URL,
} from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div className="max-w-xs">
            <p className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-primary" />
              Nova Market
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Mint, auction, and trade NFTs with creator royalties enforced
              on-chain — powered by Soroban smart contracts.
            </p>
            <Badge variant="outline" className="mt-3">
              Stellar Testnet
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="flex flex-col gap-2">
              <p className="font-medium">App</p>
              <Link
                href="/marketplace"
                className="text-muted-foreground hover:text-foreground"
              >
                Marketplace
              </Link>
              <Link
                href="/auctions"
                className="text-muted-foreground hover:text-foreground"
              >
                Auctions
              </Link>
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium">Resources</p>
              <a
                href={"https://github.com/himanshdotrs/NovaMarket"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <GithubIcon className="size-3.5" />
                GitHub
              </a>
              <a
                href={EXPLORER_CONTRACT_URL(CONTRACT_ID)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-3.5" />
                Contract on Explorer
              </a>
              <a
                href="https://github.com/himanshdotrs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-3.5" />
                Developed by - Himanshu Sonwane
              </a>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} Nova Market — open source under MIT.
          </p>
          <a
            href={"https://github.com/himanshdotrs/NovaMarket"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <GithubIcon className="size-3.5" />
            View source on GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
