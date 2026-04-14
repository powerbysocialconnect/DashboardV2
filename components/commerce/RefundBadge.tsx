import { Badge } from "@/components/ui/badge";

interface RefundBadgeProps {
  refundStatus: string | null | undefined;
  refundedAmount?: number | null;
  currency?: string;
}

export function RefundBadge({ refundStatus, refundedAmount, currency = "USD" }: RefundBadgeProps) {
  if (!refundStatus || refundStatus === "none") return null;

  const formatted =
    refundedAmount != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(refundedAmount)
      : null;

  if (refundStatus === "full") {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
        Refunded{formatted ? ` (${formatted})` : ""}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
      Partial Refund{formatted ? ` (${formatted})` : ""}
    </Badge>
  );
}
