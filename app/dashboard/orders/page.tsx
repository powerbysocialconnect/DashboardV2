"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Order, OrderItem, Customer } from "@/types/database";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { FulfillmentBadge } from "@/components/commerce/FulfillmentBadge";
import { RefundBadge } from "@/components/commerce/RefundBadge";
import { FulfillmentPanel } from "@/components/commerce/FulfillmentPanel";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Package,
} from "lucide-react";

interface OrderRow extends Order {
  customer?: Pick<Customer, "name" | "email"> | null;
  order_items?: { id: string }[];
  products?: any[];
  address?: any;
}

const ORDER_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800 border-green-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const PAGE_SIZE = 15;

export default function OrdersPage() {
  const supabase = createClient();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeCurrency, setStoreCurrency] = useState("USD");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("stores")
        .select("id, currency")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setStoreId(data.id);
        setStoreCurrency(data.currency || "USD");
      }
    }
    init();
  }, [supabase]);

  const fetchOrders = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select(
          "*, customers!customer_id(name, email), order_items(id)",
          { count: "exact" }
        )
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search.trim()) {
        const term = search.trim();
        query = query.or(
          `name.ilike.%${term}%,email.ilike.%${term}%`,
          { referencedTable: "customers" }
        );
      }

      const { data, count, error } = await query;
      if (error) throw error;

      const rows: OrderRow[] = (data || []).map(
        (row: Record<string, unknown>) => {
          const customer = row.customers as OrderRow["customer"];
          const items = row.order_items as OrderRow["order_items"];
          return {
            ...(row as unknown as Order),
            customer,
            order_items: items,
          };
        }
      );

      setOrders(rows);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, storeId, page, statusFilter, search]);

  useEffect(() => {
    if (storeId) fetchOrders();
  }, [storeId, fetchOrders]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter]);

  async function openOrderDetail(order: OrderRow) {
    setSelectedOrder(order);
    setDetailLoading(true);
    try {
      const { data } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);
      setOrderItems((data as OrderItem[]) || []);
    } catch (err) {
      console.error("Failed to load order items:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;

      setSelectedOrder((prev) =>
        prev ? { ...prev, status: newStatus } : null
      );
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  }

  function truncateUUID(id: string) {
    return id.slice(0, 8) + "...";
  }

  function customerName(order: OrderRow) {
    if (!order.customer) return "Guest";
    return order.customer.name || order.customer.email || "Guest";
  }

  function renderAddress(order: OrderRow) {
    const address = order.shipping_address || order.address;
    if (!address) return <span className="text-muted-foreground">N/A</span>;
    
    // Address can be a string (legacy) or an object
    if (typeof address === 'string') {
      try {
        const parsed = JSON.parse(address);
        const parts = [parsed.line1, parsed.city, parsed.state, parsed.postal_code, parsed.country].filter(Boolean);
        return <span className="text-sm">{parts.join(", ") || address}</span>;
      } catch (e) {
        return <span className="text-sm">{address}</span>;
      }
    }

    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postal_code,
      address.country,
    ].filter(Boolean);
    return (
      <span className="text-sm">{parts.join(", ") || "No address data"}</span>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          View and manage your store orders
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {totalCount} order{totalCount !== 1 ? "s" : ""}
            </CardTitle>
            <Badge variant="outline">
              Page {page + 1} of {totalPages}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading && orders.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-lg font-medium text-muted-foreground">
                No orders found
              </p>
              <p className="text-sm text-muted-foreground">
                Orders will appear here when customers make purchases
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openOrderDetail(order)}
                      >
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {truncateUUID(order.id)}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">
                              {customerName(order)}
                            </p>
                            {order.customer?.email && (
                              <p className="text-xs text-muted-foreground">
                                {order.customer.email}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800 border-gray-200"}`}
                          >
                            {order.status}
                          </span>
                          {order.refund_status && order.refund_status !== "none" && (
                            <RefundBadge refundStatus={order.refund_status} />
                          )}
                        </TableCell>
                        <TableCell>
                          <FulfillmentBadge status={order.fulfillment_status} showIcon={false} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.total, order.currency || storeCurrency)}
                        </TableCell>
                        <TableCell className="text-center">
                          {order.order_items?.length || (Array.isArray(order.products) ? order.products.length : 0)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1}–
                  {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
      >
        {selectedOrder && (
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order {truncateUUID(selectedOrder.id)}
              </DialogTitle>
              <DialogDescription>
                Placed on {formatDateTime(selectedOrder.created_at)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <span
                    className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[selectedOrder.status] || "bg-gray-100 text-gray-800"}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(val) =>
                      updateOrderStatus(selectedOrder.id, val)
                    }
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.filter((s) => s.value !== "all").map(
                        (s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Customer</p>
                  <p>{customerName(selectedOrder)}</p>
                  {selectedOrder.customer?.email && (
                    <p className="text-muted-foreground">
                      {selectedOrder.customer.email}
                    </p>
                  )}
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">
                    Order Total
                  </p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(
                      selectedOrder.total,
                      selectedOrder.currency || storeCurrency
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Subtotal</p>
                  <p>{formatCurrency(selectedOrder.subtotal, selectedOrder.currency || storeCurrency)}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Tax</p>
                  <p>{formatCurrency(selectedOrder.tax, selectedOrder.currency || storeCurrency)}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Shipping</p>
                  <p>{formatCurrency(selectedOrder.shipping_cost, selectedOrder.currency || storeCurrency)}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Discount</p>
                  <p>-{formatCurrency(selectedOrder.discount_amount, selectedOrder.currency || storeCurrency)}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="mb-3 text-sm font-medium">Order Items</p>
                {detailLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (orderItems.length === 0 && (!selectedOrder.products || selectedOrder.products.length === 0)) ? (
                  <p className="text-sm text-muted-foreground italic">
                    No items found
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(orderItems.length > 0 ? orderItems : (selectedOrder.products || [])).map((item: any, idx: number) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border font-bold text-xs">
                            {item.quantity}x
                          </div>
                          <div>
                            <p className="text-sm font-bold">
                              {item.name || (item.products?.name) || `Product #${(item.product_id || "").slice(0, 5)}`}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                              {formatCurrency(item.unit_price || item.price || 0, selectedOrder.currency || storeCurrency)} each
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">
                            {formatCurrency((item.total_price || (item.price * item.quantity) || 0), selectedOrder.currency || storeCurrency)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Shipping Address
                  </h4>
                  {renderAddress(selectedOrder)}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Billing Address
                  </h4>
                  {selectedOrder.billing_address ? renderAddress({ address: selectedOrder.billing_address } as any) : "N/A"}
                </div>
              </div>

              {selectedOrder.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">
                      Notes
                    </p>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                </>
              )}

              <Separator />

              <FulfillmentPanel
                order={selectedOrder as Order}
                apiBasePath="/api/dashboard/orders"
                onUpdated={() => {
                  fetchOrders();
                  setSelectedOrder(null);
                }}
              />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
