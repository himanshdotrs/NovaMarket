"use client";

import { useWallet } from "@/hooks/useWallet";
import { DashboardPanel } from "@/components/dashboard-panel";

export default function DashboardPage() {
  const { address } = useWallet();

  return <DashboardPanel address={address} />;
}
