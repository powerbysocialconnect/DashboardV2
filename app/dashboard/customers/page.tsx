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
import type { Customer } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Mail,
  Phone,
  CalendarDays,
  ShoppingBag,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "created_at", label: "Joined Date" },
  { value: "total_spent", label: "Total Spent" },
  { value: "total_orders", label: "Total Orders" },
];

const PAGE_SIZE = 15;

export default function CustomersPage() {
  const supabase = createClient();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeCurrency, setStoreCurrency] = useState("USD");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

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
        .limit(1)
        .single();
      if (data) {
        setStoreId(data.id);
        setStoreCurrency(data.currency || "USD");
      }
    }
    init();
  }, [supabase]);

  const fetchCustomers = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      let query = supabase
        .from("customers")
        .select("*", { count: "exact" })
        .eq("store_id", storeId)
        .order(sortBy, { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        const term = search.trim();
        query = query.or(
          `name.ilike.%${term}%,email.ilike.%${term}%`
        );
      }

      const { data, count, error } = await query;
      if (error) throw error;

      setCustomers((data as Customer[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, storeId, page, sortBy, search]);

  useEffect(() => {
    if (storeId) fetchCustomers();
  }, [storeId, fetchCustomers]);

  useEffect(() => {
    setPage(0);
  }, [search, sortBy]);

  function customerName(c: Customer) {
    return c.name || c.email || "—";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">
          View and manage your store&apos;s customers
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
              {totalCount} customer{totalCount !== 1 ? "s" : ""}
            </CardTitle>
            <Badge variant="outline">
              Page {page + 1} of {totalPages}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading && customers.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-lg font-medium text-muted-foreground">
                No customers yet
              </p>
              <p className="text-sm text-muted-foreground">
                Customers will appear here after their first purchase
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-center">Orders</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <TableCell className="font-medium">
                          {customerName(customer)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {customer.email}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {customer.phone || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {customer.total_orders}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(customer.total_spent, storeCurrency)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(customer.created_at)}
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
        open={!!selectedCustomer}
        onOpenChange={(open) => {
          if (!open) setSelectedCustomer(null);
        }}
      >
        {selectedCustomer && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{customerName(selectedCustomer)}</DialogTitle>
              <DialogDescription>
                Customer since {formatDate(selectedCustomer.created_at)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedCustomer.email}</span>
                </div>
                {selectedCustomer.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>Joined {formatDate(selectedCustomer.created_at)}</span>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <ShoppingBag className="h-8 w-8 text-primary/70" />
                    <div>
                      <p className="text-2xl font-bold">
                        {selectedCustomer.total_orders}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Orders
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 text-sm font-bold">
                      $
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {formatCurrency(
                          selectedCustomer.total_spent,
                          storeCurrency
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Spent
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
