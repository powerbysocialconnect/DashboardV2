import { Badge } from "@/components/ui/badge";
import type { StoreStatus } from "@/types/database";

const statusConfig: Record<StoreStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  vision_submitted: { label: "Vision Submitted", variant: "outline" },
  building: { label: "Building", variant: "default" },
  review_ready: { label: "Review Ready", variant: "default" },
  live: { label: "Live", variant: "default" },
  maintenance: { label: "Maintenance", variant: "secondary" },
  disabled: { label: "Disabled", variant: "destructive" },
};

export function StoreStatusBadge({ status }: { status: StoreStatus }) {
  const config = statusConfig[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
