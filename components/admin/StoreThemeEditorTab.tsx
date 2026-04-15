"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Save, Check, Palette, AlertTriangle, Loader2, ListTree } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

import type { ThemeDefinition, ResolvedThemeConfig } from "@/lib/themes/types";
import { getThemeByCode } from "@/lib/themes/registry";
import { buildDefaultThemeConfig } from "@/lib/themes/resolveThemeConfig";
import {
  TokenFieldGroup,
  SectionFieldGroup,
} from "@/components/admin/ThemeFieldEditor";

interface StoreThemeEditorTabProps {
  storeId: string;
}

export function StoreThemeEditorTab({ storeId }: StoreThemeEditorTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ path: string; message: string }[]>([]);

  const [themeCode, setThemeCode] = useState("core");
  const [themeDef, setThemeDef] = useState<ThemeDefinition | null>(null);
  const [tokens, setTokens] = useState<Record<string, unknown>>({});
  const [sections, setSections] = useState<Record<string, Record<string, unknown>>>({});
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; category_id?: string | null }[]>([]);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/theme-config`);
      if (!res.ok) {
        toast.error("Failed to load theme config.");
        return;
      }
      const data = await res.json();
      const code = data.themeCode || "core";

      setThemeCode(code);

      const def = (data.themeDefinition as ThemeDefinition | null) ?? getThemeByCode(code) ?? null;
      setThemeDef(def || null);

      const resolved = data.resolvedConfig as ResolvedThemeConfig | null;
      if (resolved) {
        setTokens(resolved.tokens);
        setSections(resolved.sections);
      } else if (def) {
        const defaults = buildDefaultThemeConfig(def);
        setTokens(defaults.tokens);
        setSections(defaults.sections);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading theme config");
    }
  }, [storeId]);

  const loadCategories = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .eq("store_id", storeId)
      .eq("active", true)
      .order("name");
    
    if (data) setCategories(data);
  }, [storeId]);

  const loadProducts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("id, name, category_id")
      .eq("store_id", storeId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(200);

    if (data) setProducts(data);
  }, [storeId]);

  useEffect(() => {
    async function init() {
      await Promise.all([loadConfig(), loadCategories(), loadProducts()]);
      setLoading(false);
    }
    init();
  }, [loadConfig, loadCategories, loadProducts]);

  function updateToken(key: string, value: unknown) {
    setTokens((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setValidationErrors([]);
  }

  function updateSectionField(sectionId: string, key: string, value: unknown) {
    setSections((prev) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] || {}), [key]: value },
    }));
    setSaved(false);
    setValidationErrors([]);
  }

  async function handleSave() {
    setSaving(true);
    setValidationErrors([]);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/theme-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeCode, tokens, sections }),
      });
      const data = await res.json();

      if (res.status === 422 && data.details) {
        setValidationErrors(data.details);
        toast.error(`Validation failed: ${data.details.length} issue(s) found.`);
        return;
      }

      if (!res.ok) {
        toast.error(data.error || "Failed to save.");
        return;
      }

      setSaved(true);
      toast.success("Theme configuration saved.");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      toast.error("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
             <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight">Theme Field Editor</h3>
            <p className="text-xs text-muted-foreground">Adjust design tokens and section-specific content</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="shadow-lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : saved ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Saved
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Configuration
            </>
          )}
        </Button>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-900">
                  Validation errors ({validationErrors.length})
                </p>
                {validationErrors.map((e, i) => (
                  <p key={i} className="text-xs text-red-700">
                    <code className="font-mono">{e.path}</code>: {e.message}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Config Sections */}
      <div className="grid gap-6">
        {/* Active Theme (read-only in this tab) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Theme (This Store)</CardTitle>
            <CardDescription>
              This editor only modifies the merchant&apos;s current active theme.
              Theme assignment should be changed in the Theme tab.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono">{themeCode}</Badge>
              <span className="text-sm font-medium">
                {themeDef?.name || "Unknown Theme"}
              </span>
              {themeDef?.minPlan && (
                <Badge variant="secondary" className="text-[10px]">
                  Requires {themeDef.minPlan}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {!themeDef ? (
          <Card>
            <CardContent className="py-20 text-center">
              <p className="text-muted-foreground">
                No schema definition found for theme <strong>{themeCode}</strong>.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Tokens */}
            {themeDef.editableTokens && themeDef.editableTokens.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                     <Palette className="h-4 w-4" /> Design Tokens
                  </CardTitle>
                  <CardDescription>Global colors, typography, and site-wide styles</CardDescription>
                </CardHeader>
                <CardContent>
                  <TokenFieldGroup
                    tokens={themeDef.editableTokens}
                    values={tokens}
                    products={products}
                    onChange={updateToken}
                  />
                </CardContent>
              </Card>
            )}

            {/* Sections */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                 <ListTree className="h-4 w-4" /> Content Sections
              </h4>
              <Accordion type="multiple" className="space-y-3">
                {themeDef.editableSections.map((section) => {
                  const sectionValues = sections[section.id] || {};
                  const isEnabled = sectionValues.enabled !== undefined
                    ? Boolean(sectionValues.enabled)
                    : section.defaultEnabled !== false;
                  
                  return (
                    <AccordionItem
                      key={section.id}
                      value={section.id}
                      className="border rounded-xl bg-card overflow-hidden"
                    >
                      <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-[10px] font-mono px-1.5 h-5">
                            {section.type}
                          </Badge>
                          <span className="font-semibold text-sm">{section.label}</span>
                          {!isEnabled && (
                            <Badge variant="outline" className="text-[9px] border text-muted-foreground h-4">
                              Disabled
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pt-0 pb-6 border-t bg-muted/5">
                        <div className="pt-6">
                           <SectionFieldGroup
                            section={section}
                            values={sectionValues}
                            categories={categories}
                            products={products}
                            onChange={(key, val) => updateSectionField(section.id, key, val)}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
