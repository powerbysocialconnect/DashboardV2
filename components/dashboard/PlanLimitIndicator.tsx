"use client";

import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";

interface PlanLimitIndicatorProps {
  label: string;
  current: number;
  max: number;
}

export function PlanLimitIndicator({
  label,
  current,
  max,
}: PlanLimitIndicatorProps) {
  if (max === -1) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span>{current} (Unlimited)</span>
        </div>
      </div>
    );
  }

  const percentage = Math.min((current / max) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= max;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="flex items-center gap-1.5">
          {isNearLimit && (
            <AlertTriangle
              className={`h-3.5 w-3.5 ${
                isAtLimit ? "text-destructive" : "text-amber-500"
              }`}
            />
          )}
          <span className={isAtLimit ? "font-medium text-destructive" : ""}>
            {current} / {max}
          </span>
        </span>
      </div>
      <Progress
        value={percentage}
        className={`h-1.5 ${
          isAtLimit
            ? "[&>div]:bg-destructive"
            : isNearLimit
            ? "[&>div]:bg-amber-500"
            : ""
        }`}
      />
    </div>
  );
}
