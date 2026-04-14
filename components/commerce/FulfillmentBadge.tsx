import { Badge } from "@/components/ui/badge";
import type { FulfillmentStatus } from "@/types/database";
import { Package, Truck, CheckCircle2, XCircle, RotateCcw, Clock } from "lucide-react";

const config: Record<
  FulfillmentStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  unfulfilled: {
    label: "Unfulfilled",
    className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100",
    icon: Clock,
  },
  processing: {
    label: "Processing",
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
    icon: Package,
  },
  shipped: {
    label: "Shipped",
    className: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
    icon: XCircle,
  },
  returned: {
    label: "Returned",
    className: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
    icon: RotateCcw,
  },
};

interface FulfillmentBadgeProps {
  status: string | null | undefined;
  showIcon?: boolean;
}

export function FulfillmentBadge({ status, showIcon = true }: FulfillmentBadgeProps) {
  const key = (status || "unfulfilled") as FulfillmentStatus;
  const cfg = config[key] || config.unfulfilled;
  const Icon = cfg.icon;

  return (
    <Badge variant="outline" className={cfg.className}>
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {cfg.label}
    </Badge>
  );
}
