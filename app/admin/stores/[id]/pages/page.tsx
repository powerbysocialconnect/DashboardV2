"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Copy,
  FileText,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import type { StorePage, Store } from "@/types/database";
import { generateDuplicateSlug } from "@/lib/pages/slugUtils";
import { toast } from "sonner";

export default function StorePagesListPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  const supabase = createClient();

  const [store, setStore] = useState<Store | null>(null);
  const [pages, setPages] = useState<StorePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [storeRes, pagesRes] = await Promise.all([
        supabase.from("stores").select("*").eq("id", storeId).single(),
        supabase
          .from("store_pages")
          .select("*")
          .eq("store_id", storeId)
          .order("nav_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      if (storeRes.error) throw storeRes.error;

      setStore(storeRes.data as Store);
      setPages((pagesRes.data || []) as StorePage[]);
    } catch (err: any) {
      setError(err?.message || "Failed to load pages");
    } finally {
      setLoading(false);
    }
  }, [supabase, storeId]);

  useEffect(() => {
    if (storeId) fetchData();
  }, [storeId, fetchData]);

  const handleToggle = async (
    pageId: string,
    field: "is_published" | "show_in_header" | "show_in_footer",
    value: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("store_pages")
        .update({ [field]: value })
        .eq("id", pageId);
      if (error) throw error;

      setPages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, [field]: value } : p))
      );
      toast.success(
        `${field === "is_published" ? "Publication" : field === "show_in_header" ? "Header" : "Footer"} status updated`
      );
    } catch (err) {
      console.error("Toggle failed:", err);
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (pageId: string) => {
    try {
      const { error } = await supabase
        .from("store_pages")
        .delete()
        .eq("id", pageId);
      if (error) throw error;

      setPages((prev) => prev.filter((p) => p.id !== pageId));
      toast.success("Page deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete page");
    }
  };

  const handleDuplicate = async (page: StorePage) => {
    try {
      const existingSlugs = pages.map((p) => p.slug);
      const newSlug = generateDuplicateSlug(page.slug, existingSlugs);

      const { data, error } = await supabase
        .from("store_pages")
        .insert({
          store_id: storeId,
          title: `${page.title} (Copy)`,
          slug: newSlug,
          page_type: page.page_type,
          content_json: page.content_json,
          is_published: false,
          show_in_header: false,
          show_in_footer: false,
          nav_order: page.nav_order,
          footer_order: page.footer_order,
          seo_title: page.seo_title ? `${page.seo_title} (Copy)` : null,
          seo_description: page.seo_description,
        })
        .select()
        .single();

      if (error) throw error;

      setPages((prev) => [...prev, data as StorePage]);
      toast.success(`Page duplicated as "${newSlug}"`);
    } catch (err: any) {
      console.error("Duplicate failed:", err);
      toast.error(err?.message || "Failed to duplicate page");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-lg font-medium text-destructive">
          {error || "Store not found"}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/stores">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stores
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/stores/${storeId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pages</h1>
            <p className="text-sm text-muted-foreground">
              Manage pages for <strong>{store.name}</strong>
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/stores/${storeId}/pages/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Page
          </Link>
        </Button>
      </div>

      {/* Pages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Pages
          </CardTitle>
          <CardDescription>
            {pages.length} page{pages.length !== 1 ? "s" : ""} for this store
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No pages created yet
              </p>
              <p className="text-xs text-muted-foreground/60">
                Add your first page to get started
              </p>
              <Button className="mt-4" asChild>
                <Link href={`/admin/stores/${storeId}/pages/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Page
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Header</TableHead>
                    <TableHead className="text-center">Footer</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{page.title}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase"
                          >
                            {page.page_type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          /{page.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={page.is_published}
                            onCheckedChange={(v) =>
                              handleToggle(page.id, "is_published", v)
                            }
                          />
                          <Badge
                            variant={
                              page.is_published ? "default" : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {page.is_published ? (
                              <>
                                <Eye className="mr-1 h-3 w-3" />
                                Published
                              </>
                            ) : (
                              <>
                                <EyeOff className="mr-1 h-3 w-3" />
                                Draft
                              </>
                            )}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={page.show_in_header}
                          onCheckedChange={(v) =>
                            handleToggle(page.id, "show_in_header", v)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={page.show_in_footer}
                          onCheckedChange={(v) =>
                            handleToggle(page.id, "show_in_footer", v)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(page.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {/* Preview link */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <a
                              href={`/store/${store.subdomain}/${page.slug}${!page.is_published ? "?preview=true" : ""}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Preview page"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <Link
                              href={`/admin/stores/${storeId}/pages/${page.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          {/* Duplicate */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDuplicate(page)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {/* Delete */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete &ldquo;{page.title}&rdquo;?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove the page from this
                                  store. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(page.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
