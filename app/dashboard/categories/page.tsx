"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Tag, Loader2, ImageIcon } from "lucide-react";
import type { Category, Store } from "@/types/database";
import { toast } from "sonner";
import { ImageUpload } from "@/components/dashboard/ImageUpload";

export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "" as string | null,
    parent_id: "none",
    sort_order: "1",
    active: true,
  });

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const loadCategories = useCallback(async (storeId: string) => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      toast.error("Failed to load categories");
      return;
    }
    setCategories(data as Category[]);
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
      await loadCategories(currentStore.id);
      setLoading(false);
    }

    init();
  }, [supabase, router, loadCategories]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handleCreateCategory = async () => {
    if (!store || !formData.name.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from("categories").insert({
      store_id: store.id,
      name: formData.name.trim(),
      slug: formData.slug.trim() || generateSlug(formData.name),
      description: formData.description.trim() || null,
      image_url: formData.image_url || null,
      parent_id: formData.parent_id === "none" ? null : formData.parent_id,
      sort_order: parseInt(formData.sort_order) || 1,
      active: formData.active,
    });

    if (error) {
      toast.error(`Create failed: ${error.message}`);
    } else {
      toast.success("Category created");
      setFormData({
        name: "",
        slug: "",
        description: "",
        image_url: null,
        parent_id: "none",
        sort_order: "1",
        active: true,
      });
      setIsAddDialogOpen(false);
      await loadCategories(store.id);
    }
    setSubmitting(false);
  };

  const handleUpdateCategory = async () => {
    if (!store || !editingCategory || !formData.name.trim()) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("categories")
      .update({
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        image_url: formData.image_url || null,
        parent_id: formData.parent_id === "none" ? null : formData.parent_id,
        sort_order: parseInt(formData.sort_order) || 1,
        active: formData.active,
      })
      .eq("id", editingCategory.id)
      .eq("store_id", store.id);

    if (error) {
      toast.error(`Update failed: ${error.message}`);
    } else {
      toast.success("Category updated");
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      await loadCategories(store.id);
    }
    setSubmitting(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!store) return;
    setDeletingId(id);

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("store_id", store.id);

    if (error) {
      toast.error("Failed to delete category. It might be in use by products.");
    } else {
      toast.success("Category deleted");
      await loadCategories(store.id);
    }
    setDeletingId(null);
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

  const parentCategories = categories.filter(c => !c.parent_id && (!editingCategory || c.id !== editingCategory.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize products with hierarchical structures and custom sorting
          </p>
        </div>
        
        <Dialog 
          open={isAddDialogOpen} 
          onOpenChange={(open) => {
            if (open) {
              setFormData({
                name: "",
                slug: "",
                description: "",
                image_url: null,
                parent_id: "none",
                sort_order: "1",
                active: true,
              });
              setEditingCategory(null);
            }
            setIsAddDialogOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>
                Create a new product category with custom settings
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter category name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  placeholder="category-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter category description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Category Image (Optional)</Label>
                <ImageUpload
                  value={formData.image_url ? [formData.image_url] : []}
                  onChange={(urls) => setFormData({ ...formData, image_url: urls[0] || null })}
                  onRemove={() => setFormData({ ...formData, image_url: null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Category</Label>
                <Select
                  value={formData.parent_id}
                  onValueChange={(val) => setFormData({ ...formData, parent_id: val })}
                >
                  <SelectTrigger id="parent">
                    <SelectValue placeholder="Select parent category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top Level)</SelectItem>
                    {parentCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCategory} disabled={submitting || !formData.name.trim()}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing Categories</CardTitle>
          <CardDescription>
            Hierarchical overview of your store categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-3">
                <Tag className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No categories found. Create your first category to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-bold flex items-center gap-3">
                      {cat.parent_id && <span className="text-muted-foreground">↳</span>}
                      {cat.image_url ? (
                        <div className="h-8 w-8 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      )}
                      {cat.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{cat.slug}</TableCell>
                    <TableCell className="text-xs">
                      {cat.parent_id ? categories.find(c => c.id === cat.parent_id)?.name : "—"}
                    </TableCell>
                    <TableCell>{cat.sort_order}</TableCell>
                    <TableCell>
                      <Badge variant={cat.active ? "default" : "secondary"} className="text-[10px] px-1.5 h-4">
                        {cat.active ? "Active" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCategory(cat);
                            setFormData({
                              name: cat.name,
                              slug: cat.slug,
                              description: cat.description || "",
                              image_url: cat.image_url || null,
                              parent_id: cat.parent_id || "none",
                              sort_order: (cat.sort_order || 1).toString(),
                              active: cat.active,
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
                              <AlertDialogTitle>Delete Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{cat.name}&quot;? 
                                Sub-categories may become orphans.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCategory(cat.id)}
                                disabled={deletingId === cat.id}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deletingId === cat.id ? "Deleting..." : "Delete"}
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
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update your category details and hierarchy
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Category Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Category Image (Optional)</Label>
              <ImageUpload
                value={formData.image_url ? [formData.image_url] : []}
                onChange={(urls) => setFormData({ ...formData, image_url: urls[0] || null })}
                onRemove={() => setFormData({ ...formData, image_url: null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parent">Parent Category</Label>
              <Select
                value={formData.parent_id}
                onValueChange={(val) => setFormData({ ...formData, parent_id: val })}
              >
                <SelectTrigger id="edit-parent">
                  <SelectValue placeholder="Select parent category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {parentCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory} disabled={submitting || !formData.name.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
