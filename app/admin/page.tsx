"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StoreStatusBadge } from "@/components/admin/StoreStatusBadge";
import type { Store, StoreStatus, VisionForm } from "@/types/database";
import {
  RefreshCw,
  Store as StoreIcon,
  FileText,
  Clock,
  Activity,
  Layers,
} from "lucide-react";

interface DashboardData {
  totalStores: number;
  statusCounts: Record<string, number>;
  expiringTrials: (Store & { owner_email?: string })[];
  latestVisionForms: VisionForm[];
  recentPublished: Store[];
  provisioningQueueCount: number;
}

const STATUS_CARDS: { status: StoreStatus; label: string; icon: string }[] = [
  { status: "draft", label: "Draft", icon: "pencil" },
  { status: "building", label: "Building", icon: "hammer" },
  { status: "live", label: "Live", icon: "globe" },
  { status: "disabled", label: "Disabled", icon: "ban" },
];

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const supabase = createClient();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [
        storesRes,
        trialsRes,
        visionRes,
        publishedRes,
        provisioningRes,
      ] = await Promise.all([
        supabase.from("stores").select("id, status"),
        supabase
          .from("stores")
          .select("*, profiles:owner_id(email)")
          .not("trial_ends_at", "is", null)
          .gte("trial_ends_at", new Date().toISOString())
          .lte(
            "trial_ends_at",
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          )
          .order("trial_ends_at", { ascending: true })
          .limit(10),
        supabase
          .from("vision_forms")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("stores")
          .select("*")
          .eq("status", "live")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("store_provisioning_jobs")
          .select("id", { count: "exact", head: true })
          .in("status", ["queued", "running"]),
      ]);

      const stores = storesRes.data || [];
      const statusCounts: Record<string, number> = {};
      for (const s of stores) {
        statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
      }

      const expiringTrials = (trialsRes.data || []).map((s: Record<string, unknown>) => ({
        ...s,
        owner_email: (s.profiles as Record<string, unknown>)?.email as string | undefined,
      })) as (Store & { owner_email?: string })[];

      setData({
        totalStores: stores.length,
        statusCounts,
        expiringTrials,
        latestVisionForms: (visionRes.data || []) as VisionForm[],
        recentPublished: (publishedRes.data || []) as Store[],
        provisioningQueueCount: provisioningRes.count || 0,
      });
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const handleRepairSync = async () => {
    setSyncing(true);
    try {
      // 1. Get all launched vision forms
      const { data: launchedVisions } = await supabase
        .from("vision_forms")
        .select("user_id, subdomain, brand_name")
        .eq("status", "launched");

      if (!launchedVisions || launchedVisions.length === 0) {
        alert("No launched vision forms found to sync.");
        return;
      }

      // 2. Find ALL stores that are NOT live
      const { data: storesToFix } = await supabase
        .from("stores")
        .select("id, name, owner_id, subdomain")
        .neq("status", "live");

      if (!storesToFix || storesToFix.length === 0) {
        alert("All stores are already Live or no draft stores exist!");
        return;
      }

      // 3. Match them up in Javascript to handle tiny mismatches like "nyla-clothing" vs "nylaclothing"
      const matchedStoreIds: string[] = [];

      for (const store of storesToFix) {
        const storeSubClean = (store.subdomain || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        
        const isMatch = launchedVisions.some(v => {
          // Exact user_id match
          if (store.owner_id && v.user_id && store.owner_id === v.user_id) return true;
          
          // Fuzzy subdomain match (e.g., both reduce to "nylaclothing")
          const visionSubClean = (v.subdomain || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          if (storeSubClean && visionSubClean && storeSubClean === visionSubClean) return true;

          return false;
        });

        if (isMatch) {
          matchedStoreIds.push(store.id);
        }
      }

      if (matchedStoreIds.length === 0) {
        alert("No draft stores found that match your launched Vision Forms.");
        return;
      }

      // 4. Update the matched stores to live via securing API route
      const response = await fetch("/api/admin/sync-stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeIds: matchedStoreIds })
      });

      if (!response.ok) {
        throw new Error("Failed to update via API");
      }

      alert(`Successfully synced ${storesToFix.length} stores to Live status!`);
      await fetchDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Platform overview and quick stats
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRepairSync}
            disabled={syncing || loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sync Statuses
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <StoreIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.totalStores ?? 0}</div>
          </CardContent>
        </Card>

        {STATUS_CARDS.map(({ status, label }) => (
          <Card key={status}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <StoreStatusBadge status={status} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {data?.statusCounts[status] ?? 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Provisioning Queue
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data?.provisioningQueueCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              jobs queued or running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Trials Ending Soon
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data?.expiringTrials.length ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              within next 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Two-column detail section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latest Vision Forms */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Latest Vision Forms</CardTitle>
              </div>
              <Badge variant="secondary">
                {data?.latestVisionForms.length ?? 0}
              </Badge>
            </div>
            <CardDescription>Recently submitted brand visions</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.latestVisionForms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No vision forms submitted yet
              </p>
            ) : (
              <div className="space-y-3">
                {data?.latestVisionForms.map((vf) => (
                  <div
                    key={vf.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {vf.brand_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vf.business_category || "No category"} &middot;{" "}
                        {new Date(vf.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        vf.status === "launched"
                          ? "default"
                          : vf.status === "new"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {vf.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Published Stores */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Recently Published</CardTitle>
              </div>
              <Badge variant="secondary">
                {data?.recentPublished.length ?? 0}
              </Badge>
            </div>
            <CardDescription>Latest stores that went live</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.recentPublished.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No stores published yet
              </p>
            ) : (
              <div className="space-y-3">
                {data?.recentPublished.map((store) => (
                  <Link
                    key={store.id}
                    href={`/admin/stores/${store.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {store.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {store.subdomain}.pixeocommerce.com &middot;{" "}
                        {new Date(store.published_at || store.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <StoreStatusBadge status={store.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiring Trials */}
      {data && data.expiringTrials.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Trials Ending Soon</CardTitle>
            </div>
            <CardDescription>
              Stores with trials expiring within 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.expiringTrials.map((store) => {
                const daysLeft = Math.ceil(
                  (new Date(store.trial_ends_at!).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <Link
                    key={store.id}
                    href={`/admin/stores/${store.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {store.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {store.owner_email || "Unknown owner"}
                      </p>
                    </div>
                    <Badge
                      variant={daysLeft <= 2 ? "destructive" : "outline"}
                    >
                      {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
