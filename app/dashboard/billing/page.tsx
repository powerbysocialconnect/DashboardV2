"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Separator } from "@/components/ui/separator";
import type { Store, StoreBillingSettings } from "@/types/database";
import { formatDate } from "@/lib/utils";
import {
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
  X,
  MessageSquare,
} from "lucide-react";

const PLAN_FEATURES = [
  {
    feature: "Products",
    starter: "Up to 100",
    premium: "Up to 250",
    maintenance: "Up to 500",
  },
  {
    feature: "Orders / month",
    starter: "100",
    premium: "1,000",
    maintenance: "Unlimited",
  },
  {
    feature: "Storage",
    starter: "500 MB",
    premium: "5 GB",
    maintenance: "50 GB",
  },
  {
    feature: "Custom domain",
    starter: false,
    premium: true,
    maintenance: true,
  },
  {
    feature: "Remove branding",
    starter: false,
    premium: true,
    maintenance: true,
  },
  {
    feature: "Priority support",
    starter: false,
    premium: false,
    maintenance: true,
  },
  {
    feature: "Advanced analytics",
    starter: true,
    premium: true,
    maintenance: true,
  },
  {
    feature: "Custom CSS",
    starter: false,
    premium: true,
    maintenance: true,
  },
  {
    feature: "API access",
    starter: false,
    premium: false,
    maintenance: true,
  },
];

function StatusIcon({ status }: { status: string | null }) {
  switch (status) {
    case "active":
    case "free":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "trialing":
      return <Clock className="h-5 w-5 text-blue-600" />;
    case "past_due":
    case "cancelled":
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    default:
      return <CreditCard className="h-5 w-5 text-muted-foreground" />;
  }
}

function statusLabel(status: string | null) {
  if (!status) return "No subscription";
  if (status === "free") return "Active";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function BillingPage() {
  const supabase = createClient();
  const [store, setStore] = useState<Store | null>(null);
  const [billing, setBilling] = useState<StoreBillingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .limit(1)
        .single();

      if (!storeData) {
        setLoading(false);
        return;
      }

      setStore(storeData as Store);

      const { data: billingData } = await supabase
        .from("store_billing_settings")
        .select("*")
        .eq("store_id", storeData.id)
        .limit(1)
        .single();

      if (billingData) {
        setBilling(billingData as StoreBillingSettings);
      }

      setLoading(false);
    }
    init();
  }, [supabase]);

  function trialDaysRemaining(): number | null {
    const trialEnd = store?.trial_ends_at || billing?.trial_end;
    if (!trialEnd) return null;
    const end = new Date(trialEnd);
    const now = new Date();
    const diff = Math.ceil(
      (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : 0;
  }

  const daysLeft = trialDaysRemaining();
  const rawPlan = (billing?.plan_name || "🌱 Starter Store").toLowerCase();
  const currentPlan = rawPlan.includes("premium") ? "premium" : rawPlan.includes("maintenance") ? "maintenance" : "starter";
  const billingStatus = billing?.billing_status || null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-2 h-9 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing details
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Current Plan */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="mt-1 text-2xl font-bold capitalize">
                  {currentPlan}
                </p>
              </div>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Subscription Status
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusIcon status={billingStatus} />
                  <p className="text-lg font-semibold">
                    {statusLabel(billingStatus)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trial Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trial Status</p>
                {daysLeft !== null ? (
                  <div className="mt-1">
                    <p className="text-2xl font-bold">
                      {daysLeft}{" "}
                      <span className="text-base font-normal text-muted-foreground">
                        day{daysLeft !== 1 ? "s" : ""} left
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ends{" "}
                      {formatDate(
                        store?.trial_ends_at || billing?.trial_end || ""
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-lg font-semibold text-muted-foreground">
                    No active trial
                  </p>
                )}
              </div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Comparison</CardTitle>
          <CardDescription>
            Compare features across available plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Feature</TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center">
                      <span>🌱 Starter</span>
                      {currentPlan === "starter" && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          Current
                        </Badge>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center">
                      <span>💎 Premium</span>
                      {currentPlan === "premium" && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          Current
                        </Badge>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center">
                      <span>🔧 Maintenance</span>
                      {currentPlan === "maintenance" && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          Current
                        </Badge>
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PLAN_FEATURES.map((row) => (
                  <TableRow key={row.feature}>
                    <TableCell className="font-medium">
                      {row.feature}
                    </TableCell>
                    {(["starter", "premium", "maintenance"] as const).map((plan) => (
                      <TableCell key={plan} className="text-center">
                        {typeof row[plan] === "boolean" ? (
                          row[plan] ? (
                            <Check className="mx-auto h-4 w-4 text-green-600" />
                          ) : (
                            <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
                          )
                        ) : (
                          <span className="text-sm">{row[plan]}</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 text-center">
            <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              Contact support for billing details
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Email support@pixeocommerce.com for invoices, receipts, or billing
              questions
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
