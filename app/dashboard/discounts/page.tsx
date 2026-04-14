"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Ticket, Loader2, Trash2, Edit2 } from "lucide-react";
import type { Discount, Store } from "@/types/database";
import { toast } from "sonner";

export default function DiscountsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    type: "percentage" as "percentage" | "fixed",
    value: "",
    minOrder: "",
    maxUses: "",
    startsAt: "",
    expiresAt: "",
    isActive: true,
  });

  const router = useRouter();
  const supabase = createClient();

  const loadDiscounts = useCallback(async (storeId: string) => {
    const res = await fetch(`/api/dashboard/stores/${storeId}/discounts`);
    const data = await res.json();
    if (data.discounts) {
      setDiscounts(data.discounts);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: stores } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!stores || stores.length === 0) {
        router.push("/login");
        return;
      }

      const currentStore = stores[0] as Store;
      setStore(currentStore);
      await loadDiscounts(currentStore.id);
      setLoading(false);
    }

    init();
  }, [supabase, router, loadDiscounts]);

  const handleCreateDiscount = async () => {
    if (!store || !formData.code.trim() || !formData.value) return;

    // Validation
    if (formData.startsAt && formData.expiresAt && new Date(formData.expiresAt) < new Date(formData.startsAt)) {
      toast.error("End date cannot be before start date");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/dashboard/stores/${store.id}/discounts`, {
        method: "POST",
        body: JSON.stringify({
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim() || null,
          type: formData.type,
          value: parseFloat(formData.value),
          min_order_amount: formData.minOrder ? parseFloat(formData.minOrder) : null,
          max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
          starts_at: formData.startsAt ? new Date(formData.startsAt).toISOString() : null,
          expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
          is_active: formData.isActive,
        }),
      });

      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Discount code created and synced to Stripe");
        setIsAddDialogOpen(false);
        resetForm();
        await loadDiscounts(store.id);
      }
    } catch (err) {
      toast.error("Failed to create discount");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDiscount = async () => {
    if (!store || !editingDiscount || !formData.code.trim() || !formData.value) return;

    // Validation
    if (formData.startsAt && formData.expiresAt && new Date(formData.expiresAt) < new Date(formData.startsAt)) {
      toast.error("End date cannot be before start date");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/dashboard/stores/${store.id}/discounts/${editingDiscount.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim() || null,
          type: formData.type,
          value: parseFloat(formData.value),
          min_order_amount: formData.minOrder ? parseFloat(formData.minOrder) : null,
          max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
          starts_at: formData.startsAt ? new Date(formData.startsAt).toISOString() : null,
          expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
          is_active: formData.isActive,
        }),
      });

      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Discount updated");
        setIsEditDialogOpen(false);
        setEditingDiscount(null);
        resetForm();
        await loadDiscounts(store.id);
      }
    } catch (err) {
      toast.error("Failed to update discount");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      type: "percentage",
      value: "",
      minOrder: "",
      maxUses: "",
      startsAt: "",
      expiresAt: "",
      isActive: true,
    });
  };

  const handleEditClick = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      description: discount.description || "",
      type: discount.type as "percentage" | "fixed",
      value: discount.value.toString(),
      minOrder: discount.min_order_amount?.toString() || "",
      maxUses: discount.max_uses?.toString() || "",
      startsAt: discount.starts_at ? new Date(discount.starts_at).toISOString().split('T')[0] : "",
      expiresAt: discount.expires_at ? new Date(discount.expires_at).toISOString().split('T')[0] : "",
      isActive: discount.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteDiscount = async (id: string, stripeId: string | null) => {
    if (!store) return;
    if (!confirm("Are you sure you want to delete this discount? This will also remove it from Stripe.")) return;

    try {
      const res = await fetch(`/api/dashboard/stores/${store.id}/discounts/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Discount deleted");
        await loadDiscounts(store.id);
      }
    } catch (err) {
      toast.error("Failed to delete discount");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: store?.currency || "GBP",
    }).format(amount);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discounts & Coupons</h1>
          <p className="text-sm text-muted-foreground">
            Manage promotional codes and special offers synced with Stripe
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Discount
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Discount</DialogTitle>
              <DialogDescription>
                Discount details will be synchronized with your Stripe dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Discount Code *</label>
                <Input
                  placeholder="e.g. SAVE20"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="e.g. 20% off summer collection"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v: "percentage" | "fixed") => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Value {formData.type === "percentage" ? "(%)" : `(${store?.currency})`}
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Usage</label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Spend ({store?.currency})</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  min={today}
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  min={formData.startsAt || today}
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <Switch 
                  id="active" 
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <label htmlFor="active" className="text-sm font-medium">Active Code</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDiscount} disabled={submitting || !formData.code || !formData.value}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Discount
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) { setEditingDiscount(null); resetForm(); }
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Discount</DialogTitle>
              <DialogDescription>
                Updates will be synchronized with Stripe. Core fields like value or type will recreate the Stripe coupon.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Discount Code *</label>
                <Input
                  placeholder="e.g. SAVE20"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="e.g. 20% off summer collection"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v: "percentage" | "fixed") => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Value {formData.type === "percentage" ? "(%)" : `(${store?.currency})`}
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Usage</label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Spend ({store?.currency})</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  min={today}
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  min={formData.startsAt || today}
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <Switch 
                  id="edit-active" 
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <label htmlFor="edit-active" className="text-sm font-medium">Active Code</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateDiscount} disabled={submitting || !formData.code || !formData.value}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Discount
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Promotional Codes</CardTitle>
          <CardDescription>
            Active and upcoming discounts for your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {discounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground italic">
              <Ticket className="mb-4 h-12 w-12 opacity-10" />
              <p>No discount codes found. Create your first promotion to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code & Description</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell>
                      <div className="font-bold">{discount.code}</div>
                      {discount.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {discount.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {discount.type === "percentage" 
                          ? `${discount.value}% OFF` 
                          : `${formatCurrency(discount.value)} OFF`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="font-bold">{discount.uses_count}</span>
                        <span className="text-muted-foreground"> / {discount.max_uses || "∞"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {discount.expires_at 
                        ? new Date(discount.expires_at).toLocaleDateString("en-GB")
                        : "Indefinite"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={discount.is_active ? "default" : "secondary"}>
                        {discount.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="hover:bg-accent"
                        onClick={() => handleEditClick(discount)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteDiscount(discount.id, discount.stripe_coupon_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
