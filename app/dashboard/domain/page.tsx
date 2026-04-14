"use client";

import { useEffect, useState } from "react";
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
import type { Store } from "@/types/database";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function DomainPage() {
  const supabase = createClient();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  // Subdomain editing
  const [editingSubdomain, setEditingSubdomain] = useState(false);
  const [subdomainValue, setSubdomainValue] = useState("");
  const [subdomainError, setSubdomainError] = useState("");
  const [subdomainSaving, setSubdomainSaving] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);

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

      if (!storeData) {
        setLoading(false);
        return;
      }

      setStore(storeData as Store);
      setLoading(false);
    }
    init();
  }, [supabase]);

  async function checkSubdomainAvailability(value: string) {
    if (value.length < 3) {
      setSubdomainAvailable(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/subdomain/validate?subdomain=${encodeURIComponent(value)}&excludeStoreId=${store?.id || ""}`
      );
      const data = await res.json();
      setSubdomainAvailable(data.available);
      if (data.error) setSubdomainError(data.error);
      else setSubdomainError("");
    } catch {
      setSubdomainAvailable(null);
    }
  }

  async function handleSubdomainSave() {
    if (!store) return;
    setSubdomainError("");
    setSubdomainSaving(true);
    try {
      const res = await fetch("/api/dashboard/store/subdomain", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: subdomainValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubdomainError(data.error || "Failed to update");
        return;
      }
      setEditingSubdomain(false);
      setSubdomainAvailable(null);
      // Refresh store data
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("id", store.id)
        .single();
      if (storeData) setStore(storeData as Store);
    } catch {
      setSubdomainError("Network error");
    } finally {
      setSubdomainSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-2 h-9 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Domain Management
        </h1>
        <p className="text-muted-foreground">
          Manage your store&apos;s subdomain and view connected domains
        </p>
      </div>

      {/* Current Subdomain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Your Subdomain
          </CardTitle>
          <CardDescription>
            Your free subdomain provided by Pixeocommerce
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <p className="font-mono text-sm font-semibold">
                {store?.subdomain}.pixeocommerce.com
              </p>
              <p className="text-xs text-muted-foreground">
                This subdomain is always active and cannot be removed
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() =>
                window.open(
                  `/store/${store?.subdomain}`,
                  "_blank"
                )
              }
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          {/* Subdomain editing */}
          {editingSubdomain ? (
            <div className="space-y-3 rounded-lg border p-4">
              <Label htmlFor="subdomain-input">Change Subdomain</Label>
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center rounded-md border">
                  <Input
                    id="subdomain-input"
                    value={subdomainValue}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setSubdomainValue(val);
                      setSubdomainError("");
                      setSubdomainAvailable(null);
                    }}
                    onBlur={() => checkSubdomainAvailability(subdomainValue)}
                    className="border-0"
                    placeholder="my-store"
                  />
                  <span className="shrink-0 pr-3 text-sm text-muted-foreground">.pixeocommerce.com</span>
                </div>
              </div>
              {subdomainAvailable !== null && (
                <div className="flex items-center gap-1.5">
                  {subdomainAvailable ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs text-green-600">Available</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-xs text-destructive">{subdomainError || "Not available"}</span>
                    </>
                  )}
                </div>
              )}
              {subdomainError && subdomainAvailable === null && (
                <p className="text-xs text-destructive">{subdomainError}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubdomainSave} disabled={subdomainSaving || subdomainAvailable === false}>
                  {subdomainSaving ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingSubdomain(false); setSubdomainError(""); setSubdomainAvailable(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSubdomainValue(store?.subdomain || "");
                setEditingSubdomain(true);
              }}
            >
              Change Subdomain
            </Button>
          )}
        </CardContent>
      </Card>
      
      <p className="text-xs text-muted-foreground px-1">
        To add a custom domain (e.g. shop.yourbrand.com), please contact our support team. Only administrators can configure custom domains at this time.
      </p>
    </div>
  );
}
