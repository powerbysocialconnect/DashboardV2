"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type {
  Store,
  StoreThemeConfig,
  ThemeSettings,
  HomepageSection,
  HomepageSectionType,
  ThemeCode,
} from "@/types/database";
import {
  Palette,
  Save,
  ExternalLink,
  Plus,
  Trash2,
  GripVertical,
  Check,
} from "lucide-react";

const FONT_OPTIONS = [
  "Inter",
  "Playfair Display",
  "Montserrat",
  "Roboto",
  "Poppins",
  "Lora",
  "Raleway",
  "Open Sans",
];

const SECTION_TYPES: { value: HomepageSectionType; label: string }[] = [
  { value: "hero", label: "Hero Banner" },
  { value: "featured_products", label: "Featured Products" },
  { value: "category_grid", label: "Category Grid" },
  { value: "image_with_text", label: "Image with Text" },
  { value: "testimonials", label: "Testimonials" },
  { value: "newsletter", label: "Newsletter" },
  { value: "rich_text", label: "Rich Text" },
];

const THEME_OPTIONS: {
  code: ThemeCode;
  name: string;
  description: string;
  features: string[];
}[] = [
  {
    code: "starter",
    name: "Starter",
    description: "Clean and minimal design perfect for getting started",
    features: ["Simple layout", "Mobile responsive", "Basic customization"],
  },
  {
    code: "premium",
    name: "Premium",
    description: "Enhanced design with advanced features and animations",
    features: [
      "Custom animations",
      "Advanced grid layouts",
      "Product quick-view",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    description: "Maximum performance with professional features and layout",
    features: [
      "Parallax scrolling",
      "Video backgrounds",
      "Premium typography",
    ],
  },
  {
    code: "store",
    name: "Store",
    description: "Retail-optimized layout with focus on product conversion",
    features: [
      "Optimized checkout flow",
      "Product quick-view",
      "Category deep-links",
    ],
  },
  {
    code: "maintenance",
    name: "Maintenance",
    description: "Temporary splash page for store updates",
    features: [
      "Coming soon message",
      "Email collection",
      "Social links",
    ],
  },
];

const DEFAULT_SETTINGS: ThemeSettings = {
  primaryColor: "#000000",
  accentColor: "#666666",
  backgroundColor: "#ffffff",
  headingFont: "Inter",
  bodyFont: "Inter",
  buttonStyle: "rounded",
  logoAlignment: "left",
};

export default function ThemePage() {
  const supabase = createClient();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  const [themeCode, setThemeCode] = useState<ThemeCode>("starter");
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [newSectionType, setNewSectionType] =
    useState<HomepageSectionType>("hero");

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .limit(1)
        .single();

      if (!storeData) return;
      setStore(storeData as Store);

      const { data: config } = await supabase
        .from("store_theme_configs")
        .select("*")
        .eq("store_id", storeData.id)
        .limit(1)
        .single();

      if (config) {
        const c = config as StoreThemeConfig;
        setConfigId(c.id);
        setThemeCode(c.theme_code);
        setSettings(c.theme_settings || DEFAULT_SETTINGS);
        setSections(c.homepage_layout || []);
      }

      setLoading(false);
    }
    init();
  }, [supabase]);

  const updateSetting = useCallback(
    <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setSaved(false);
    },
    []
  );

  function addSection() {
    const newSection: HomepageSection = {
      type: newSectionType,
      title: "",
      subtitle: "",
      body: "",
    };
    setSections((prev) => [...prev, newSection]);
    setSaved(false);
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  function updateSection(
    index: number,
    field: keyof HomepageSection,
    value: string
  ) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
    setSaved(false);
  }

  async function handleSave() {
    if (!store) return;
    setSaving(true);
    try {
      const payload = {
        store_id: store.id,
        theme_code: themeCode,
        theme_settings: settings,
        homepage_layout: sections,
        updated_at: new Date().toISOString(),
      };

      if (configId) {
        const { error } = await supabase
          .from("store_theme_configs")
          .update(payload)
          .eq("id", configId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("store_theme_configs")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        if (data) setConfigId(data.id);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save theme config:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-2 h-9 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Theme & Design</h1>
          <p className="text-muted-foreground">
            Customize the look and feel of your storefront
          </p>
        </div>
        <div className="flex items-center gap-3">
          {store?.subdomain && (
            <Button
              variant="outline"
              onClick={() =>
                window.open(`/store/${store.subdomain}`, "_blank")
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview Store
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
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
      </div>

      {/* Theme Selection */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Choose a Theme</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {THEME_OPTIONS.map((theme) => (
            <Card
              key={theme.code}
              className={`cursor-pointer transition-all hover:shadow-md ${
                themeCode === theme.code
                  ? "ring-2 ring-primary shadow-md"
                  : "hover:border-primary/50"
              }`}
              onClick={() => {
                setThemeCode(theme.code);
                setSaved(false);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{theme.name}</CardTitle>
                  {themeCode === theme.code && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <CardDescription className="text-xs">
                  {theme.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {theme.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Settings
          </CardTitle>
          <CardDescription>
            Customize colors, fonts, and layout options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Colors */}
          <div>
            <h3 className="mb-3 text-sm font-medium">Colors</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  {
                    key: "primaryColor" as const,
                    label: "Primary Color",
                  },
                  {
                    key: "accentColor" as const,
                    label: "Accent Color",
                  },
                  {
                    key: "backgroundColor" as const,
                    label: "Background Color",
                  },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-9 w-9 shrink-0 rounded-md border"
                      style={{ backgroundColor: settings[key] }}
                    />
                    <Input
                      id={key}
                      value={settings[key]}
                      onChange={(e) => updateSetting(key, e.target.value)}
                      placeholder="#000000"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Fonts */}
          <div>
            <h3 className="mb-3 text-sm font-medium">Fonts</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="headingFont">Heading Font</Label>
                <Select
                  value={settings.headingFont}
                  onValueChange={(val) => updateSetting("headingFont", val)}
                >
                  <SelectTrigger id="headingFont">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font} value={font}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bodyFont">Body Font</Label>
                <Select
                  value={settings.bodyFont}
                  onValueChange={(val) => updateSetting("bodyFont", val)}
                >
                  <SelectTrigger id="bodyFont">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font} value={font}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Button Style */}
          <div>
            <h3 className="mb-3 text-sm font-medium">Button Style</h3>
            <div className="flex gap-3">
              {(["rounded", "square", "pill"] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => updateSetting("buttonStyle", style)}
                  className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    settings.buttonStyle === style
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`h-6 w-16 border-2 border-current ${
                      style === "rounded"
                        ? "rounded-md"
                        : style === "pill"
                          ? "rounded-full"
                          : "rounded-none"
                    }`}
                  />
                  <span className="capitalize">{style}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Logo Alignment */}
          <div>
            <h3 className="mb-3 text-sm font-medium">Logo Alignment</h3>
            <div className="flex gap-3">
              {(["left", "center", "right"] as const).map((alignment) => (
                <button
                  key={alignment}
                  type="button"
                  onClick={() => updateSetting("logoAlignment", alignment)}
                  className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                    settings.logoAlignment === alignment
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`text-${alignment === "center" ? "center" : alignment === "right" ? "right" : "left"}`}
                  >
                    <div className="mb-1 h-2 w-16 rounded bg-current opacity-30 inline-block" />
                  </div>
                  <p className="mt-1 capitalize text-xs">{alignment}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Homepage Sections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Homepage Sections</CardTitle>
              <CardDescription>
                Manage the sections displayed on your storefront homepage
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No sections added yet
              </p>
              <p className="text-xs text-muted-foreground">
                Add sections below to build your homepage
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((section, index) => (
                <Card key={index} className="border bg-muted/30">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="capitalize">
                          {section.type.replace(/_/g, " ")}
                        </Badge>
                        {section.title && (
                          <span className="text-sm text-muted-foreground">
                            — {section.title}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeSection(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Title</Label>
                        <Input
                          value={section.title || ""}
                          onChange={(e) =>
                            updateSection(index, "title", e.target.value)
                          }
                          placeholder="Section title"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Subtitle</Label>
                        <Input
                          value={section.subtitle || ""}
                          onChange={(e) =>
                            updateSection(index, "subtitle", e.target.value)
                          }
                          placeholder="Section subtitle"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Body Text</Label>
                        <Input
                          value={section.body || ""}
                          onChange={(e) =>
                            updateSection(index, "body", e.target.value)
                          }
                          placeholder="Body text"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Separator />

          <div className="flex items-center gap-3">
            <Select
              value={newSectionType}
              onValueChange={(v) =>
                setNewSectionType(v as HomepageSectionType)
              }
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Section type" />
              </SelectTrigger>
              <SelectContent>
                {SECTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={addSection}>
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sticky Save Bar */}
      <div className="flex items-center justify-end gap-3 rounded-lg border bg-card p-4">
        {store?.subdomain && (
          <Button
            variant="outline"
            onClick={() =>
              window.open(`/store/${store.subdomain}`, "_blank")
            }
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Preview Store
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saved ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Saved Successfully
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save All Changes"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
