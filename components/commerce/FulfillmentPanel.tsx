"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FulfillmentBadge } from "./FulfillmentBadge";
import { RefundBadge } from "./RefundBadge";
import type { FulfillmentStatus, Order } from "@/types/database";
import { formatDateTime } from "@/lib/utils";
import { Truck, Package, ExternalLink, Save } from "lucide-react";
import { toast } from "sonner";

interface FulfillmentPanelProps {
  order: Order;
  apiBasePath: string; // "/api/admin/orders" or "/api/dashboard/orders"
  onUpdated: () => void;
}

const FULFILLMENT_OPTIONS: { value: FulfillmentStatus; label: string }[] = [
  { value: "unfulfilled", label: "Unfulfilled" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];

const CARRIER_OPTIONS = [
  "USPS",
  "UPS",
  "FedEx",
  "DHL",
  "Royal Mail",
  "Canada Post",
  "Australia Post",
  "Other",
];

export function FulfillmentPanel({
  order,
  apiBasePath,
  onUpdated,
}: FulfillmentPanelProps) {
  const [status, setStatus] = useState<FulfillmentStatus>(
    (order.fulfillment_status as FulfillmentStatus) || "unfulfilled"
  );
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url || "");
  const [carrier, setCarrier] = useState(order.shipping_carrier || "");
  const [notes, setNotes] = useState(order.fulfillment_notes || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${apiBasePath}/${order.id}/fulfillment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillment_status: status,
          tracking_number: trackingNumber || null,
          tracking_url: trackingUrl || null,
          shipping_carrier: carrier || null,
          fulfillment_notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      toast.success("Fulfillment updated");
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Package className="h-4 w-4" />
          Fulfillment
        </h3>
        <FulfillmentBadge status={order.fulfillment_status} />
      </div>

      {order.refund_status && order.refund_status !== "none" && (
        <RefundBadge
          refundStatus={order.refund_status}
          refundedAmount={order.refunded_amount}
          currency={order.currency}
        />
      )}

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Fulfillment Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as FulfillmentStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FULFILLMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Shipping Carrier</Label>
          <Select value={carrier} onValueChange={setCarrier}>
            <SelectTrigger>
              <SelectValue placeholder="Select carrier" />
            </SelectTrigger>
            <SelectContent>
              {CARRIER_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tracking Number</Label>
          <Input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="e.g. 1Z999AA10123456784"
          />
        </div>

        <div className="space-y-2">
          <Label>Tracking URL</Label>
          <div className="flex gap-2">
            <Input
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1"
            />
            {trackingUrl && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(trackingUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Fulfillment Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes about this shipment..."
          rows={2}
        />
      </div>

      {/* Timestamps */}
      {(order.fulfilled_at || order.delivered_at) && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {order.fulfilled_at && (
            <span className="flex items-center gap-1">
              <Truck className="h-3 w-3" /> Shipped: {formatDateTime(order.fulfilled_at)}
            </span>
          )}
          {order.delivered_at && (
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" /> Delivered: {formatDateTime(order.delivered_at)}
            </span>
          )}
          {order.refunded_at && (
            <span className="flex items-center gap-1">
              Refunded: {formatDateTime(order.refunded_at)}
            </span>
          )}
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : "Update Fulfillment"}
      </Button>
    </div>
  );
}
