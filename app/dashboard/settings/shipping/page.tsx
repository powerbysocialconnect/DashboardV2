"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Truck, Loader2, ArrowLeft } from "lucide-react";
import type { ShippingMethod, Store } from "@/types/database";
import { toast } from "sonner";
import Link from "next/link";

export default function ShippingPage() {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "0",
    estimated_delivery: "",
    sort_order: "1",
    is_active: true,
  });

  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const loadMethods = useCallback(async (storeId: string) => {
    const { data, error } = await supabase
      .from("shipping_methods")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Failed to load shipping methods");
      return;
    }
    setMethods(data as ShippingMethod[]);
  }, [supabase]);

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
      await loadMethods(currentStore.id);
      setLoading(false);
    }

    init();
  }, [supabase, router, loadMethods]);

  const handleCreateMethod = async () => {
    if (!store || !formData.name.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from("shipping_methods").insert({
      store_id: store.id,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      price: parseFloat(formData.price) || 0,
      estimated_delivery: formData.estimated_delivery.trim() || null,
      sort_order: parseInt(formData.sort_order) || 1,
      is_active: formData.is_active,
    });

    if (error) {
      toast.error("Failed to create shipping method");
    } else {
      toast.success("Shipping method created");
      setFormData({
        name: "",
        description: "",
        price: "0",
        estimated_delivery: "",
        sort_order: "1",
        is_active: true,
      });
      setIsAddDialogOpen(false);
      await loadMethods(store.id);
    }
    setSubmitting(false);
  };

  const handleUpdateMethod = async () => {
    if (!store || !editingMethod || !formData.name.trim()) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("shipping_methods")
      .update({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price) || 0,
        estimated_delivery: formData.estimated_delivery.trim() || null,
        sort_order: parseInt(formData.sort_order) || 1,
        is_active: formData.is_active,
      })
      .eq("id", editingMethod.id)
      .eq("store_id", store.id);

    if (error) {
      toast.error("Failed to update shipping method");
    } else {
      toast.success("Shipping method updated");
      setIsEditDialogOpen(false);
      setEditingMethod(null);
      await loadMethods(store.id);
    }
    setSubmitting(false);
  };

  const handleDeleteMethod = async (id: string) => {
    if (!store) return;
    setDeletingId(id);

    const { error } = await supabase
      .from("shipping_methods")
      .delete()
      .eq("id", id)
      .eq("store_id", store.id);

    if (error) {
      toast.error("Failed to delete shipping method");
    } else {
      toast.success("Shipping method deleted");
      await loadMethods(store.id);
    }
    setDeletingId(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: store?.currency || "GBP",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipping Methods</h1>
          <p className="text-sm text-muted-foreground">
            Configure delivery options for your customers
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Shipping Method
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Shipping Method</DialogTitle>
              <DialogDescription>
                Create a new shipping option for customers
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Method Name *</Label>
                <Input
                  id="name"
                  placeholder="Standard Shipping"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Delivery time and details"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Shipping Rate ({store?.currency === 'GBP' ? '£' : '$'})</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="9.99"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery">Estimated Delivery</Label>
                  <Input
                    id="delivery"
                    placeholder="5-7 days"
                    value={formData.estimated_delivery}
                    onChange={(e) => setFormData({ ...formData, estimated_delivery: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort">Sort Order</Label>
                <Input
                  id="sort"
                  type="number"
                  placeholder="1"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMethod} disabled={submitting || !formData.name.trim()}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Method
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configured Methods</CardTitle>
          <CardDescription>
            Manage your store&apos;s active shipping options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {methods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-3">
                <Truck className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No shipping methods found. Create your first method to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method Name</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell>
                      <div className="font-medium">{method.name}</div>
                      {method.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {method.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(method.price)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {method.estimated_delivery || "N/A"}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        method.is_active 
                          ? "bg-green-100 text-green-700" 
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {method.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingMethod(method);
                            setFormData({
                              name: method.name,
                              description: method.description || "",
                              price: method.price.toString(),
                              estimated_delivery: method.estimated_delivery || "",
                              sort_order: method.sort_order.toString(),
                              is_active: method.is_active,
                            });
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Shipping Method</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{method.name}&quot;? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteMethod(method.id)}
                                disabled={deletingId === method.id}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deletingId === method.id ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Shipping Method</DialogTitle>
            <DialogDescription>
              Update delivery options for your customers
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Method Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Shipping Rate ({store?.currency === 'GBP' ? '£' : '$'})</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-delivery">Estimated Delivery</Label>
                <Input
                  id="edit-delivery"
                  value={formData.estimated_delivery}
                  onChange={(e) => setFormData({ ...formData, estimated_delivery: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sort">Sort Order</Label>
              <Input
                id="edit-sort"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMethod} disabled={submitting || !formData.name.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
