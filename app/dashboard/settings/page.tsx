"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Separator } from "@/components/ui/separator";
import type { Store } from "@/types/database";
import {
  Save,
  Check,
  Settings,
  Image as ImageIcon,
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Truck,
} from "lucide-react";

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

const SOCIAL_FIELDS = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourstore" },
  { key: "twitter", label: "X", placeholder: "https://x.com/yourstore" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourstore" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourstore" },
];

export default function SettingsPage() {
  const supabase = createClient();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [logoUrl, setLogoUrl] = useState("");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({
    instagram: "",
    twitter: "",
    facebook: "",
    tiktok: "",
  });

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .limit(1)
        .single();

      if (data) {
        const s = data as Store;
        setStore(s);
        setName(s.name || "");
        setDescription(s.description || "");
        setCurrency(s.currency || "USD");
        setLogoUrl(s.logo_url || "");

        const branding = (s.branding || {}) as Record<string, unknown>;
        const links = (branding.social_links || {}) as Record<string, string>;
        setSocialLinks({
          instagram: links.instagram || "",
          twitter: links.twitter || "",
          facebook: links.facebook || "",
          tiktok: links.tiktok || "",
        });
      }

      setLoading(false);
    }
    init();
  }, [supabase]);

  function updateSocial(key: string, value: string) {
    setSocialLinks((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !store) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${store.id}/logo_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
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
      setSaved(false);
    } catch (err) {
      console.error("Failed to upload logo:", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave() {
    if (!store) return;
    setSaving(true);
    try {
      const existingBranding = (store.branding || {}) as Record<string, unknown>;

      const { error } = await supabase
        .from("stores")
        .update({
          name,
          description: description || null,
          currency,
          logo_url: logoUrl || null,
          branding: {
            ...existingBranding,
            social_links: socialLinks,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", store.id);

      if (error) throw error;

      setStore((prev) =>
        prev
          ? {
              ...prev,
              name,
              description,
              currency,
              logo_url: logoUrl || null,
              branding: { ...existingBranding, social_links: socialLinks },
            }
          : null
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDisableStore() {
    if (!store) return;
    try {
      const { error } = await supabase
        .from("stores")
        .update({ is_disabled: true, updated_at: new Date().toISOString() })
        .eq("id", store.id);
      if (error) throw error;
      setStore((prev) => (prev ? { ...prev, is_disabled: true } : null));
    } catch (err) {
      console.error("Failed to disable store:", err);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-2 h-9 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const nameValid = name.trim().length >= 2;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
          <p className="text-muted-foreground">
            Manage your store configuration and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !nameValid}>
          {saved ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </>
          )}
        </Button>
      </div>

      {/* Stripe Connection */}
      <Card className={store?.stripe_account_id ? "border-green-200 bg-green-50/10" : "border-amber-200 bg-amber-50/10"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Integration
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to receive payments from customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {store?.stripe_connected ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              ) : store?.stripe_account_id ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <CreditCard className="h-6 w-6" />
                </div>
              )}
              <div>
                <p className="font-semibold text-sm">
                  {store?.stripe_connected 
                    ? "Stripe Connected" 
                    : store?.stripe_account_id 
                    ? "Onboarding Incomplete" 
                    : "Stripe Not Connected"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {store?.stripe_connected 
                    ? `Account ID: ${store.stripe_account_id}` 
                    : store?.stripe_account_id
                    ? "Complete your setup to start receiving payments."
                    : "You need to connect a Stripe account to accept payments."}
                </p>
              </div>
            </div>
            
            <Button 
              variant={store?.stripe_connected ? "outline" : "default"}
              size="sm"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/dashboard/stores/${store?.id}/connect-stripe`, { method: "POST" });
                  const data = await res.json();
                  if (data.url) {
                    window.location.href = data.url;
                  } else {
                    alert("Failed to start Stripe onboarding: " + (data.error || "Unknown error"));
                  }
                } catch (err) {
                  console.error("Stripe connect error:", err);
                  alert("An error occurred while connecting to Stripe.");
                }
              }}
            >
              {store?.stripe_account_id ? (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {store?.stripe_connected ? "View/Update Stripe Account" : "Complete Setup"}
                </>
              ) : (
                <>Connect Stripe</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Information
          </CardTitle>
          <CardDescription>
            Basic information about your store
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeName">
              Store Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="storeName"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              placeholder="My Awesome Store"
            />
            {!nameValid && name.length > 0 && (
              <p className="text-xs text-destructive">
                Store name must be at least 2 characters
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="storeDescription">Store Description</Label>
            <Textarea
              id="storeDescription"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSaved(false);
              }}
              placeholder="A brief description of your store and what you sell..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={currency}
              onValueChange={(val) => {
                setCurrency(val);
                setSaved(false);
              }}
            >
              <SelectTrigger id="currency" className="w-full sm:w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Store Logo
          </CardTitle>
          <CardDescription>
            Provide a URL to your store logo image
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative group">
              <div className="h-32 w-32 overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex items-center justify-center">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Store logo preview"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Logo Image</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative cursor-pointer"
                    disabled={isUploading}
                    asChild
                  >
                    <label>
                      {isUploading ? "Uploading..." : "Upload New Logo"}
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </Button>
                  {logoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/5"
                      onClick={() => {
                        setLogoUrl("");
                        setSaved(false);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                  PNG, JPG or SVG. Max 2MB recommended.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl" className="text-xs">Or use Image URL</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="https://example.com/logo.png"
                  type="url"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>
            Connect your social media profiles to your store
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SOCIAL_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                value={socialLinks[field.key] || ""}
                onChange={(e) => updateSocial(field.key, e.target.value)}
                placeholder={field.placeholder}
                type="url"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Fulfillment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipping & Fulfillment
          </CardTitle>
          <CardDescription>
            Configure how you deliver products to your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Shipping Methods</p>
              <p className="text-xs text-muted-foreground">
                Manage your delivery rates and estimated times
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/dashboard/settings/shipping">
                Configure Methods
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions for your store
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
            <div>
              <p className="text-sm font-medium">Disable Store</p>
              <p className="text-xs text-muted-foreground">
                This will take your store offline. Customers will not be able to
                access it.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={store?.is_disabled}
                >
                  {store?.is_disabled ? "Store Disabled" : "Disable Store"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Are you sure you want to disable your store?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will immediately take your store offline. Customers will
                    no longer be able to access your storefront or make
                    purchases. You can contact support to re-enable it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisableStore}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Disable Store
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
