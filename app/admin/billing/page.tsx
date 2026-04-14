"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Store, StoreBillingSettings, StoreAdminAction } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StoreWithBilling extends Store {
  billing?: StoreBillingSettings | null;
  owner_profile?: {
    subscription_status: string | null;
    subscription_plan: string | null;
    stripe_subscription_id: string | null;
  } | null;
}

const billingStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  trialing: "secondary",
  past_due: "destructive",
  canceled: "destructive",
  unpaid: "destructive",
};

export default function BillingPage() {
  const supabase = createClient();
  const [stores, setStores] = useState<StoreWithBilling[]>([]);
  const [events, setEvents] = useState<StoreAdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [planFilter, setPlanFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [trialFilter, setTrialFilter] = useState("all");

  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [compDialogOpen, setCompDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreWithBilling | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const { data: storesData, error: storesError } = await supabase
          .from("stores")
          .select("*, profiles:owner_id(subscription_status, subscription_plan, stripe_subscription_id)")
          .order("created_at", { ascending: false });

        if (storesError) throw storesError;

        const storeIds = (storesData || []).map((s: Store) => s.id);

        let billingMap: Record<string, StoreBillingSettings> = {};
        if (storeIds.length > 0) {
          const { data: billingData } = await supabase
            .from("store_billing_settings")
            .select("*")
            .in("store_id", storeIds);

          (billingData || []).forEach((b: StoreBillingSettings) => {
            billingMap[b.store_id] = b;
          });
        }

        const merged: StoreWithBilling[] = (storesData || []).map((s: any) => ({
          ...s,
          billing: billingMap[s.id] || null,
          owner_profile: s.profiles && !Array.isArray(s.profiles) ? s.profiles : null,
        }));
        setStores(merged);

        const { data: eventsData } = await supabase
          .from("store_admin_actions")
          .select("*")
          .in("action", [
            "trial_extended",
            "free_month_comped",
            "store_disabled",
            "store_enabled",
            "billing_override",
          ])
          .order("created_at", { ascending: false })
          .limit(50);

        setEvents(eventsData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load billing data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const filtered = useMemo(() => {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return stores.filter((s) => {
      const plan = s.billing?.subscription_plan || s.billing?.plan_name || s.owner_profile?.subscription_plan;
      const status = s.billing?.subscription_status || s.billing?.billing_status || s.owner_profile?.subscription_status;
      
      if (planFilter !== "all" && plan !== planFilter) return false;
      if (billingFilter !== "all" && status !== billingFilter) return false;
      if (trialFilter === "ending_soon") {
        if (!s.trial_ends_at) return false;
        const trialEnd = new Date(s.trial_ends_at);
        if (trialEnd > sevenDaysLater || trialEnd < now) return false;
      }
      return true;
    });
  }, [stores, planFilter, billingFilter, trialFilter]);

  async function callStoreStatusAPI(action: string, trialEndDate?: string) {
    if (!selectedStore) return;
    const res = await fetch("/api/admin/store-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: selectedStore.id,
        action,
        trialEndDate,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "API request failed");
    }
  }

  async function handleExtendTrial() {
    if (!selectedStore || !extendDate) return;
    setActionLoading(true);
    try {
      const newTrialDate = new Date(extendDate).toISOString();
      await callStoreStatusAPI("extend_trial", newTrialDate);

      setStores((prev) =>
        prev.map((s) =>
          s.id === selectedStore.id
            ? { 
                ...s, 
                trial_ends_at: newTrialDate,
                billing: s.billing ? { ...s.billing, trial_end: newTrialDate } : s.billing 
              }
            : s
        )
      );
      
      // Manually add the event to the UI without querying the DB again to feel snappy
      setEvents((prev) => [
        {
          id: Math.random().toString(),
          store_id: selectedStore.id,
          action: "trial_extended",
          details: { new_trial_end: newTrialDate, store_name: selectedStore.name },
          performed_by: "Admin",
          created_at: new Date().toISOString()
        } as unknown as StoreAdminAction,
        ...prev,
      ]);

      setExtendDialogOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to extend trial");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCompFreeMonth() {
    if (!selectedStore) return;
    setActionLoading(true);
    try {
      const newEnd = new Date();
      newEnd.setMonth(newEnd.getMonth() + 1);
      const newTrialDate = newEnd.toISOString();

      await callStoreStatusAPI("extend_trial", newTrialDate);

      setStores((prev) =>
        prev.map((s) =>
          s.id === selectedStore.id
            ? {
                ...s,
                trial_ends_at: newTrialDate,
                billing: s.billing
                  ? { ...s.billing, billing_status: "trialing", trial_end: newTrialDate }
                  : s.billing,
              }
            : s
        )
      );

      setEvents((prev) => [
        {
          id: Math.random().toString(),
          store_id: selectedStore.id,
          action: "trial_extended",
          details: { new_trial_end: newTrialDate, notes: "Comped Free Month", store_name: selectedStore.name },
          performed_by: "Admin",
          created_at: new Date().toISOString()
        } as unknown as StoreAdminAction,
        ...prev,
      ]);

      setCompDialogOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to comp free month");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDisableStore() {
    if (!selectedStore) return;
    setActionLoading(true);
    try {
      const isCurrentlyDisabled = selectedStore.is_disabled;
      const apiAction = isCurrentlyDisabled ? "enable" : "disable";
      
      await callStoreStatusAPI(apiAction);

      const newDisabledState = !isCurrentlyDisabled;
      
      setStores((prev) =>
        prev.map((s) =>
          s.id === selectedStore.id ? { ...s, is_disabled: newDisabledState, status: newDisabledState ? "disabled" : "live" } : s
        )
      );

      setEvents((prev) => [
        {
          id: Math.random().toString(),
          store_id: selectedStore.id,
          action: newDisabledState ? "store_disabled" : "store_enabled",
          details: { store_name: selectedStore.name },
          performed_by: "Admin",
          created_at: new Date().toISOString()
        } as unknown as StoreAdminAction,
        ...prev,
      ]);

      setDisableDialogOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update store");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-destructive text-lg">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing Controls</h1>
        <p className="text-muted-foreground mt-1">
          Manage store subscriptions, trials, and billing overrides
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="w-40">
          <label className="mb-1.5 block text-sm font-medium">Plan</label>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="store">Store</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <label className="mb-1.5 block text-sm font-medium">Billing Status</label>
          <Select value={billingFilter} onValueChange={setBillingFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trialing">Trialing</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <label className="mb-1.5 block text-sm font-medium">Trial</label>
          <Select value={trialFilter} onValueChange={setTrialFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ending_soon">Ending in 7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Subscription Status</TableHead>
              <TableHead>Trial End Date</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No stores found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {store.name}
                      {store.is_disabled && (
                        <Badge variant="destructive">Disabled</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">
                    {store.billing?.subscription_plan || store.billing?.plan_name || store.owner_profile?.subscription_plan || "—"}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const status = store.billing?.subscription_status || store.billing?.billing_status || store.owner_profile?.subscription_status;
                      return status ? (
                        <Badge variant={billingStatusVariant[status] || "outline"}>
                          {status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {store.trial_ends_at
                      ? new Date(store.trial_ends_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {(store.billing?.stripe_subscription_id || store.owner_profile?.stripe_subscription_id) ? (
                      <Badge variant="secondary">Subscribed</Badge>
                    ) : (
                      <span className="text-muted-foreground">No subscription</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStore(store);
                          setExtendDate(
                            store.trial_ends_at
                              ? new Date(store.trial_ends_at)
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          );
                          setExtendDialogOpen(true);
                        }}
                      >
                        Extend Trial
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStore(store);
                          setCompDialogOpen(true);
                        }}
                      >
                        Comp Month
                      </Button>
                      <Button
                        variant={store.is_disabled ? "default" : "destructive"}
                        size="sm"
                        onClick={() => {
                          setSelectedStore(store);
                          setDisableDialogOpen(true);
                        }}
                      >
                        {store.is_disabled ? "Enable" : "Disable"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Subscription Events Log */}
      {events.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Recent Billing Events</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {(event.details as any)?.store_name || 
                       stores.find(s => s.id === event.store_id)?.name || 
                       "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{event.action.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {event.details ? JSON.stringify(event.details) : "—"}
                    </TableCell>
                    <TableCell>
                      {new Date(event.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Extend Trial Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Trial</DialogTitle>
            <DialogDescription>
              Set a new trial end date for <strong>{selectedStore?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-1.5 block text-sm font-medium">New Trial End Date</label>
            <Input
              type="date"
              value={extendDate}
              onChange={(e) => setExtendDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExtendTrial}
              disabled={actionLoading || !extendDate}
            >
              {actionLoading ? "Extending..." : "Extend Trial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comp Free Month Dialog */}
      <Dialog open={compDialogOpen} onOpenChange={setCompDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comp Free Month</DialogTitle>
            <DialogDescription>
              Grant <strong>{selectedStore?.name}</strong> one free month by extending their
              trial period 30 days from today.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleCompFreeMonth} disabled={actionLoading}>
              {actionLoading ? "Processing..." : "Confirm Comp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Store Dialog */}
      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedStore?.is_disabled ? "Enable Store" : "Disable Store"}
            </DialogTitle>
            <DialogDescription>
              {selectedStore?.is_disabled
                ? `Re-enable ${selectedStore?.name}? The store will become accessible again.`
                : `Disable ${selectedStore?.name}? The store will no longer be accessible to customers.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisableDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={selectedStore?.is_disabled ? "default" : "destructive"}
              onClick={handleDisableStore}
              disabled={actionLoading}
            >
              {actionLoading
                ? "Processing..."
                : selectedStore?.is_disabled
                  ? "Enable Store"
                  : "Disable Store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
