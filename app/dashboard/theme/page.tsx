"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Palette, CheckCircle2, Info } from "lucide-react";
import type { Store, StoreThemeConfig } from "@/types/database";
import { getAllThemes } from "@/lib/themes/registry";
import type { ThemeDefinition } from "@/lib/themes/types";

export default function ThemePage() {
  const supabase = createClient();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeThemeCode, setActiveThemeCode] = useState<string | null>(null);

  const allThemes = getAllThemes();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!storeData) { setLoading(false); return; }
      setStore(storeData as Store);

      const { data: config } = await supabase
        .from("store_theme_configs")
        .select("theme_code")
        .eq("store_id", storeData.id)
        .maybeSingle();

      if (config) setActiveThemeCode((config as StoreThemeConfig).theme_code);
      setLoading(false);
    }
    init();
  }, [supabase]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="mb-2 h-9 w-48" />
        <Skeleton className="h-5 w-72" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Theme & Design</h1>
        <p className="text-muted-foreground">
          View your store&apos;s active theme and available themes
        </p>
      </div>

      {/* Info banner */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Theme changes are managed by the PixeoCommerce team
            </p>
            <p className="text-xs text-blue-700/80 mt-0.5">
              To request a theme change or customization, contact our support team.
              We&apos;ll configure your store&apos;s look and feel to match your brand.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Theme grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Available Themes</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allThemes.map((theme: ThemeDefinition) => {
            const isActive = activeThemeCode === theme.code;
            return (
              <Card
                key={theme.code}
                className={`transition-all ${
                  isActive
                    ? "ring-2 ring-primary shadow-md"
                    : "opacity-80 hover:opacity-100"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      {theme.name}
                    </CardTitle>
                    {isActive ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Lock className="mr-1 h-3 w-3" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    {theme.description || "A professional PixeoCommerce theme."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Version</span>
                      <span className="font-mono">{theme.version}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Sections</span>
                      <span>{theme.editableSections.length}</span>
                    </div>
                    {theme.minPlan && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Requires</span>
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {theme.minPlan}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Current theme detail */}
      {activeThemeCode && (() => {
        const activeDef = allThemes.find((t) => t.code === activeThemeCode);
        if (!activeDef) return null;
        return (
          <>
            <div>
              <h2 className="mb-4 text-lg font-semibold">
                Your Theme: {activeDef.name}
              </h2>
              <Card>
                <CardContent className="py-6">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {activeDef.description}
                    </p>
                    {activeDef.editableTokens && activeDef.editableTokens.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2">Design Tokens</p>
                        <div className="flex flex-wrap gap-2">
                          {activeDef.editableTokens.map((t) => (
                            <Badge key={t.key} variant="outline" className="text-[10px]">
                              {t.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium mb-2">Editable Sections</p>
                      <div className="flex flex-wrap gap-2">
                        {activeDef.editableSections.map((s) => (
                          <Badge key={s.id} variant="outline" className="text-[10px]">
                            {s.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        );
      })()}
    </div>
  );
}
