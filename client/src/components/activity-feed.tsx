"use client";

import {
  Activity,
  Check,
  ExternalLink,
  Gavel,
  RefreshCw,
  Sparkles,
  Tag,
  TrendingUp,
} from "lucide-react";
import { useEventFeed } from "@/hooks/useEventFeed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EXPLORER_ACCOUNT_URL, EXPLORER_TX_URL } from "@/lib/config";
import { shortAddress, shortHash, timeAgo } from "@/lib/utils";
import type { MarketEventType } from "@/types";

const ICONS: Record<MarketEventType, React.ElementType> = {
  minted: Sparkles,
  listed: Tag,
  unlisted: Tag,
  purchase: Check,
  auction_created: Gavel,
  bid_placed: Gavel,
  auction_settled: Gavel,
  auction_cancelled: Gavel,
  offer_made: TrendingUp,
  offer_cancelled: TrendingUp,
  offer_accepted: TrendingUp,
};

export function ActivityFeed() {
  const { data: events, isLoading, isError, refetch } = useEventFeed(50);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          Live Activity
        </CardTitle>
        <CardDescription>
          Every market action, straight from on-chain contract events
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError && (!events || events.length === 0) ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Could not load the event feed.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </div>
        ) : !events || events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No on-chain activity yet — mint or trade an NFT to see events here.
          </p>
        ) : (
          <ScrollArea className="h-105 pr-4">
            <div className="flex flex-col gap-3">
              {events.map((e) => {
                const Icon = ICONS[e.type] ?? Activity;
                return (
                  <div
                    key={e.id}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm"
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug">{e.action}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        {e.address && (
                          <a
                            href={EXPLORER_ACCOUNT_URL(e.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono underline-offset-2 hover:underline"
                          >
                            {shortAddress(e.address)}
                          </a>
                        )}
                        <span>{timeAgo(e.ledgerClosedAt)}</span>
                        <a
                          href={EXPLORER_TX_URL(e.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 font-mono underline-offset-2 hover:underline"
                        >
                          {shortHash(e.txHash)}
                          <ExternalLink className="size-3" />
                        </a>
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {e.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
