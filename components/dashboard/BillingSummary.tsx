"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Clock, AlertTriangle } from "lucide-react";
import { getPlan, getTrialDaysRemaining, isTrialExpiringSoon } from "@/lib/billing/plans";

interface BillingSummaryProps {
  planName: string | null;
  trialEndsAt: string | null;
  billingStatus: string | null;
  subscriptionId: string | null;
}

export function BillingSummary({
  planName,
  trialEndsAt,
  billingStatus,
  subscriptionId,
}: BillingSummaryProps) {
  const plan = getPlan(planName);
  const trialDays = getTrialDaysRemaining(trialEndsAt);
  const expiringSoon = isTrialExpiringSoon(trialEndsAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4" />
          Billing Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Plan</span>
          <Badge variant="outline">{plan.displayName}</Badge>
        </div>

        {trialDays !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Trial</span>
            <div className="flex items-center gap-2">
              {expiringSoon && (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              )}
              <Badge
                variant={
                  trialDays === 0
                    ? "destructive"
                    : expiringSoon
                    ? "secondary"
                    : "outline"
                }
              >
                {trialDays === 0
                  ? "Expired"
                  : `${trialDays} day${trialDays === 1 ? "" : "s"} left`}
              </Badge>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge
            variant={
              billingStatus === "active"
                ? "default"
                : billingStatus === "trialing"
                ? "secondary"
                : "destructive"
            }
          >
            {billingStatus || "No subscription"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Products</span>
          <span className="text-sm">
            {plan.maxProducts === -1 ? "Unlimited" : `Up to ${plan.maxProducts}`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Price</span>
          <span className="text-sm font-medium">
            ${plan.priceMonthly}/mo
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
