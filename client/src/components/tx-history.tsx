"use client";

import { useEffect } from "react";
import { CheckCircle2, ExternalLink, History, Loader2, XCircle } from "lucide-react";
import { reconcilePendingTxs, useTxStore } from "@/stores/tx-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EXPLORER_TX_URL } from "@/lib/config";
import { shortHash, timeAgo } from "@/lib/utils";
import type { TrackedTx } from "@/types";

const STATUS_ICON: Record<TrackedTx["status"], React.ElementType> = {
  PENDING: Loader2,
  SUCCESS: CheckCircle2,
  FAILED: XCircle,
};

const STATUS_VARIANT: Record<
  TrackedTx["status"],
  "outline" | "secondary" | "destructive"
> = {
  PENDING: "outline",
  SUCCESS: "secondary",
  FAILED: "destructive",
};

export function TxHistory() {
  const txs = useTxStore((s) => s.txs);

  // Resolve any txs left "PENDING" by a previous session.
  useEffect(() => {
    void reconcilePendingTxs();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          Your Transactions
        </CardTitle>
        <CardDescription>
          Transactions submitted from this browser
        </CardDescription>
      </CardHeader>
      <CardContent>
        {txs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing submitted yet — actions you take will show up here.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {txs.map((tx) => {
              const Icon = STATUS_ICON[tx.status];
              return (
                <a
                  key={tx.hash}
                  href={EXPLORER_TX_URL(tx.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-accent"
                >
                  <Icon
                    className={`size-4 shrink-0 ${
                      tx.status === "PENDING" ? "animate-spin text-muted-foreground" : ""
                    } ${tx.status === "SUCCESS" ? "text-primary" : ""} ${
                      tx.status === "FAILED" ? "text-destructive" : ""
                    }`}
                  />
                  <div className="flex-1">
                    <p className="leading-snug">{tx.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {shortHash(tx.hash)} · {timeAgo(tx.createdAt)}
                      {tx.error ? ` · ${tx.error}` : ""}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[tx.status]}>
                    {tx.status}
                  </Badge>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                </a>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
