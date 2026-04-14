"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreStatusBadge } from "@/components/admin/StoreStatusBadge";
import type { StoreStatus } from "@/types/database";
import { Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface StoreRow {
  id: string;
  name: string;
  subdomain: string;
  status: StoreStatus;
  created_at: string;
  owner?: { email: string; full_name: string | null; subscription_plan?: string | null } | null;
  billing?: { plan_name: string | null; subscription_plan: string | null } | null;
}

const PAGE_SIZE = 15;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "vision_submitted", label: "Vision Submitted" },
  { value: "building", label: "Building" },
  { value: "review_ready", label: "Review Ready" },
  { value: "live", label: "Live" },
  { value: "maintenance", label: "Maintenance" },
  { value: "disabled", label: "Disabled" },
];

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const supabase = createClient();

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("stores")
        .select(
          "id, name, subdomain, status, created_at, owner_id",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search.trim()}%,subdomain.ilike.%${search.trim()}%`
        );
      }

      const { data, count, error } = await query;
      if (error) {
        console.error("Store query error:", error);
        throw error;
      }

      // Collect all owner IDs from stores
      const ownerIds = (data || [])
        .map((row: any) => row.owner_id)
        .filter(Boolean);

      // Fetch profiles for all owners separately (bypasses RLS issues with joins)
      let profileMap: Record<string, any> = {};
      if (ownerIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, email, full_name, subscription_plan, subscription_status")
          .in("id", ownerIds);

        if (profileData) {
          profileData.forEach((p: any) => {
            profileMap[p.id] = p;
          });
        }
      }

      // Also check subscription_events for latest plan info
      let latestEventsByOwner: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: eventData } = await supabase
          .from("subscription_events")
          .select("user_id, plan_name, created_at")
          .in("user_id", ownerIds)
          .order("created_at", { ascending: false });

        if (eventData) {
          eventData.forEach((evt: any) => {
            if (!latestEventsByOwner[evt.user_id]) {
              latestEventsByOwner[evt.user_id] = evt.plan_name;
            }
          });
        }
      }

      const rows: StoreRow[] = (data || []).map((row: any) => {
        const profile = profileMap[row.owner_id] || null;
        
        // Priority: Subscription Events > Profile subscription_plan > "Free"
        const planName = latestEventsByOwner[row.owner_id] || 
                        profile?.subscription_plan || 
                        "Free";

        return {
          id: row.id as string,
          name: row.name as string,
          subdomain: row.subdomain as string,
          status: row.status as StoreStatus,
          created_at: row.created_at as string,
          owner: profile ? { email: profile.email, full_name: profile.full_name, subscription_plan: profile.subscription_plan } : null,
          billing: { 
            plan_name: planName,
            subscription_plan: profile?.subscription_plan || null
          },
        };
      });

      setStores(rows);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Failed to fetch stores:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, page, statusFilter, search]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stores</h1>
        <p className="text-muted-foreground">
          Manage all stores on the platform
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by store name or subdomain..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {totalCount} store{totalCount !== 1 ? "s" : ""}
            </CardTitle>
            <Badge variant="outline">
              Page {page + 1} of {totalPages}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading && stores.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-medium text-muted-foreground">
                No stores found
              </p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Name</TableHead>
                      <TableHead>Subdomain</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/admin/stores/${store.id}`}
                            className="hover:underline"
                          >
                            {store.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {store.subdomain}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[180px]">
                            <p className="truncate text-sm">
                              {store.owner?.full_name || "—"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {store.owner?.email || "No owner"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StoreStatusBadge status={store.status} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {store.billing?.plan_name || "Free"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(store.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/stores/${store.id}`}>
                              <ExternalLink className="mr-1 h-3.5 w-3.5" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1}–
                  {Math.min((page + 1) * PAGE_SIZE, totalCount)} of{" "}
                  {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
