"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, LogOut, Wallet } from "lucide-react";
import type { ISupportedWallet } from "@creit.tech/stellar-wallets-kit";
import { supportedWallets } from "@/lib/wallet";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EXPLORER_ACCOUNT_URL } from "@/lib/config";
import { shortAddress } from "@/lib/utils";

export function WalletButton() {
  const { address, isConnected, connect, disconnect, connectingId } =
    useWallet();
  const [open, setOpen] = useState(false);
  const [wallets, setWallets] = useState<ISupportedWallet[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingWallets(true);
    supportedWallets()
      .then((w) => {
        if (!cancelled) setWallets(w);
      })
      .finally(() => {
        if (!cancelled) setLoadingWallets(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSelect = async (wallet: ISupportedWallet) => {
    try {
      await connect(wallet);
      setOpen(false);
    } catch {
      // useWallet already surfaced a toast — keep the picker open to retry.
    }
  };

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="font-mono">
            <Wallet className="size-4" />
            {shortAddress(address)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a
              href={EXPLORER_ACCOUNT_URL(address)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" />
              View on Explorer
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => disconnect()}>
            <LogOut className="size-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Wallet className="size-4" />
        Connect Wallet
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect a wallet</DialogTitle>
            <DialogDescription>
              Choose a Stellar wallet to connect to Track Link.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {loadingWallets && (
              <p className="text-sm text-muted-foreground">
                Loading wallets…
              </p>
            )}
            {!loadingWallets && wallets.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No wallets found. Install Freighter or another Stellar wallet
                extension.
              </p>
            )}
            {wallets.map((w) => (
              <Button
                key={w.id}
                type="button"
                variant="outline"
                className="justify-start h-auto py-2"
                disabled={connectingId === w.id}
                onClick={() => handleSelect(w)}
              >
                {connectingId === w.id ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.icon} alt="" className="size-5 rounded-sm" />
                )}
                <span className="flex-1 text-left">{w.name}</span>
                {!w.isAvailable && (
                  <span className="text-xs text-muted-foreground">
                    Not installed
                  </span>
                )}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
