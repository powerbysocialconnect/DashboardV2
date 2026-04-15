"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Check, Palette, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import type { ThemeDefinition, ResolvedThemeConfig } from "@/lib/themes/types";
import { getAllThemes, getThemeByCode } from "@/lib/themes/registry";
import { buildDefaultThemeConfig } from "@/lib/themes/resolveThemeConfig";
import {
  TokenFieldGroup,
  SectionFieldGroup,
} from "@/components/admin/ThemeFieldEditor";

export default function AdminThemeEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const storeId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [validationErrors, setValidationErrors] = useState<{ path: string; message: string }[]>([]);

  const [themeCode, setThemeCode] = useState("core");
  const [themeDef, setThemeDef] = useState<ThemeDefinition | null>(null);
  const [tokens, setTokens] = useState<Record<string, unknown>>({});
  const [sections, setSections] = useState<Record<string, Record<string, unknown>>>({});

  const allThemes = getAllThemes();

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

      const def = getThemeByCode(code);
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

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.is_admin) { router.push("/dashboard"); return; }

      const { data: store } = await supabase
        .from("stores")
        .select("name")
        .eq("id", storeId)
        .single();
      if (store) setStoreName(store.name);

      await loadConfig();
      setLoading(false);
    }
    init();
  }, [storeId, router, loadConfig]);

  function handleThemeSwitch(newCode: string) {
    setThemeCode(newCode);
    const def = getThemeByCode(newCode);
    setThemeDef(def || null);
    setValidationErrors([]);

    if (def) {
      const defaults = buildDefaultThemeConfig(def);
      setTokens(defaults.tokens);
      setSections(defaults.sections);
    } else {
      setTokens({});
      setSections({});
    }
  }

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
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/stores/${storeId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme Editor
            </h1>
            <p className="text-sm text-muted-foreground">
              {storeName} — Schema-driven field editor
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saved ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Saved
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
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

      {/* Theme Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Active Theme</CardTitle>
          <CardDescription>Switch theme or edit the current one&apos;s fields</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={themeCode} onValueChange={handleThemeSwitch}>
              <SelectTrigger className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allThemes.map((t) => (
                  <SelectItem key={t.code} value={t.code}>
                    {t.name} (v{t.version})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline">{themeCode}</Badge>
            {themeDef?.minPlan && (
              <Badge variant="secondary" className="text-[10px]">
                Requires {themeDef.minPlan}
              </Badge>
            )}
          </div>
          {themeDef?.description && (
            <p className="mt-3 text-sm text-muted-foreground">{themeDef.description}</p>
          )}
        </CardContent>
      </Card>

      {!themeDef ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No schema definition found for theme <strong>{themeCode}</strong>.
              Add a definition file in <code>lib/themes/definitions/</code>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tokens */}
          {themeDef.editableTokens && themeDef.editableTokens.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Design Tokens</CardTitle>
                <CardDescription>Global colors, fonts, and brand variables</CardDescription>
              </CardHeader>
              <CardContent>
                <TokenFieldGroup
                  tokens={themeDef.editableTokens}
                  values={tokens}
                  onChange={updateToken}
                />
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Sections */}
          <div>
            <h2 className="text-lg font-bold mb-4">Sections</h2>
            <Accordion type="multiple" className="space-y-2">
              {themeDef.editableSections.map((section) => {
                const sectionValues = sections[section.id] || {};
                const isEnabled = sectionValues.enabled !== undefined
                  ? Boolean(sectionValues.enabled)
                  : section.defaultEnabled !== false;
                const showToggle = section.supportsToggle !== false;

                return (
                  <AccordionItem
                    key={section.id}
                    value={section.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {section.type}
                        </Badge>
                        {section.label}
                        {showToggle && !isEnabled && (
                          <Badge variant="secondary" className="text-[9px] ml-1">
                            Disabled
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      <SectionFieldGroup
                        section={section}
                        values={sectionValues}
                        onChange={(key, val) => updateSectionField(section.id, key, val)}
                      />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </>
      )}
    </div>
  );
}
