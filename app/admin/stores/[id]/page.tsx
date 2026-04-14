"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ThemeSectionsEditor } from "@/components/admin/theme-sections/ThemeSectionsEditor";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { StoreStatusBadge } from "@/components/admin/StoreStatusBadge";
import { OnboardingChecklist } from "@/components/admin/OnboardingChecklist";
import { publishStore, disableStore, enableStore } from "@/lib/stores/publishStore";
import { PLANS } from "@/lib/billing/plans";
import { completeOnboardingTask, getOnboardingTasks } from "@/lib/stores/onboarding";
import { logStoreAction, getStoreActions } from "@/lib/admin/logStoreAction";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Store,
  StoreThemeConfig,
  StoreOnboardingTask,
  StoreStatusHistory,
  StoreAdminAction,
  StoreBillingSettings,
  HomepageSection,
  Profile,
  HeadlessTemplate,
  StoreDomain,
} from "@/types/database";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Globe,
  Palette,
  Zap,
  History,
  Package,
  ShoppingCart,
  Calendar,
  User,
  RefreshCw,
  Pencil,
  Eye,
  EyeOff,
  Power,
  PowerOff,
  Clock,
  CreditCard as CreditCardIcon,
  Plus,
  Trash2,
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileText,
  Settings,
  LayoutTemplate,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
} from "lucide-react";

interface StoreDetail extends Store {
  owner?: Profile | null;
}

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  const supabase = createClient();

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [themeConfig, setThemeConfig] = useState<StoreThemeConfig | null>(null);
  const [onboardingTasks, setOnboardingTasks] = useState<StoreOnboardingTask[]>([]);
  const [billing, setBilling] = useState<StoreBillingSettings | null>(null);
  const [statusHistory, setStatusHistory] = useState<StoreStatusHistory[]>([]);
  const [adminActions, setAdminActions] = useState<(StoreAdminAction & { profiles?: { full_name: string | null; email: string } | null })[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [templates, setTemplates] = useState<HeadlessTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Domains state
  const [domains, setDomains] = useState<StoreDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainError, setDomainError] = useState("");

  // Social & Footer State
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [footerHeadline, setFooterHeadline] = useState("");
  const [footerDescription, setFooterDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Dialog state
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);
  const [homepageLayoutOpen, setHomepageLayoutOpen] = useState(false);
  const [extendTrialOpen, setExtendTrialOpen] = useState(false);
  const [themeSettingsJson, setThemeSettingsJson] = useState("");
  const [homepageLayoutJson, setHomepageLayoutJson] = useState("");
  const [trialDate, setTrialDate] = useState("");

  // Assign Owner state
  const [assignOwnerOpen, setAssignOwnerOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [profilesLoading, setProfilesLoading] = useState(false);

  // Subdomain editing state
  const [subdomainEditing, setSubdomainEditing] = useState(false);
  const [subdomainValue, setSubdomainValue] = useState("");
  const [subdomainError, setSubdomainError] = useState("");
  const [subdomainSaving, setSubdomainSaving] = useState(false);

  // Plan management state
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [planSaving, setPlanSaving] = useState(false);
  const [planSuccess, setPlanSuccess] = useState("");

  const fetchProfiles = useCallback(async () => {
    setProfilesLoading(true);
    try {
      const res = await fetch("/api/admin/profiles");
      if (res.ok) {
        const data = await res.json();
        setAllProfiles(data);
      }
    } catch (err) {
      console.error("Failed to fetch profiles:", err);
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  const fetchDomains = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("store_domains")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true });
      setDomains((data as StoreDomain[]) || []);
    } catch (err) {
      console.error("Failed to fetch domains:", err);
    }
  }, [supabase, storeId]);

  const fetchStore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const [
        storeRes,
        themeRes,
        billingRes,
        historyRes,
        templatesRes,
        productsRes,
        ordersRes,
      ] = await Promise.all([
        supabase.from("stores").select("*").eq("id", storeId).single(),
        supabase.from("store_theme_configs").select("*").eq("store_id", storeId).maybeSingle(),
        supabase.from("store_billing_settings").select("*").eq("store_id", storeId).maybeSingle(),
        supabase.from("store_status_history").select("*").eq("store_id", storeId).order("created_at", { ascending: false }).limit(20),
        supabase.from("headless_templates").select("*").eq("is_active", true),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", storeId),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("store_id", storeId),
      ]);

      if (storeRes.error) throw storeRes.error;
      
      const storeData = storeRes.data as Record<string, unknown>;
      let ownerProfile: Profile | null = null;
      if (storeData.owner_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", storeData.owner_id as string)
          .maybeSingle();
        ownerProfile = (profileData as Profile) || null;
      }

      setStore({ ...(storeData as unknown as Store), owner: ownerProfile });
      setThemeConfig((themeRes.data as StoreThemeConfig) || null);
      setTemplates((templatesRes.data as HeadlessTemplate[]) || []);
      setBilling((billingRes.data as StoreBillingSettings) || null);
      setStatusHistory((historyRes.data || []) as StoreStatusHistory[]);
      setProductCount(productsRes.count || 0);
      setOrderCount(ordersRes.count || 0);

      const tasks = await getOnboardingTasks(supabase, storeId);
      setOnboardingTasks(tasks);

      // Initialize Social & Footer state
      const sLinks = (storeData as unknown as Store).social_links || {};
      const fHeadline = (storeData as unknown as Store).footer_headline || "";
      const fDescription = (storeData as unknown as Store).footer_description || "";

      setSocialLinks(sLinks);
      setFooterHeadline(fHeadline);
      setFooterDescription(fDescription);
      setLogoUrl((storeData as unknown as Store).logo_url || "");

      const actions = await getStoreActions(supabase, storeId);
      setAdminActions(actions as typeof adminActions);
    } catch (err: any) {
      setError(err?.message || "Failed to load store");
    } finally {
      setLoading(false);
    }
  }, [supabase, storeId]);

  useEffect(() => {
    if (storeId) {
      fetchStore();
      fetchProfiles();
      fetchDomains();
    }
  }, [storeId, fetchStore, fetchProfiles, fetchDomains]);

  const handleApplyTheme = async (template: HeadlessTemplate) => {
    if (!store || !currentUserId) return;
    setActionLoading(true);
    try {
      const { error: applyError } = await supabase
        .from("store_theme_configs")
        .insert({
          store_id: store.id,
          theme_code: template.theme_code,
          theme_settings: template.config || {},
          homepage_layout: [
            { type: "hero", title: `Welcome to ${store.name}`, body: "Start your shopping experience here." },
            { type: "featured_products", title: "Recently Added", limit: 4 }
          ]
        });

      if (applyError) throw applyError;

      await logStoreAction(supabase, {
        store_id: store.id,
        action: "theme_applied",
        details: { theme_code: template.theme_code, template_id: template.id },
        performed_by: currentUserId,
      });

      await fetchStore();
    } catch (err) {
      console.error("Apply theme failed:", err);
      alert(err instanceof Error ? err.message : "Failed to apply theme");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!store || !currentUserId) return;
    setActionLoading(true);
    try {
      await publishStore(supabase, store.id, currentUserId);
      await fetchStore();
    } catch (err) {
      console.error("Publish failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!store || !currentUserId) return;
    setActionLoading(true);
    try {
      await disableStore(supabase, store.id, currentUserId, "Disabled via admin panel");
      await fetchStore();
    } catch (err) {
      console.error("Disable failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storeId) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${storeId}/logo_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("store-images")
        .upload(filePath, file, {
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("store-images")
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
    } catch (err: any) {
      console.error("Failed to upload logo:", err);
      alert("Upload failed: " + (err?.message || "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!store) return;
    const ensureAbsoluteUrl = (url: string) => {
      if (!url) return url;
      const clean = url.trim();
      if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
      return `https://${clean}`;
    };

    setIsSavingSettings(true);
    try {
      // Clean social links to ensure they are absolute URLs
      const cleanedSocialLinks = Object.entries(socialLinks).reduce((acc, [key, val]) => {
        acc[key] = ensureAbsoluteUrl(val as string);
        return acc;
      }, {} as Record<string, string>);

      const updateData = {
        social_links: cleanedSocialLinks,
        footer_headline: footerHeadline || null,
        footer_description: footerDescription || null,
        logo_url: logoUrl || null,
      };
      
      const { error: updateError } = await supabase
        .from("stores")
        .update(updateData)
        .eq("id", storeId);

      if (updateError) throw updateError;

      await logStoreAction(supabase, {
        store_id: store.id,
        action: "settings_updated",
        details: { updated_fields: ["social_links", "footer_headline", "footer_description", "logo_url"] },
        performed_by: currentUserId || "",
      });

      alert("Settings saved successfully!");
      await fetchStore();
    } catch (err: any) {
      console.error("Save settings failed:", err);
      alert("Failed to save settings: " + (err?.message || "Unknown error"));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleEnable = async () => {
    if (!store || !currentUserId) return;
    setActionLoading(true);
    try {
      await enableStore(supabase, store.id, currentUserId);
      await fetchStore();
    } catch (err) {
      console.error("Enable failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveOwner = async () => {
    if (!store || !selectedOwnerId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/owner`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: selectedOwnerId }),
      });

      if (!res.ok) throw new Error("Failed to update owner");

      setAssignOwnerOpen(false);
      await fetchStore();
    } catch (err) {
      console.error("Change owner failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!store || !currentUserId || !trialDate) return;
    setActionLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("stores")
        .update({ trial_ends_at: new Date(trialDate).toISOString() })
        .eq("id", store.id);
      if (updateError) throw updateError;

      await logStoreAction(supabase, {
        store_id: store.id,
        action: "trial_extended",
        details: { new_trial_end: trialDate },
        performed_by: currentUserId,
      });
      setExtendTrialOpen(false);
      await fetchStore();
    } catch (err) {
      console.error("Extend trial failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveThemeSettings = async () => {
    if (!store || !themeConfig) return;
    setActionLoading(true);
    try {
      const parsed = JSON.parse(themeSettingsJson);
      const { error: updateError } = await supabase
        .from("store_theme_configs")
        .update({ theme_settings: parsed })
        .eq("id", themeConfig.id);
      if (updateError) throw updateError;

      await logStoreAction(supabase, {
        store_id: store.id,
        action: "theme_settings_updated",
        details: { updated_by: "admin" },
        performed_by: currentUserId,
      });
      setThemeSettingsOpen(false);
      await fetchStore();
    } catch (err) {
      console.error("Save theme settings failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveHomepageLayout = async () => {
    if (!store || !themeConfig) return;
    setActionLoading(true);
    try {
      const parsed = JSON.parse(homepageLayoutJson);
      const { error: updateError } = await supabase
        .from("store_theme_configs")
        .update({ homepage_layout: parsed })
        .eq("id", themeConfig.id);
      if (updateError) throw updateError;

      await logStoreAction(supabase, {
        store_id: store.id,
        action: "homepage_layout_updated",
        details: { updated_by: "admin" },
        performed_by: currentUserId,
      });
      setHomepageLayoutOpen(false);
      await fetchStore();
    } catch (err) {
      console.error("Save homepage layout failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleOnboarding = async (taskKey: string, completed: boolean) => {
    if (!completed) return;
    try {
      await completeOnboardingTask(supabase, storeId, taskKey);
      const tasks = await getOnboardingTasks(supabase, storeId);
      setOnboardingTasks(tasks);
    } catch (err) {
      console.error("Toggle onboarding failed:", err);
    }
  };

  const handleChangePlan = async () => {
    if (!store || !selectedPlan) return;
    setPlanSaving(true);
    setPlanSuccess("");
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Plan change failed:", data.error);
        return;
      }
      setPlanSuccess(`Plan changed to ${PLANS[selectedPlan]?.displayName || selectedPlan}`);
      await fetchStore();
    } catch (err) {
      console.error("Plan change error:", err);
    } finally {
      setPlanSaving(false);
    }
  };

  const handleSubdomainSave = async () => {
    if (!store) return;
    setSubdomainError("");
    setSubdomainSaving(true);
    try {
      const res = await fetch(`/api/admin/stores/${store.id}/subdomain`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: subdomainValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubdomainError(data.error || "Failed to update subdomain");
        return;
      }
      setSubdomainEditing(false);
      await fetchStore();
    } catch {
      setSubdomainError("Network error");
    } finally {
      setSubdomainSaving(false);
    }
  };

  const handleAddDomain = async () => {
    if (!store) return;
    const trimmed = newDomain.trim().toLowerCase();
    if (!trimmed) {
      setDomainError("Enter a domain");
      return;
    }
    setAddingDomain(true);
    setDomainError("");
    try {
      const { error } = await supabase.from("store_domains").insert({
        store_id: store.id,
        domain: trimmed,
        is_primary: domains.length === 0,
        verification_status: "verified", // Admins skip verification usually or we define it here
        ssl_status: "pending",
      });
      if (error) throw error;
      setNewDomain("");
      await fetchDomains();
    } catch (err) {
      console.error("Failed to add domain:", err);
      setDomainError("Failed to add domain");
    } finally {
      setAddingDomain(false);
    }
  };

  const handleTogglePrimaryDomain = async (domainId: string, isPrimary: boolean) => {
    try {
      if (isPrimary) {
        await supabase.from("store_domains").update({ is_primary: false }).eq("store_id", storeId);
      }
      await supabase.from("store_domains").update({ is_primary: isPrimary }).eq("id", domainId);
      await fetchDomains();
    } catch (err) {
      console.error("Failed to toggle primary:", err);
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    try {
      await supabase.from("store_domains").delete().eq("id", domainId);
      await fetchDomains();
    } catch (err) {
      console.error("Failed to remove domain:", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
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
            <Link href="/admin/stores">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {store.name}
              </h1>
              <StoreStatusBadge status={store.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {store.subdomain}.pixeocommerce.com
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" asChild>
            <Link href={`/admin/stores/${storeId}/pages`}>
              <FileText className="mr-2 h-4 w-4" />
              Manage Pages
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={fetchStore}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="gap-1.5">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-1.5">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Theme</span>
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-1.5">
            <LayoutTemplate className="h-4 w-4" />
            <span className="hidden sm:inline">Sections</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Actions</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        {/* ========== OVERVIEW TAB ========== */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{productCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orderCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Created</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {new Date(store.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Plan</CardTitle>
                <Badge variant="outline">
                  {billing?.subscription_plan || billing?.plan_name || "Free"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {billing?.subscription_status || billing?.billing_status || "No billing"}
                </div>
                {store.trial_ends_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Trial ends:{" "}
                    {new Date(store.trial_ends_at).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Store identity & Onboarding */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Store Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <span className="text-sm font-medium">{store.name}</span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Subdomain
                      </span>
                      {subdomainEditing ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-md border">
                            <Input
                              value={subdomainValue}
                              onChange={(e) => {
                                setSubdomainValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                                setSubdomainError("");
                              }}
                              className="h-7 w-36 border-0 text-xs"
                              placeholder="my-store"
                            />
                            <span className="pr-2 text-xs text-muted-foreground">.pixeocommerce.com</span>
                          </div>
                          <Button size="sm" variant="default" className="h-7 px-2 text-xs" onClick={handleSubdomainSave} disabled={subdomainSaving}>
                            {subdomainSaving ? "..." : "Save"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setSubdomainEditing(false); setSubdomainError(""); }}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {store.subdomain}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setSubdomainValue(store.subdomain);
                              setSubdomainEditing(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {subdomainError && (
                      <p className="text-right text-xs text-destructive">{subdomainError}</p>
                    )}
                    <p className="text-right text-xs text-muted-foreground">
                      https://{store.subdomain}.pixeocommerce.com
                    </p>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <StoreStatusBadge status={store.status} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Owner</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {store.owner?.email || "N/A"}
                      </span>
                      <Dialog
                        open={assignOwnerOpen}
                        onOpenChange={setAssignOwnerOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => setSelectedOwnerId(store.owner_id || "")}
                          >
                            <User className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign Store Owner</DialogTitle>
                            <DialogDescription>
                              Select a user to assign as the owner of this store.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">User</label>
                              <Select
                                value={selectedOwnerId}
                                onValueChange={setSelectedOwnerId}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                                <SelectContent>
                                  {profilesLoading ? (
                                    <SelectItem value="loading" disabled>Loading users...</SelectItem>
                                  ) : (
                                    allProfiles.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.email} ({p.full_name || "No name"})
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setAssignOwnerOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSaveOwner}
                              disabled={actionLoading || !selectedOwnerId}
                            >
                              {actionLoading ? "Updating..." : "Update Owner"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Currency
                    </span>
                    <span className="text-sm font-medium uppercase">
                      {store.currency}
                    </span>
                  </div>
                  {store.published_at && (
                    <>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Published
                        </span>
                        <span className="text-sm font-medium">
                          {new Date(store.published_at).toLocaleDateString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Onboarding Progress</CardTitle>
                <CardDescription>
                  {store.onboarding_completed
                    ? "All tasks completed"
                    : "Track store setup progress"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {onboardingTasks.length > 0 ? (
                  <OnboardingChecklist
                    tasks={onboardingTasks}
                    onToggle={handleToggleOnboarding}
                  />
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No onboarding tasks found
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Custom Domains Management (Admin Only) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Custom Domains
              </CardTitle>
              <CardDescription>
                Manage verified custom hostnames for this store.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {domains.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead>Primary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {domains.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-sm">{d.domain}</TableCell>
                          <TableCell>
                            <Switch 
                              checked={d.is_primary} 
                              onCheckedChange={(checked) => handleTogglePrimaryDomain(d.id, checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={d.verification_status === "verified" ? "default" : "secondary"}>
                              {d.verification_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(d.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveDomain(d.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                  <Globe className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No custom domains configured</p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="adminNewDomain">Add Custom Domain</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input 
                      id="adminNewDomain"
                      placeholder="e.g. shop.customerdomain.com"
                      value={newDomain}
                      onChange={(e) => {
                        setNewDomain(e.target.value);
                        setDomainError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                    />
                    {domainError && <p className="mt-1 text-xs text-destructive">{domainError}</p>}
                  </div>
                  <Button onClick={handleAddDomain} disabled={addingDomain}>
                    <Plus className="mr-2 h-4 w-4" />
                    {addingDomain ? "Adding..." : "Add Domain"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Note: Domains added here are automatically marked as verified for the middleware.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== THEME TAB ========== */}
        <TabsContent value="theme" className="space-y-6">
          {!themeConfig ? (
            <div className="space-y-6">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-4 rounded-full bg-primary/10 p-4">
                    <Palette className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Start with a Theme</h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    This store doesn&apos;t have a look and feel yet. Select a template from the registry to get started instantly.
                  </p>
                </CardContent>
              </Card>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id} className="overflow-hidden group hover:border-primary/50 transition-all">
                    <div className="relative aspect-video w-full bg-muted">
                      {template.thumbnail_url ? (
                        <img 
                          src={template.thumbnail_url} 
                          alt={template.name} 
                          className="h-full w-full object-cover transition-transform group-hover:scale-105" 
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/20" />
                        </div>
                      )}
                      {template.is_system && (
                        <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">System Default</Badge>
                      )}
                    </div>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">v{template.version || "1.0.0"}</span>
                      </div>
                      <CardDescription className="line-clamp-2 text-xs">
                        {template.description || "A professional headless theme for PixeoCommerce."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Button 
                        className="w-full h-9" 
                        disabled={actionLoading}
                        onClick={() => handleApplyTheme(template)}
                      >
                         {actionLoading ? "Applying..." : "Assign & Apply"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                
                {templates.length === 0 && (
                  <div className="col-span-full rounded-xl border-2 border-dashed p-10 text-center">
                    <p className="text-sm text-muted-foreground">No themes found in the Registry.</p>
                    <Button variant="link" asChild className="mt-2">
                       <Link href="/admin/templates">Go to Registry to add themes</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Theme code */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Theme</CardTitle>
                    <Badge>{themeConfig.theme_code}</Badge>
                  </div>
                  <CardDescription>
                    Current theme code and configuration
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Theme Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Theme Settings</CardTitle>
                    <Dialog
                      open={themeSettingsOpen}
                      onOpenChange={setThemeSettingsOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setThemeSettingsJson(
                              JSON.stringify(
                                themeConfig.theme_settings,
                                null,
                                2
                              )
                            )
                          }
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Theme Settings</DialogTitle>
                          <DialogDescription>
                            Modify the JSON theme settings below. Make sure the
                            JSON is valid before saving.
                          </DialogDescription>
                        </DialogHeader>
                        <Textarea
                          value={themeSettingsJson}
                          onChange={(e) => setThemeSettingsJson(e.target.value)}
                          className="min-h-[300px] font-mono text-sm"
                        />
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setThemeSettingsOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveThemeSettings}
                            disabled={actionLoading}
                          >
                            {actionLoading ? "Saving..." : "Save Changes"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                    {JSON.stringify(themeConfig.theme_settings, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              {/* Homepage Layout */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Homepage Layout
                      </CardTitle>
                      <CardDescription>
                        {themeConfig.homepage_layout?.length || 0} section
                        {(themeConfig.homepage_layout?.length || 0) !== 1
                          ? "s"
                          : ""}
                      </CardDescription>
                    </div>
                    <Dialog
                      open={homepageLayoutOpen}
                      onOpenChange={setHomepageLayoutOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setHomepageLayoutJson(
                              JSON.stringify(
                                themeConfig.homepage_layout,
                                null,
                                2
                              )
                            )
                          }
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Homepage Layout</DialogTitle>
                          <DialogDescription>
                            Modify the JSON array of homepage sections. Ensure
                            valid JSON before saving.
                          </DialogDescription>
                        </DialogHeader>
                        <Textarea
                          value={homepageLayoutJson}
                          onChange={(e) =>
                            setHomepageLayoutJson(e.target.value)
                          }
                          className="min-h-[300px] font-mono text-sm"
                        />
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setHomepageLayoutOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveHomepageLayout}
                            disabled={actionLoading}
                          >
                            {actionLoading ? "Saving..." : "Save Changes"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {themeConfig.homepage_layout &&
                  themeConfig.homepage_layout.length > 0 ? (
                    <div className="space-y-2">
                      {themeConfig.homepage_layout.map(
                        (section: HomepageSection, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="font-mono">
                                {idx + 1}
                              </Badge>
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {section.type.replace(/_/g, " ")}
                                </p>
                                {section.title && (
                                  <p className="text-xs text-muted-foreground">
                                    {section.title}
                                  </p>
                                )}
                              </div>
                            </div>
                            {section.variant && (
                              <Badge variant="outline">{section.variant}</Badge>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No homepage sections configured
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ========== SECTIONS TAB ========== */}
        <TabsContent value="sections" className="space-y-6">
          {themeConfig ? (
            <ThemeSectionsEditor
              storeId={storeId}
              homepageLayout={themeConfig.homepage_layout || []}
              themeCode={themeConfig.theme_code}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <LayoutTemplate className="mb-4 h-10 w-10 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold">No Theme Assigned</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Assign a theme to this store first via the Theme tab, then come back here to customize section content.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== SETTINGS TAB ========== */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Social Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Social Media Links
                </CardTitle>
                <CardDescription>
                  Links appear in the storefront footer. Empty fields will be hidden.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {[
                    { id: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/..." },
                    { id: "facebook", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/..." },
                    { id: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/..." },
                    { id: "tiktok", label: "TikTok", icon: RefreshCw, placeholder: "https://tiktok.com/@..." },
                    { id: "x", label: "X / Twitter", icon: Twitter, placeholder: "https://x.com/..." },
                  ].map((platform) => (
                    <div key={platform.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <platform.icon className="h-4 w-4 text-muted-foreground" />
                        <label className="text-sm font-medium">{platform.label}</label>
                      </div>
                      <Input
                        placeholder={platform.placeholder}
                        value={socialLinks[platform.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSocialLinks(prev => ({ ...prev, [platform.id]: val }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {/* Branding & Assets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Branding & Assets
                  </CardTitle>
                  <CardDescription>
                    Manage the store's primary logo and visual identifiers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="h-24 w-24 overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex items-center justify-center relative">
                      {logoUrl ? (
                         <img 
                           src={logoUrl} 
                           alt="Logo preview" 
                           className="h-full w-full object-contain p-2" 
                         />
                      ) : (
                         <Package className="h-6 w-6 text-muted-foreground/30" />
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                       <label className="text-sm font-medium block">Store Logo</label>
                       <div className="flex items-center gap-2">
                         <Button variant="outline" size="sm" className="relative cursor-pointer" disabled={isUploading} asChild>
                           <label>
                             {isUploading ? "Uploading..." : "Upload New Logo"}
                             <input type="file" className="sr-only" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                           </label>
                         </Button>
                         {logoUrl && (
                           <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setLogoUrl("")}>
                             Remove
                           </Button>
                         )}
                       </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logo URL Override</label>
                    <Input 
                      placeholder="https://..." 
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Footer Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Footer Editorial
                  </CardTitle>
                  <CardDescription>
                    The brand story and headline displayed at the center of the footer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Footer Headline</label>
                    <Input
                      placeholder="e.g. Crafted for those who value quality..."
                      value={footerHeadline}
                      onChange={(e) => setFooterHeadline(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground italic">
                      Centered bold text above the description.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Footer Description</label>
                    <Textarea
                      placeholder="Tell the brand story..."
                      className="min-h-[150px]"
                      value={footerDescription}
                      onChange={(e) => setFooterDescription(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground italic">
                      The paragraph of text displayed in the center.
                    </p>
                  </div>
                </CardContent>
                <Separator />
                <CardContent className="pt-6">
                  <Button 
                    className="w-full" 
                    onClick={handleSaveSettings} 
                    disabled={isSavingSettings}
                  >
                    {isSavingSettings ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save All Storefront Settings"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ========== ACTIONS TAB ========== */}
        <TabsContent value="actions" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Publish / Unpublish */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {store.status === "live" ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                  {store.status === "live" ? "Unpublish" : "Publish"} Store
                </CardTitle>
                <CardDescription>
                  {store.status === "live"
                    ? "Take the store offline and set to maintenance mode"
                    : "Make the store live and accessible to customers"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="w-full"
                      variant={store.status === "live" ? "outline" : "default"}
                      disabled={actionLoading}
                    >
                      {store.status === "live" ? (
                        <>
                          <EyeOff className="mr-2 h-4 w-4" />
                          Unpublish Store
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Publish Store
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {store.status === "live"
                          ? "Unpublish Store?"
                          : "Publish Store?"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {store.status === "live"
                          ? `This will set "${store.name}" to maintenance mode. Customers will no longer be able to access the storefront.`
                          : `This will make "${store.name}" live. Customers will be able to browse and purchase from the storefront.`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={
                          store.status === "live"
                            ? async () => {
                                setActionLoading(true);
                                try {
                                  await supabase
                                    .from("stores")
                                    .update({ status: "maintenance" })
                                    .eq("id", store.id);
                                  await logStoreAction(supabase, {
                                    store_id: store.id,
                                    action: "unpublished",
                                    performed_by: currentUserId,
                                  });
                                  await fetchStore();
                                } finally {
                                  setActionLoading(false);
                                }
                              }
                            : handlePublish
                        }
                      >
                        {store.status === "live" ? "Unpublish" : "Publish"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Enable / Disable */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {store.status === "disabled" ? (
                    <Power className="h-5 w-5" />
                  ) : (
                    <PowerOff className="h-5 w-5" />
                  )}
                  {store.status === "disabled" ? "Enable" : "Disable"} Store
                </CardTitle>
                <CardDescription>
                  {store.status === "disabled"
                    ? "Re-enable this store and restore access"
                    : "Completely disable this store. It will be inaccessible."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="w-full"
                      variant={
                        store.status === "disabled" ? "default" : "destructive"
                      }
                      disabled={actionLoading}
                    >
                      {store.status === "disabled" ? (
                        <>
                          <Power className="mr-2 h-4 w-4" />
                          Enable Store
                        </>
                      ) : (
                        <>
                          <PowerOff className="mr-2 h-4 w-4" />
                          Disable Store
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {store.status === "disabled"
                          ? "Enable Store?"
                          : "Disable Store?"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {store.status === "disabled"
                          ? `This will re-enable "${store.name}" and set it back to live status.`
                          : `This will completely disable "${store.name}". The store will be inaccessible to everyone including the owner.`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={
                          store.status === "disabled"
                            ? handleEnable
                            : handleDisable
                        }
                      >
                        {store.status === "disabled" ? "Enable" : "Disable"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Plan Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCardIcon className="h-5 w-5" />
                  Change Plan
                </CardTitle>
                <CardDescription>
                  Current plan: <strong>{billing?.subscription_plan || billing?.plan_name || "None"}</strong>
                  {billing?.subscription_plan && PLANS[billing.subscription_plan]?.transactionFeePercent > 0 && (
                    <span className="ml-1 text-amber-600">
                      ({PLANS[billing.subscription_plan].transactionFeePercent}% commission per sale)
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={selectedPlan}
                  onValueChange={(val) => { setSelectedPlan(val); setPlanSuccess(""); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PLANS).map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.displayName}
                        {p.priceMonthly === 0
                          ? ` (Free — ${p.transactionFeePercent}% per sale)`
                          : ` (£${p.priceMonthly}/mo)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPlan && PLANS[selectedPlan] && (
                  <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
                    <p><strong>{PLANS[selectedPlan].displayName}</strong></p>
                    <p>Max products: {PLANS[selectedPlan].maxProducts === -1 ? "Unlimited" : PLANS[selectedPlan].maxProducts}</p>
                    <p>Price: {PLANS[selectedPlan].priceMonthly === 0 ? "Free" : `£${PLANS[selectedPlan].priceMonthly}/mo`}</p>
                    {PLANS[selectedPlan].transactionFeePercent > 0 && (
                      <p className="text-amber-600 font-medium">
                        Commission: {PLANS[selectedPlan].transactionFeePercent}% per sale
                      </p>
                    )}
                  </div>
                )}
                {planSuccess && (
                  <p className="text-sm text-green-600 font-medium">{planSuccess}</p>
                )}
                <Button
                  className="w-full"
                  onClick={handleChangePlan}
                  disabled={planSaving || !selectedPlan}
                >
                  {planSaving ? "Updating..." : "Update Plan"}
                </Button>
              </CardContent>
            </Card>

            {/* Extend Trial */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Extend Trial
                </CardTitle>
                <CardDescription>
                  {store.trial_ends_at
                    ? `Current trial ends: ${new Date(store.trial_ends_at).toLocaleDateString()}`
                    : "No trial date set"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog
                  open={extendTrialOpen}
                  onOpenChange={setExtendTrialOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Calendar className="mr-2 h-4 w-4" />
                      Extend Trial
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Extend Trial Period</DialogTitle>
                      <DialogDescription>
                        Set a new trial end date for &quot;{store.name}&quot;.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          New Trial End Date
                        </label>
                        <Input
                          type="date"
                          value={trialDate}
                          onChange={(e) => setTrialDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                      {store.trial_ends_at && (
                        <p className="text-sm text-muted-foreground">
                          Current trial ends:{" "}
                          {new Date(store.trial_ends_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setExtendTrialOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleExtendTrial}
                        disabled={actionLoading || !trialDate}
                      >
                        {actionLoading ? "Saving..." : "Extend Trial"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========== HISTORY TAB ========== */}
        <TabsContent value="history" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Status History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status History</CardTitle>
                <CardDescription>
                  Timeline of status changes for this store
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statusHistory.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No status changes recorded
                  </p>
                ) : (
                  <div className="relative space-y-0">
                    {statusHistory.map((entry, idx) => (
                      <div key={entry.id} className="flex gap-4 pb-6 last:pb-0">
                        <div className="relative flex flex-col items-center">
                          <div className="z-10 h-3 w-3 rounded-full bg-primary" />
                          {idx < statusHistory.length - 1 && (
                            <div className="absolute top-3 h-full w-px bg-border" />
                          )}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {entry.status.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.created_at).toLocaleString()}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin Actions Log */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Admin Actions</CardTitle>
                <CardDescription>
                  Log of all admin actions performed on this store
                </CardDescription>
              </CardHeader>
              <CardContent>
                {adminActions.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No admin actions recorded
                  </p>
                ) : (
                  <div className="space-y-3">
                    {adminActions.map((action) => (
                      <div
                        key={action.id}
                        className="flex items-start justify-between rounded-lg border p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium capitalize">
                            {action.action.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {action.profiles?.full_name ||
                              action.profiles?.email ||
                              "System"}
                          </p>
                          {action.details && (
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {JSON.stringify(action.details)}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(action.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
