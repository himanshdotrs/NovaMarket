"use client";

import { ExternalLink, TrendingUp } from "lucide-react";
import { useSales } from "@/hooks/useContractData";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EXPLORER_ACCOUNT_URL } from "@/lib/config";
import { formatDateTime, fromStroops, shortAddress } from "@/lib/utils";
import type { Sale } from "@/types";

const KIND_VARIANT: Record<Sale["kind"], "default" | "secondary" | "outline"> =
  {
    direct: "secondary",
    auction: "default",
    offer: "outline",
  };

export function SalesTable() {
  const { data: sales, isLoading } = useSales();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          Completed Sales
        </CardTitle>
        <CardDescription>
          Every settled trade with the royalty paid to the creator
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !sales || sales.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sales yet — completed purchases, auction settlements, and
            accepted offers will show up here.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NFT</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Seller → Buyer</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Royalty</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s, i) => (
                <TableRow key={`${s.token_id.toString()}-${s.timestamp.toString()}-${i}`}>
                  <TableCell className="font-mono text-muted-foreground">
                    #{s.token_id.toString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={KIND_VARIANT[s.kind]}>{s.kind}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <AccountLink address={s.seller} />
                    <span className="mx-1 text-muted-foreground">→</span>
                    <AccountLink address={s.buyer} />
                  </TableCell>
                  <TableCell className="text-right">
                    {fromStroops(s.price)} XLM
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {fromStroops(s.royalty_paid)} XLM
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDateTime(Number(s.timestamp) * 1000)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AccountLink({ address }: { address: string }) {
  return (
    <a
      href={EXPLORER_ACCOUNT_URL(address)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
    >
      {shortAddress(address)}
      <ExternalLink className="size-3 text-muted-foreground" />
    </a>
  );
}
