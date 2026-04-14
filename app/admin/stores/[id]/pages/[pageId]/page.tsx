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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  FileText,
  Search,
  Globe,
  LayoutTemplate,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { StorePage, PageSection, PageType } from "@/types/database";
import { PageBuilder } from "@/components/admin/pages/PageBuilder";
import { generateSlug, validateSlug } from "@/lib/pages/slugUtils";
import { validateContentJson } from "@/lib/pages/schemas";
import { PAGE_TEMPLATES, getTemplateSections } from "@/lib/pages/templates";
import { toast } from "sonner";

export default function PageEditorPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  const pageId = params.pageId as string;
  const isNew = pageId === "new";
  const supabase = createClient();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeSubdomain, setStoreSubdomain] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [pageType, setPageType] = useState<PageType>("standard");
  const [isPublished, setIsPublished] = useState(false);
  const [showInHeader, setShowInHeader] = useState(false);
  const [showInFooter, setShowInFooter] = useState(false);
  const [navOrder, setNavOrder] = useState(0);
  const [footerOrder, setFooterOrder] = useState(0);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [sections, setSections] = useState<PageSection[]>([]);

  // Errors
  const [slugError, setSlugError] = useState("");
  const [saveError, setSaveError] = useState("");

  const fetchStore = useCallback(async () => {
    const { data } = await supabase
      .from("stores")
      .select("name, subdomain")
      .eq("id", storeId)
      .single();
    if (data) {
      setStoreName(data.name);
      setStoreSubdomain(data.subdomain);
    }
  }, [supabase, storeId]);

  const fetchPage = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_pages")
        .select("*")
        .eq("id", pageId)
        .single();

      if (error) throw error;
      const page = data as StorePage;

      setTitle(page.title);
      setSlug(page.slug);
      setSlugManuallyEdited(true);
      setPageType(page.page_type);
      setIsPublished(page.is_published);
      setShowInHeader(page.show_in_header);
      setShowInFooter(page.show_in_footer);
      setNavOrder(page.nav_order);
      setFooterOrder(page.footer_order);
      setSeoTitle(page.seo_title || "");
      setSeoDescription(page.seo_description || "");
      setSections(page.content_json || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load page");
      router.push(`/admin/stores/${storeId}/pages`);
    } finally {
      setLoading(false);
    }
  }, [supabase, pageId, isNew, storeId, router]);

  useEffect(() => {
    fetchStore();
    fetchPage();
  }, [fetchStore, fetchPage]);

  // Auto-generate slug from title (only if not manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      const generated = generateSlug(title);
      setSlug(generated);
      setSlugError("");
    }
  }, [title, slugManuallyEdited]);

  const handleSlugChange = (value: string) => {
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setSlug(cleaned);
    setSlugManuallyEdited(true);

    const error = validateSlug(cleaned);
    setSlugError(error || "");
  };

  const applyTemplate = (templateKey: string) => {
    const template = PAGE_TEMPLATES[templateKey];
    if (!template) return;

    const newSections = getTemplateSections(templateKey);
    setSections(newSections);
    setPageType(template.page_type);
    toast.success(`Applied "${template.name}" template`);
  };

  const handleSave = async () => {
    // Validate
    if (!title.trim()) {
      toast.error("Page title is required");
      return;
    }

    const slugValidation = validateSlug(slug);
    if (slugValidation) {
      setSlugError(slugValidation);
      toast.error(slugValidation);
      return;
    }

    const contentValidation = validateContentJson(sections);
    if (contentValidation !== true) {
      toast.error(contentValidation);
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const payload = {
        store_id: storeId,
        title: title.trim(),
        slug,
        page_type: pageType,
        content_json: sections,
        is_published: isPublished,
        show_in_header: showInHeader,
        show_in_footer: showInFooter,
        nav_order: navOrder,
        footer_order: footerOrder,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("store_pages")
          .insert(payload)
          .select()
          .single();

        if (error) {
          if (error.message.includes("store_pages_store_id_slug_key")) {
            setSlugError("This slug is already used for another page in this store");
            throw new Error("Slug already exists for this store");
          }
          if (error.message.includes("chk_store_pages_reserved_slug")) {
            setSlugError(`"${slug}" is a reserved route`);
            throw new Error(`"${slug}" is a reserved route and cannot be used`);
          }
          throw error;
        }

        toast.success("Page created");
        router.push(`/admin/stores/${storeId}/pages/${(data as StorePage).id}`);
      } else {
        const { error } = await supabase
          .from("store_pages")
          .update(payload)
          .eq("id", pageId);

        if (error) {
          if (error.message.includes("store_pages_store_id_slug_key")) {
            setSlugError("This slug is already used for another page in this store");
            throw new Error("Slug already exists for this store");
          }
          if (error.message.includes("chk_store_pages_reserved_slug")) {
            setSlugError(`"${slug}" is a reserved route`);
            throw new Error(`"${slug}" is a reserved route and cannot be used`);
          }
          throw error;
        }

        toast.success("Page saved");
      }
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save");
      toast.error(err?.message || "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/stores/${storeId}/pages`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isNew ? "Create Page" : "Edit Page"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {storeName && (
                <>
                  For <strong>{storeName}</strong>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && storeSubdomain && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/store/${storeSubdomain}/${slug}${!isPublished ? "?preview=true" : ""}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview
              </a>
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isNew ? "Create Page" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content — Left Column (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Page Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Page Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Page Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="About Us"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="about-us"
                    className={slugError ? "border-destructive" : ""}
                  />
                </div>
                {slugError && (
                  <p className="text-xs text-destructive">{slugError}</p>
                )}
                {slug && !slugError && storeSubdomain && (
                  <p className="text-xs text-muted-foreground">
                    https://{storeSubdomain}.pixeocommerce.com/{slug}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Page Type</Label>
                <Select
                  value={pageType}
                  onValueChange={(v) => setPageType(v as PageType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="contact">Contact</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Template Selector (only for new pages) */}
          {isNew && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5" />
                  Start from a Template
                </CardTitle>
                <CardDescription>
                  Choose a template to pre-load sections, or start blank
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Object.entries(PAGE_TEMPLATES).map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => applyTemplate(key)}
                      className="group flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-muted/20 p-4 text-center transition-all hover:border-primary hover:bg-muted/40"
                    >
                      <LayoutTemplate className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                      <span className="text-sm font-semibold">
                        {template.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {template.description}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Page Builder */}
          <Card>
            <CardHeader>
              <CardTitle>Page Content</CardTitle>
              <CardDescription>
                Add, edit, and reorder sections to build your page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PageBuilder sections={sections} onChange={setSections} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — Right Column (1/3) */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publish Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Published</Label>
                  <p className="text-xs text-muted-foreground">
                    Make this page live
                  </p>
                </div>
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show in Header</Label>
                  <p className="text-xs text-muted-foreground">
                    Add to store navigation
                  </p>
                </div>
                <Switch
                  checked={showInHeader}
                  onCheckedChange={setShowInHeader}
                />
              </div>
              {showInHeader && (
                <div className="space-y-2 pl-1">
                  <Label className="text-xs">Header Nav Order</Label>
                  <Input
                    type="number"
                    min={0}
                    value={navOrder}
                    onChange={(e) => setNavOrder(parseInt(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show in Footer</Label>
                  <p className="text-xs text-muted-foreground">
                    Add to footer links
                  </p>
                </div>
                <Switch
                  checked={showInFooter}
                  onCheckedChange={setShowInFooter}
                />
              </div>
              {showInFooter && (
                <div className="space-y-2 pl-1">
                  <Label className="text-xs">Footer Link Order</Label>
                  <Input
                    type="number"
                    min={0}
                    value={footerOrder}
                    onChange={(e) =>
                      setFooterOrder(parseInt(e.target.value) || 0)
                    }
                    className="h-8"
                  />
                </div>
              )}
              {!isPublished && (
                <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  This page is in <strong>draft</strong> mode. Only admins can
                  preview it via the preview link.
                </div>
              )}
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4" />
                SEO
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">Meta Title</Label>
                <Input
                  id="seoTitle"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={title || "Page title"}
                />
                <p className="text-xs text-muted-foreground">
                  {seoTitle.length}/60 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoDescription">Meta Description</Label>
                <Textarea
                  id="seoDescription"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Brief description for search engines..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {seoDescription.length}/160 characters
                </p>
              </div>

              {/* SEO Preview */}
              {(seoTitle || title) && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Search Preview
                  </p>
                  <p className="text-sm font-medium text-blue-600">
                    {seoTitle || title}
                  </p>
                  <p className="text-xs text-green-700">
                    {storeSubdomain}.pixeocommerce.com/{slug}
                  </p>
                  {seoDescription && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {seoDescription}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
