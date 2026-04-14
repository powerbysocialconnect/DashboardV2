"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type {
  VisionForm,
  VisionFormStatus,
  Profile,
  Store,
} from "@/types/database";
import { generateStoreConfigFromVision } from "@/lib/stores/generateStoreConfigFromVision";
import { createDefaultOnboardingTasks } from "@/lib/stores/onboarding";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const STATUSES: VisionFormStatus[] = [
  "new",
  "assigned",
  "building",
  "ready_for_review",
  "launched",
  "archived",
];

const statusVariant: Record<VisionFormStatus, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  assigned: "secondary",
  building: "outline",
  ready_for_review: "default",
  launched: "secondary",
  archived: "destructive",
};

export default function VisionFormDetailPage() {
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [form, setForm] = useState<VisionForm | null>(null);
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [associatedStore, setAssociatedStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [assignUpdating, setAssignUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: visionData, error: visionError } = await supabase
        .from("vision_forms")
        .select("*")
        .eq("id", params.id)
        .single();

      if (visionError) throw visionError;
      setForm(visionData);

      const { data: adminData } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_admin", true)
        .order("full_name");

      setAdmins(adminData || []);

      if (visionData?.user_id) {
        const { data: storeData } = await supabase
          .from("stores")
          .select("*")
          .eq("owner_id", visionData.user_id)
          .limit(1)
          .maybeSingle();

        setAssociatedStore(storeData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vision form");
    } finally {
      setLoading(false);
    }
  }, [supabase, params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleStatusChange(newStatus: VisionFormStatus) {
    if (!form) return;
    setStatusUpdating(true);
    try {
      // 1. Update the vision form status
      const { error: updateError } = await supabase
        .from("vision_forms")
        .update({ status: newStatus })
        .eq("id", form.id);

      if (updateError) throw updateError;

      // 2. If launching, sync with the associated store
      if (newStatus === "launched" && associatedStore) {
        const { error: storeUpdateError } = await supabase
          .from("stores")
          .update({ 
            status: "live",
            published_at: new Date().toISOString() 
          })
          .eq("id", associatedStore.id);
        
        if (storeUpdateError) throw storeUpdateError;
        
        // Update local state for store
        setAssociatedStore({
          ...associatedStore,
          status: "live",
          published_at: new Date().toISOString()
        });
      }

      setForm({ ...form, status: newStatus });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleAssign(adminId: string) {
    if (!form) return;
    setAssignUpdating(true);
    try {
      const { error: updateError } = await supabase
        .from("vision_forms")
        .update({ assigned_to: adminId, status: form.status === "new" ? "assigned" : form.status })
        .eq("id", form.id);

      if (updateError) throw updateError;
      setForm({
        ...form,
        assigned_to: adminId,
        status: form.status === "new" ? "assigned" : form.status,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setAssignUpdating(false);
    }
  }

  async function handleGenerate() {
    if (!form) return;
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { storeId } = await generateStoreConfigFromVision(
        supabase,
        form.id,
        user.id
      );

      await createDefaultOnboardingTasks(supabase, storeId, form.assigned_to || undefined);

      setGenerateDialogOpen(false);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate store setup");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveNotes() {
    if (!form) return;
    setSavingNotes(true);
    try {
      await supabase.from("store_admin_actions").insert({
        store_id: associatedStore?.id || form.id,
        action: "vision_form_note",
        details: { note: notes, vision_form_id: form.id },
        performed_by: (await supabase.auth.getUser()).data.user?.id || "",
      });
      setNotes("");
    } catch {
      alert("Failed to save note");
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-80" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-destructive text-lg">{error || "Vision form not found"}</p>
        <Button asChild variant="outline">
          <Link href="/admin/vision-forms">Back to Queue</Link>
        </Button>
      </div>
    );
  }

  const socialLinks = form.social_links || {};
  const inspirationUrls = form.inspiration_urls || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{form.brand_name}</h1>
            <Badge variant={statusVariant[form.status]}>
              {form.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Submitted {new Date(form.created_at).toLocaleDateString()} &middot;{" "}
            {form.subdomain ? `${form.subdomain}.pixeocommerce.com` : "No subdomain set"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/vision-forms">Back to Queue</Link>
          </Button>
          {associatedStore && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/stores/${associatedStore.id}`}>
                View Store
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Status & Assignment Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Status</label>
              <Select
                value={form.status}
                onValueChange={(v) => handleStatusChange(v as VisionFormStatus)}
                disabled={statusUpdating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Assign To</label>
              <Select
                value={form.assigned_to || "unassigned"}
                onValueChange={(v) => handleAssign(v)}
                disabled={assignUpdating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.full_name || admin.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">Generate Store Setup</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Store Setup</DialogTitle>
                  <DialogDescription>
                    This will create a store (or update the existing one) with theme configuration
                    based on this vision form, and create default onboarding tasks. The vision form
                    status will be set to &quot;building&quot;.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setGenerateDialogOpen(false)}
                    disabled={generating}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleGenerate} disabled={generating}>
                    {generating ? "Generating..." : "Confirm & Generate"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Brand & Business Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Brand Information</CardTitle>
            <CardDescription>Details provided in the vision form</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoField label="Brand Name" value={form.brand_name} />
              <InfoField label="Subdomain" value={form.subdomain} />
              <InfoField label="Brand Style" value={form.brand_style} />
              <InfoField label="Business Category" value={form.business_category} />
              <InfoField label="Website Category" value={form.website_category} />
              <InfoField label="Plan" value={form.plan} />
            </div>

            {form.business_description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Business Description
                </p>
                <p className="text-sm leading-relaxed">{form.business_description}</p>
              </div>
            )}

            {form.website_details && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Website Details
                </p>
                <p className="text-sm leading-relaxed">{form.website_details}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Logo</CardTitle>
          </CardHeader>
          <CardContent>
            {form.logo_url ? (
              <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-6">
                <img
                  src={form.logo_url}
                  alt={`${form.brand_name} logo`}
                  className="max-h-40 max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/30">
                <p className="text-sm text-muted-foreground">No logo uploaded</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Social & Inspiration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Links & Inspiration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(socialLinks).length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Social Links</p>
                <div className="space-y-1">
                  {Object.entries(socialLinks).map(([platform, url]) => (
                    <div key={platform} className="flex items-center gap-2 text-sm">
                      <span className="capitalize font-medium w-24">{platform}</span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inspirationUrls.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Inspiration URLs
                </p>
                <ul className="space-y-1">
                  {inspirationUrls.map((url, i) => (
                    <li key={i}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate block"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Object.keys(socialLinks).length === 0 && inspirationUrls.length === 0 && (
              <p className="text-sm text-muted-foreground">No links provided</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Admin Notes</CardTitle>
          <CardDescription>Add internal notes about this vision form</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Add a note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveNotes}
              disabled={!notes.trim() || savingNotes}
            >
              {savingNotes ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm mt-0.5">{value || "—"}</p>
    </div>
  );
}
