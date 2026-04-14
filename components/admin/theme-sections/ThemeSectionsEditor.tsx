"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Save,
  CheckCircle2,
  RefreshCw,
  LayoutTemplate,
  ShoppingBag,
  Grid3X3,
  ImageIcon,
  Quote,
  Mail,
  Type,
  Megaphone,
  Bell,
  AlertCircle,
} from "lucide-react";
import type { HomepageSection, StoreSectionOverride } from "@/types/database";
import {
  SECTION_SCHEMA_REGISTRY,
  getSectionSchema,
  validateSectionOverrides,
  type SectionSchemaDefinition,
} from "@/lib/themes/sectionSchemas";
import {
  mergeSectionData,
  type MergedSectionData,
} from "@/lib/themes/mergeSectionData";
import { SectionFieldEditor } from "./SectionFieldEditor";

// ─── Icon Map ──────────────────────────────────────────────────────────────────

const SECTION_ICON_MAP: Record<string, React.ReactNode> = {
  hero: <LayoutTemplate className="h-4 w-4" />,
  featured_products: <ShoppingBag className="h-4 w-4" />,
  category_grid: <Grid3X3 className="h-4 w-4" />,
  image_with_text: <ImageIcon className="h-4 w-4" />,
  testimonials: <Quote className="h-4 w-4" />,
  newsletter: <Mail className="h-4 w-4" />,
  rich_text: <Type className="h-4 w-4" />,
  promotional_banner: <Megaphone className="h-4 w-4" />,
  announcement_bar: <Bell className="h-4 w-4" />,
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ThemeSectionsEditorProps {
  storeId: string;
  homepageLayout: HomepageSection[];
  themeCode: string;
}

// ─── Per-Section State ─────────────────────────────────────────────────────────

interface SectionEditorState {
  /** The sparse overrides the user is editing */
  overrides: Record<string, unknown>;
  /** Whether the section is enabled */
  isEnabled: boolean;
  /** The merged data for display */
  merged: MergedSectionData;
  /** Whether this section has unsaved changes */
  isDirty: boolean;
  /** Whether this section is currently saving */
  isSaving: boolean;
  /** Success message */
  saveSuccess: boolean;
  /** Validation errors */
  errors: Record<string, string>;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ThemeSectionsEditor({
  storeId,
  homepageLayout,
  themeCode,
}: ThemeSectionsEditorProps) {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [sectionStates, setSectionStates] = useState<
    Record<string, SectionEditorState>
  >({});

  // Build section keys for indexing
  const buildSectionKey = (type: string, index: number) =>
    `${type}:${index}`;

  // ── Fetch existing overrides ──

  const fetchOverrides = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(
        `/api/admin/stores/${storeId}/section-overrides`
      );
      if (!res.ok) throw new Error("Failed to fetch section overrides");
      const data = await res.json();
      const overrides: StoreSectionOverride[] = data.overrides || [];

      // Build override lookup
      const overrideMap = new Map<string, StoreSectionOverride>();
      for (const o of overrides) {
        overrideMap.set(
          buildSectionKey(o.section_type, o.section_index),
          o
        );
      }

      // Initialize state for each section in homepage_layout
      const typeCounters: Record<string, number> = {};
      const newStates: Record<string, SectionEditorState> = {};

      for (const section of homepageLayout) {
        const sectionType = section.type;
        const idx = typeCounters[sectionType] || 0;
        typeCounters[sectionType] = idx + 1;

        const key = buildSectionKey(sectionType, idx);
        const override = overrideMap.get(key) || null;
        const merged = mergeSectionData(section, override);

        newStates[key] = {
          overrides: override
            ? { ...(override.overrides as Record<string, unknown>) }
            : {},
          isEnabled: override ? override.is_enabled : true,
          merged,
          isDirty: false,
          isSaving: false,
          saveSuccess: false,
          errors: {},
        };
      }

      setSectionStates(newStates);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to load overrides"
      );
    } finally {
      setLoading(false);
    }
  }, [storeId, homepageLayout]);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  // ── Handlers ──

  const handleFieldChange = (
    sectionKey: string,
    section: HomepageSection,
    fieldId: string,
    value: unknown
  ) => {
    setSectionStates((prev) => {
      const state = prev[sectionKey];
      if (!state) return prev;

      const newOverrides = { ...state.overrides };

      // If value is null/undefined/empty string, remove the override (revert to default)
      if (value === null || value === undefined || value === "") {
        delete newOverrides[fieldId];
      } else {
        newOverrides[fieldId] = value;
      }

      // Re-compute merged data
      const fakeOverride: StoreSectionOverride = {
        id: "",
        store_id: storeId,
        theme_code: themeCode,
        section_type: section.type,
        section_index: 0,
        section_instance_id: null,
        overrides: newOverrides,
        is_enabled: state.isEnabled,
        sort_order: null,
        is_draft: false,
        created_at: "",
        updated_at: "",
      };

      const merged = mergeSectionData(section, fakeOverride);

      return {
        ...prev,
        [sectionKey]: {
          ...state,
          overrides: newOverrides,
          merged,
          isDirty: true,
          saveSuccess: false,
        },
      };
    });
  };

  const handleFieldReset = (
    sectionKey: string,
    section: HomepageSection,
    fieldId: string
  ) => {
    handleFieldChange(sectionKey, section, fieldId, null);
  };

  const handleToggleEnabled = (
    sectionKey: string,
    section: HomepageSection,
    isEnabled: boolean
  ) => {
    setSectionStates((prev) => {
      const state = prev[sectionKey];
      if (!state) return prev;

      const fakeOverride: StoreSectionOverride = {
        id: "",
        store_id: storeId,
        theme_code: themeCode,
        section_type: section.type,
        section_index: 0,
        section_instance_id: null,
        overrides: state.overrides,
        is_enabled: isEnabled,
        sort_order: null,
        is_draft: false,
        created_at: "",
        updated_at: "",
      };

      const merged = mergeSectionData(section, fakeOverride);

      return {
        ...prev,
        [sectionKey]: {
          ...state,
          isEnabled,
          merged,
          isDirty: true,
          saveSuccess: false,
        },
      };
    });
  };

  const handleSave = async (
    sectionKey: string,
    sectionType: string,
    sectionIndex: number
  ) => {
    const state = sectionStates[sectionKey];
    if (!state) return;

    // Validate
    const schema = getSectionSchema(sectionType);
    if (schema) {
      const validationErrors = validateSectionOverrides(schema, state.overrides);
      if (Object.keys(validationErrors).length > 0) {
        setSectionStates((prev) => ({
          ...prev,
          [sectionKey]: {
            ...prev[sectionKey],
            errors: validationErrors,
          },
        }));
        return;
      }
    }

    setSectionStates((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        isSaving: true,
        errors: {},
        saveSuccess: false,
      },
    }));

    try {
      const res = await fetch(
        `/api/admin/stores/${storeId}/section-overrides`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionType,
            sectionIndex,
            overrides: state.overrides,
            isEnabled: state.isEnabled,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }

      setSectionStates((prev) => ({
        ...prev,
        [sectionKey]: {
          ...prev[sectionKey],
          isDirty: false,
          isSaving: false,
          saveSuccess: true,
        },
      }));

      // Clear success after 3s
      setTimeout(() => {
        setSectionStates((prev) => ({
          ...prev,
          [sectionKey]: {
            ...prev[sectionKey],
            saveSuccess: false,
          },
        }));
      }, 3000);
    } catch (err) {
      console.error("Save section override failed:", err);
      setSectionStates((prev) => ({
        ...prev,
        [sectionKey]: {
          ...prev[sectionKey],
          isSaving: false,
          errors: {
            _save:
              err instanceof Error ? err.message : "Failed to save changes",
          },
        },
      }));
    }
  };

  const handleRevertSection = async (
    sectionKey: string,
    section: HomepageSection,
    sectionType: string,
    sectionIndex: number
  ) => {
    try {
      const res = await fetch(
        `/api/admin/stores/${storeId}/section-overrides`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionType, sectionIndex }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Revert failed");
      }

      // Reset local state
      const merged = mergeSectionData(section, null);
      setSectionStates((prev) => ({
        ...prev,
        [sectionKey]: {
          overrides: {},
          isEnabled: true,
          merged,
          isDirty: false,
          isSaving: false,
          saveSuccess: false,
          errors: {},
        },
      }));
    } catch (err) {
      console.error("Revert section failed:", err);
    }
  };

  const toggleExpanded = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Loading State ──

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (fetchError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{fetchError}</p>
          <Button variant="outline" size="sm" onClick={fetchOverrides}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (homepageLayout.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <LayoutTemplate className="mb-4 h-10 w-10 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold">No Sections Found</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            This store&apos;s theme doesn&apos;t have any homepage sections
            configured yet. Add sections via the Theme tab first.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Render Sections ──

  const typeCounters: Record<string, number> = {};

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="flex items-start gap-3 py-4">
          <div className="rounded-full bg-primary/10 p-2 mt-0.5">
            <LayoutTemplate className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">
              Store-Specific Section Content
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Customize the content and media for each section on this
              store&apos;s homepage. Changes here override the theme defaults
              for this store only. The theme structure and section order remain
              shared.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section Cards */}
      {homepageLayout.map((section) => {
        const sectionType = section.type;
        const idx = typeCounters[sectionType] || 0;
        typeCounters[sectionType] = idx + 1;

        const key = buildSectionKey(sectionType, idx);
        const state = sectionStates[key];
        const schema = getSectionSchema(sectionType);
        const isExpanded = expandedSections.has(key);

        if (!state || !schema) {
          // No schema registered for this section type — show as read-only
          return (
            <Card key={key} className="opacity-60">
              <CardHeader className="py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-muted p-2">
                    {SECTION_ICON_MAP[sectionType] || (
                      <LayoutTemplate className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-sm capitalize">
                      {sectionType.replace(/_/g, " ")}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      No editable schema registered for this section type
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        }

        const hasOverrides =
          Object.keys(state.overrides).length > 0 || !state.isEnabled;

        return (
          <Card
            key={key}
            className={`transition-shadow ${
              state.isDirty ? "ring-1 ring-primary/30" : ""
            } ${!state.isEnabled ? "opacity-70" : ""}`}
          >
            {/* Section Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => toggleExpanded(key)}
            >
              <div className="rounded-md bg-muted p-2">
                {SECTION_ICON_MAP[sectionType] || (
                  <LayoutTemplate className="h-4 w-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{schema.label}</h3>
                  {hasOverrides && (
                    <Badge
                      variant="outline"
                      className="h-5 text-[9px] font-semibold uppercase tracking-wider bg-primary/5 text-primary border-primary/20"
                    >
                      Customized
                    </Badge>
                  )}
                  {state.isDirty && (
                    <Badge
                      variant="outline"
                      className="h-5 text-[9px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-600 border-amber-500/20"
                    >
                      Unsaved
                    </Badge>
                  )}
                  {state.saveSuccess && (
                    <Badge
                      variant="outline"
                      className="h-5 text-[9px] font-semibold uppercase tracking-wider bg-green-500/10 text-green-600 border-green-500/20"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Saved
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {schema.description}
                </p>
              </div>

              {/* Enable/Disable Toggle */}
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {state.isEnabled ? "Visible" : "Hidden"}
                </span>
                <Switch
                  checked={state.isEnabled}
                  onCheckedChange={(checked) =>
                    handleToggleEnabled(key, section, checked)
                  }
                />
              </div>

              {/* Expand/Collapse Arrow */}
              <div className="text-muted-foreground">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>

            {/* Expanded Editor */}
            {isExpanded && (
              <>
                <Separator />
                <CardContent className="pt-6 pb-4 space-y-6">
                  {/* Field Editor */}
                  <SectionFieldEditor
                    storeId={storeId}
                    sectionType={sectionType}
                    schema={schema}
                    values={state.merged.data}
                    fieldMeta={state.merged.fieldMeta}
                    overrides={state.overrides}
                    errors={state.errors}
                    onFieldChange={(fieldId, value) =>
                      handleFieldChange(key, section, fieldId, value)
                    }
                    onFieldReset={(fieldId) =>
                      handleFieldReset(key, section, fieldId)
                    }
                  />

                  {/* Save error */}
                  {state.errors._save && (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-sm">{state.errors._save}</p>
                    </div>
                  )}

                  {/* Action Bar */}
                  <Separator />
                  <div className="flex items-center justify-between">
                    {/* Revert Section */}
                    {hasOverrides && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-muted-foreground hover:text-destructive"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Revert All to Defaults
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Revert {schema.label}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove all store-specific customizations
                              for this section and revert to the theme defaults.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleRevertSection(key, section, sectionType, idx)
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revert to Defaults
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {!hasOverrides && <div />}

                    {/* Save Button */}
                    <Button
                      type="button"
                      onClick={() => handleSave(key, sectionType, idx)}
                      disabled={!state.isDirty || state.isSaving}
                      className="gap-1.5"
                    >
                      {state.isSaving ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}
