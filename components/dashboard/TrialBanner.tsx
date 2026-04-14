"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { getTrialDaysRemaining, isTrialExpiringSoon } from "@/lib/billing/plans";
import Link from "next/link";

interface TrialBannerProps {
  trialEndsAt: string | null;
}

export function TrialBanner({ trialEndsAt }: TrialBannerProps) {
  const days = getTrialDaysRemaining(trialEndsAt);

  if (days === null || days > 7) return null;

  if (days === 0) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              Your trial has expired
            </p>
            <p className="text-xs text-destructive/80">
              Subscribe to a plan to keep your store active.
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className="rounded-md bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Subscribe Now
          </Link>
        </div>
      </div>
    );
  }

  const isUrgent = days <= 3;

  return (
    <div
      className={`rounded-lg border p-4 ${
        isUrgent
          ? "border-amber-500/50 bg-amber-50 dark:bg-amber-950/20"
          : "border-blue-500/50 bg-blue-50 dark:bg-blue-950/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <Clock
          className={`h-5 w-5 ${
            isUrgent ? "text-amber-600" : "text-blue-600"
          }`}
        />
        <div className="flex-1">
          <p
            className={`text-sm font-medium ${
              isUrgent ? "text-amber-800 dark:text-amber-200" : "text-blue-800 dark:text-blue-200"
            }`}
          >
            {days} day{days === 1 ? "" : "s"} left in your trial
          </p>
          <p
            className={`text-xs ${
              isUrgent ? "text-amber-700/80 dark:text-amber-300/80" : "text-blue-700/80 dark:text-blue-300/80"
            }`}
          >
            Subscribe before your trial ends to avoid interruptions.
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className={`rounded-md px-4 py-2 text-xs font-medium ${
            isUrgent
              ? "bg-amber-600 text-white hover:bg-amber-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          View Plans
        </Link>
      </div>
    </div>
  );
}
