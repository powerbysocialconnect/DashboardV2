"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { StoreOnboardingTask } from "@/types/database";
import { getOnboardingProgress } from "@/lib/stores/onboarding";
import { Progress } from "@/components/ui/progress";

interface OnboardingChecklistProps {
  tasks: StoreOnboardingTask[];
  onToggle?: (taskKey: string, completed: boolean) => void;
}

export function OnboardingChecklist({
  tasks,
  onToggle,
}: OnboardingChecklistProps) {
  const progress = getOnboardingProgress(tasks);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Onboarding Progress
          </span>
          <span className="text-muted-foreground">
            {progress.completed}/{progress.total} completed
          </span>
        </div>
        <Progress value={progress.percentage} className="h-2" />
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={async () => {
              // Special case: Stripe Connect onboarding
              if (task.task_key === "connect_payments" && !task.is_completed) {
                try {
                  const res = await fetch(`/api/dashboard/stores/${task.store_id}/connect-stripe`, { method: "POST" });
                  const data = await res.json();
                  if (data.url) {
                    window.location.href = data.url;
                    return;
                  }
                } catch (err) {
                  console.error("Stripe connect error:", err);
                }
              }
              onToggle?.(task.task_key, !task.is_completed);
            }}
            className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
          >
            {task.is_completed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">{task.title}</p>
              {task.description && (
                <p className="text-xs text-muted-foreground">
                  {task.description}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
