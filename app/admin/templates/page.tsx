"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { HeadlessTemplate } from "@/types/database";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Plus,
  Image as ImageIcon,
  Package,
  Upload,
  Code2,
  Settings,
  Globe,
  Shield,
  FileCode,
  CheckCircle2
} from "lucide-react";

interface TemplateFormData {
  name: string;
  description: string;
  thumbnail_url: string;
  preview_url: string;
  theme_code: string;
  version: string;
  repository_url: string;
  bundle_url: string;
  style_url: string;
  is_system: boolean;
  category: string;
  config_json: string;
  config_schema_json: string;
  documentation_url: string;
  required_plans: string[];
  is_active: boolean;
  blueprint_json: string;
  package_manifest_json: string;
  source_type: string;
  package_status: string;
}

const EMPTY_FORM: TemplateFormData = {
  name: "",
  description: "",
  thumbnail_url: "",
  preview_url: "",
  theme_code: "starter",
  version: "1.0.0",
  repository_url: "",
  bundle_url: "",
  style_url: "",
  is_system: false,
  category: "",
  config_json: "[]",
  config_schema_json: "{}",
  documentation_url: "",
  required_plans: [],
  is_active: true,
  blueprint_json: "{}",
  package_manifest_json: "{}",
  source_type: "manual",
  package_status: "manual",
};

const THEME_CODES = ["starter", "premium", "pro", "maintenance", "store", "custom"];
const PLAN_CHOICES = ["starter", "premium", "pro", "maintenance", "store"];

export default function TemplatesPage() {
  const supabase = createClient();
  const [templates, setTemplates] = useState<HeadlessTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<HeadlessTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ingestingBundle, setIngestingBundle] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [bundleSuccess, setBundleSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: templatesError } = await supabase
          .from("headless_templates")
          .select("*")
          .order("created_at", { ascending: false });

        if (templatesError) throw templatesError;
        setTemplates(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load templates");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category).filter((c): c is string => !!c));
    return Array.from(cats).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    let result = templates;
    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [templates, categoryFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, searchQuery]);

  function openAddDialog() {
    setEditingTemplate(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(template: HeadlessTemplate) {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      thumbnail_url: template.thumbnail_url || "",
      preview_url: template.preview_url || "",
      theme_code: template.theme_code,
      version: template.version || "1.0.0",
      repository_url: template.repository_url || "",
      bundle_url: template.bundle_url || "",
      style_url: template.style_url || "",
      is_system: template.is_system || false,
      category: template.category || "",
      config_json: JSON.stringify(template.config || [], null, 2),
      config_schema_json: JSON.stringify(template.config_schema || {}, null, 2),
      documentation_url: template.documentation_url || "",
      required_plans: template.required_plans || [],
      is_active: template.is_active,
      blueprint_json: JSON.stringify(template.blueprint || {}, null, 2),
      package_manifest_json: JSON.stringify(template.package_manifest || {}, null, 2),
      source_type: template.source_type || "manual",
      package_status: template.package_status || "manual",
    });
    setDialogOpen(true);
  }

  async function handleThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `thumbnails/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('template-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('template-assets')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, thumbnail_url: publicUrl }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function handleBundleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBundleError(null);
    setBundleSuccess(null);
    setIngestingBundle(true);
    try {
      const fd = new FormData();
      fd.append("themePackage", file);

      const res = await fetch("/api/admin/templates/ingest", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Theme package ingestion failed");
      }

      const metadata = data.metadata || {};
      const schema = data.schema || {};
      const blueprint = data.blueprint || {};
      const assets = data.assets || {};

      setFormData((prev) => ({
        ...prev,
        name: metadata.name || prev.name,
        description: metadata.description || prev.description,
        theme_code: metadata.themeCode || prev.theme_code,
        version: metadata.version || prev.version,
        category: metadata.category || prev.category,
        repository_url: metadata.repositoryUrl || prev.repository_url,
        documentation_url: metadata.documentationUrl || prev.documentation_url,
        preview_url: metadata.previewUrl || prev.preview_url,
        thumbnail_url: assets.previewUrl || prev.thumbnail_url,
        bundle_url: assets.bundleUrl || prev.bundle_url,
        style_url: assets.styleUrl || prev.style_url,
        config_schema_json: JSON.stringify(schema, null, 2),
        blueprint_json: JSON.stringify(blueprint || {}, null, 2),
        package_manifest_json: JSON.stringify(
          {
            packageHash: data.packageHash,
            packageFiles: data.packageFiles,
            assets: assets.assetUrls || [],
            packageVersion: metadata.packageVersion,
          },
          null,
          2
        ),
        source_type: "zip_upload",
        package_status: data.duplicate ? "validated" : "validated",
      }));

      setBundleSuccess(
        data.duplicate
          ? "Identical package detected and metadata loaded for review."
          : "Theme package ingested. Metadata and schema auto-populated."
      );
    } catch (err) {
      setBundleError(err instanceof Error ? err.message : "Theme ingestion failed");
    } finally {
      setIngestingBundle(false);
      e.currentTarget.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      let config = [];
      let schema = {};
      let blueprint = {};
      let packageManifest = {};
      try {
        config = JSON.parse(formData.config_json);
        schema = JSON.parse(formData.config_schema_json);
        blueprint = JSON.parse(formData.blueprint_json || "{}");
        packageManifest = JSON.parse(formData.package_manifest_json || "{}");
      } catch (e) {
        throw new Error("Invalid JSON in config/schema/blueprint/manifest fields");
      }

      const payload = {
        name: formData.name,
        description: formData.description || null,
        thumbnail_url: formData.thumbnail_url || null,
        preview_url: formData.preview_url || null,
        theme_code: formData.theme_code,
        version: formData.version,
        repository_url: formData.repository_url || null,
        bundle_url: formData.bundle_url || null,
        style_url: formData.style_url || null,
        is_system: formData.is_system,
        category: formData.category || null,
        config: config,
        config_schema: schema,
        blueprint: blueprint,
        package_manifest: packageManifest,
        source_type: formData.source_type || "manual",
        package_status: formData.package_status || "manual",
        documentation_url: formData.documentation_url || null,
        required_plans: formData.required_plans.length > 0 ? formData.required_plans : null,
        is_active: formData.is_active,
      };

      if (editingTemplate) {
        const { error: updateError } = await supabase
          .from("headless_templates")
          .update(payload)
          .eq("id", editingTemplate.id);
        if (updateError) throw updateError;

        const templateId = editingTemplate.id;
        const packageHash = (packageManifest as Record<string, unknown>).packageHash as string | undefined;
        if (formData.source_type === "zip_upload" && packageHash) {
          const { data: versionRow, error: versionError } = await supabase
            .from("headless_template_versions")
            .upsert(
              {
                template_id: templateId,
                theme_code: formData.theme_code,
                version: formData.version,
                package_hash: packageHash,
                source_type: "zip_upload",
                package_manifest: packageManifest,
                schema_json: schema,
                blueprint_json: blueprint,
                bundle_url: formData.bundle_url || null,
                style_url: formData.style_url || null,
                preview_url: formData.thumbnail_url || null,
                status: "validated",
              },
              { onConflict: "theme_code,version" }
            )
            .select("id")
            .single();
          if (!versionError && versionRow?.id) {
            await supabase
              .from("headless_templates")
              .update({ current_version_id: versionRow.id })
              .eq("id", templateId);
          }
        }

        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingTemplate.id ? ({ ...t, ...payload } as HeadlessTemplate) : t
          )
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("headless_templates")
          .insert(payload)
          .select("*")
          .single();
        if (insertError) throw insertError;

        const packageHash = (packageManifest as Record<string, unknown>).packageHash as string | undefined;
        if (formData.source_type === "zip_upload" && packageHash) {
          const { data: versionRow, error: versionError } = await supabase
            .from("headless_template_versions")
            .upsert(
              {
                template_id: data.id,
                theme_code: formData.theme_code,
                version: formData.version,
                package_hash: packageHash,
                source_type: "zip_upload",
                package_manifest: packageManifest,
                schema_json: schema,
                blueprint_json: blueprint,
                bundle_url: formData.bundle_url || null,
                style_url: formData.style_url || null,
                preview_url: formData.thumbnail_url || null,
                status: "validated",
              },
              { onConflict: "theme_code,version" }
            )
            .select("id")
            .single();
          if (!versionError && versionRow?.id) {
            await supabase
              .from("headless_templates")
              .update({ current_version_id: versionRow.id })
              .eq("id", data.id);
          }
        }

        setTemplates((prev) => [data, ...prev]);
      }

      setDialogOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    try {
      const { error: deleteError } = await supabase
        .from("headless_templates")
        .delete()
        .eq("id", deletingId);
      if (deleteError) throw deleteError;
      setTemplates((prev) => prev.filter((t) => t.id !== deletingId));
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete template");
    }
  }

  function togglePlan(plan: string) {
    setFormData((prev) => ({
      ...prev,
      required_plans: prev.required_plans.includes(plan)
        ? prev.required_plans.filter((p) => p !== plan)
        : [...prev.required_plans, plan],
    }));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-destructive text-lg">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }


  const getTemplateThumbnail = (template: HeadlessTemplate) => {
    if (template.thumbnail_url) return template.thumbnail_url;
    
    // Smart fallbacks based on known template names
    const name = template.name.toLowerCase();
    if (name.includes("milo")) return "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80";
    if (name.includes("core")) return "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80";
    if (name.includes("dsn") || name.includes("grid")) return "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=800&q=80";
    if (name.includes("gaming")) return "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80";
    if (name.includes("shades") || name.includes("glass")) return "https://images.unsplash.com/photo-1511499767350-a153568a5705?w=800&q=80";
    
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage store templates available to merchants
          </p>
        </div>
        <Button onClick={openAddDialog}>Add Template</Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 items-end gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-48">
            <label className="mb-1.5 block text-sm font-medium">Category</label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat || "uncategorized"}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/20 py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">No templates found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filters to find what you&apos;re looking for.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => { setSearchQuery(""); setCategoryFilter("all"); }}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedTemplates.map((template) => {
              const thumbnailUrl = getTemplateThumbnail(template);
              return (
                <Card key={template.id} className="group flex flex-col overflow-hidden border-muted/60 transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={template.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-muted/50 to-muted transition-colors group-hover:from-primary/5 group-hover:to-primary/10">
                        <ImageIcon className="mb-2 h-10 w-10 text-muted-foreground/40" />
                        <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">No Preview</span>
                      </div>
                    )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute bottom-3 left-3 right-3 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <Button variant="secondary" size="sm" className="w-full h-8 text-[11px] font-bold uppercase tracking-wider" asChild>
                       <Link href={template.preview_url || "#"} target="_blank">Live Preview</Link>
                    </Button>
                  </div>
                  {!template.is_active && (
                    <Badge variant="destructive" className="absolute right-2 top-2 shadow-sm">
                      Inactive
                    </Badge>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1 text-base group-hover:text-primary transition-colors">{template.name}</CardTitle>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="shrink-0 text-[10px] uppercase font-bold py-0 h-5">
                        {template.theme_code}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-medium">v{template.version || "1.0.0"}</span>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-1 h-5 text-xs text-primary font-medium">
                    {template.category || "Uncategorized"}
                  </CardDescription>
                  <CardDescription className="line-clamp-2 h-10 text-xs mt-1">
                    {template.description || "V2 Headless template for modern commerce."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <div className="flex flex-wrap gap-1">
                    {(template.required_plans || []).map((plan) => (
                      <Badge key={plan} variant="secondary" className="text-[10px] uppercase font-bold bg-primary/10 text-primary border-none">
                        {plan}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="gap-2 border-t bg-muted/20 p-3 mt-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 text-xs font-semibold"
                    onClick={() => openEditDialog(template)}
                  >
                    Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs font-semibold hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                    onClick={() => {
                      setDeletingId(template.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    Delete
                  </Button>
                </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Pagination UI */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-6">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{" "}
                <span className="font-medium">{filtered.length}</span> results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    // Show current page, first, last, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    }
                    if (
                      (page === 2 && currentPage > 3) ||
                      (page === totalPages - 1 && currentPage < totalPages - 2)
                    ) {
                      return <span key={page} className="px-1 text-muted-foreground">...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-3xl p-0 border-none shadow-2xl bg-white">
          <DialogHeader className="p-8 pb-0">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {editingTemplate ? "Theme Master Build" : "Register Theme"}
                </DialogTitle>
                <DialogDescription className="text-base">
                  Manage your V2 Headless theme registry and distribution settings.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="identity" className="w-full">
            <div className="px-8 mt-6">
              <TabsList className="w-full justify-start gap-6 bg-transparent h-auto p-0 border-b rounded-none pb-px overflow-x-auto">
                <TabsTrigger value="identity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-semibold text-sm transition-all hover:text-primary">Theme Identity</TabsTrigger>
                <TabsTrigger value="availability" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-semibold text-sm transition-all hover:text-primary">Availability</TabsTrigger>
                <TabsTrigger value="bundle" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-semibold text-sm transition-all hover:text-primary">Theme Bundle</TabsTrigger>
                <TabsTrigger value="registry" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-semibold text-sm transition-all hover:text-primary">Core Registry</TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-8 pt-6 pb-4">
              <TabsContent value="identity" className="space-y-6 mt-0 outline-none">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">Name <span className="text-destructive">*</span></label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Modern Minimalist"
                      className="h-11 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Implementation Version</label>
                    <Input
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="1.0.0"
                      className="h-11 shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Theme Code (SDK Type)</label>
                    <Select
                      value={formData.theme_code}
                      onValueChange={(v) => setFormData({ ...formData, theme_code: v })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THEME_CODES.map((code) => (
                          <SelectItem key={code} value={code} className="capitalize">{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Visual Industry / Category</label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g. Fashion, Luxury"
                      className="h-11 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Short Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the aesthetic and core features..."
                    rows={2}
                    className="resize-none shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Theme Thumbnail</label>
                    <div className="flex flex-col gap-3">
                      {formData.thumbnail_url ? (
                        <div className="relative group aspect-video w-full overflow-hidden rounded-xl border bg-muted/20">
                          <img src={formData.thumbnail_url} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <Button variant="secondary" size="sm" onClick={() => setFormData(prev => ({ ...prev, thumbnail_url: "" }))}>Replace</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative h-28 w-full">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailUpload}
                            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                            disabled={uploading}
                          />
                          <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/10 transition-colors hover:bg-primary/5 hover:border-primary/40">
                             <Upload className={`h-6 w-6 text-muted-foreground mb-1 ${uploading ? 'animate-bounce' : ''}`} />
                             <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                               {uploading ? 'Uploading...' : 'Upload Image'}
                             </span>
                          </div>
                        </div>
                      )}
                      <Input
                        value={formData.thumbnail_url}
                        onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                        placeholder="Or paste direct image URL..."
                        className="h-9 text-[11px] shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> Live Preview URL</label>
                    <div className="flex flex-col gap-3 h-full">
                      <Input
                        value={formData.preview_url}
                        onChange={(e) => setFormData({ ...formData, preview_url: e.target.value })}
                        placeholder="https://..."
                        className="h-11 shadow-sm"
                      />
                      <div className="flex-1 rounded-xl border border-dashed flex flex-col items-center justify-center bg-muted/5 p-4 text-center">
                         <Globe className="h-5 w-5 text-muted-foreground/30 mb-1" />
                         <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">External Preview Link</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="availability" className="space-y-8 mt-0 outline-none">
                <div className="space-y-4 pt-2">
                  <label className="text-base font-bold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" /> Access Control 
                  </label>
                  <p className="text-sm text-muted-foreground -mt-3">Define which store types can view and install this theme.</p>
                  
                  <div className="grid gap-3 p-4 rounded-xl border bg-muted/20">
                    <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-all cursor-pointer border border-transparent hover:border-border">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-5 w-5 rounded-md border-primary text-primary accent-primary"
                      />
                      <div>
                        <p className="font-bold text-sm">Public Visibility</p>
                        <p className="text-xs text-muted-foreground">Is this theme available in the store gallery?</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-all cursor-pointer border border-transparent hover:border-border">
                      <input
                        type="checkbox"
                        checked={formData.is_system}
                        onChange={(e) => setFormData({ ...formData, is_system: e.target.checked })}
                        className="h-5 w-5 rounded-md border-primary text-primary accent-primary"
                      />
                      <div>
                        <p className="font-bold text-sm">System Internal Only</p>
                        <p className="text-xs text-muted-foreground">Restrict to official PixeoCommerce administration use.</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-base font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" /> Subscription Tiers
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {PLAN_CHOICES.map((plan) => (
                      <label key={plan} className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${formData.required_plans.includes(plan) ? 'bg-primary/5 border-primary text-primary ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                        <input
                          type="checkbox"
                          checked={formData.required_plans.includes(plan)}
                          onChange={() => togglePlan(plan)}
                          className="h-4 w-4 rounded border-primary accent-primary"
                        />
                        <span className="capitalize">{plan}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bundle" className="space-y-6 mt-0 outline-none pt-2">
                <div className="relative p-10 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/10 flex flex-col items-center justify-center text-center transition-all hover:bg-primary/5 hover:border-primary/40 group cursor-pointer">
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    onChange={handleBundleUpload}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    disabled={ingestingBundle}
                  />
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 transition-transform group-hover:scale-110">
                    <Upload className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold tracking-tight">Upload Theme Bundle (.zip)</h3>
                  <p className="text-sm text-muted-foreground max-w-[300px] mt-2">
                    Select your compiled V2 SDK package. This will automatically sync your sections, assets and schema.
                  </p>
                  <div className="mt-8">
                     <Button variant="outline" className="h-10 font-bold bg-white shadow-sm" disabled={ingestingBundle}>
                       {ingestingBundle ? "Ingesting..." : "Select File"}
                     </Button>
                  </div>
                </div>
                {bundleError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {bundleError}
                  </div>
                )}
                {bundleSuccess && (
                  <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
                    {bundleSuccess}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4" /> External Repository Sync
                  </label>
                  <Input
                    value={formData.repository_url}
                    onChange={(e) => setFormData({ ...formData, repository_url: e.target.value })}
                    placeholder="https://github.com/organization/your-theme-repo"
                    className="h-11 shadow-sm"
                  />
                  <p className="text-[11px] text-muted-foreground px-1">Linking a repository enables automatic deployments and Vite-powered builds.</p>
                </div>
              </TabsContent>

              <TabsContent value="registry" className="space-y-6 mt-0 outline-none">
                <div className="grid grid-cols-2 gap-6 pb-2 border-b">
                   <div className="space-y-2">
                     <label className="text-sm font-semibold flex items-center gap-2 text-primary">
                        <Package className="h-4 w-4" /> Production JS Bundle
                     </label>
                     <Input value={formData.bundle_url} onChange={(e) => setFormData({ ...formData, bundle_url: e.target.value })} placeholder="https://cdn.pixeo.com/.../bundle.js" className="h-11 shadow-sm font-mono text-xs" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-sm font-semibold flex items-center gap-2 text-primary">
                        <FileCode className="h-4 w-4" /> Production Style Bundle
                     </label>
                     <Input value={formData.style_url} onChange={(e) => setFormData({ ...formData, style_url: e.target.value })} placeholder="https://cdn.pixeo.com/.../bundle.css" className="h-11 shadow-sm font-mono text-xs" />
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-2"><FileCode className="h-4 w-4" /> Default Section Definitions (JSON)</span>
                      <Badge variant="outline" className="font-mono text-[10px]">manifest.json</Badge>
                    </label>
                    <Textarea
                      value={formData.config_json}
                      onChange={(e) => setFormData({ ...formData, config_json: e.target.value })}
                      placeholder="[]"
                      className="font-mono text-xs leading-relaxed border-muted shadow-inner bg-slate-50"
                      rows={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-2"><Code2 className="h-4 w-4" /> Global Settings Schema (JSON)</span>
                      <Badge variant="outline" className="font-mono text-[10px]">schema.json</Badge>
                    </label>
                    <Textarea
                      value={formData.config_schema_json}
                      onChange={(e) => setFormData({ ...formData, config_schema_json: e.target.value })}
                      placeholder="{}"
                      className="font-mono text-xs leading-relaxed border-muted shadow-inner bg-slate-50"
                      rows={8}
                    />
                  </div>
                </div>
                <div>
                   <label className="text-sm font-semibold flex items-center gap-2 mb-2"><Globe className="h-4 w-4" /> Documentation Portal</label>
                   <Input value={formData.documentation_url} onChange={(e) => setFormData({ ...formData, documentation_url: e.target.value })} placeholder="https://docs.yoursite.com/themes" className="h-11 shadow-sm" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Blueprint JSON</label>
                    <Textarea
                      value={formData.blueprint_json}
                      onChange={(e) => setFormData({ ...formData, blueprint_json: e.target.value })}
                      placeholder="{}"
                      className="font-mono text-xs"
                      rows={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Package Manifest JSON</label>
                    <Textarea
                      value={formData.package_manifest_json}
                      onChange={(e) => setFormData({ ...formData, package_manifest_json: e.target.value })}
                      placeholder="{}"
                      className="font-mono text-xs"
                      rows={6}
                    />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="p-8 pt-2 flex items-center gap-3 border-t bg-muted/20">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="px-8 font-semibold h-12"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()} className="px-10 font-bold h-12 shadow-lg shadow-primary/20">
              {saving ? (
                <span className="flex items-center gap-2"><Upload className="h-4 w-4 animate-bounce" /> Processing...</span>
              ) : editingTemplate ? "Secure Update" : "Finalize & Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
