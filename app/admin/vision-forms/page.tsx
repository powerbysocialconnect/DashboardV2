"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { VisionForm, VisionFormStatus } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_OPTIONS: { value: VisionFormStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "assigned", label: "Assigned" },
  { value: "building", label: "Building" },
  { value: "ready_for_review", label: "Ready for Review" },
  { value: "launched", label: "Launched" },
  { value: "archived", label: "Archived" },
];

const PLAN_OPTIONS = [
  { value: "all", label: "All Plans" },
  { value: "starter", label: "Starter" },
  { value: "premium", label: "Premium" },
  { value: "pro", label: "Pro" },
  { value: "store", label: "Store" },
  { value: "maintenance", label: "Maintenance" },
];

const statusVariant: Record<VisionFormStatus, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  assigned: "secondary",
  building: "outline",
  ready_for_review: "default",
  launched: "secondary",
  archived: "destructive",
};

export default function VisionFormsQueuePage() {
  const supabase = createClient();
  const [forms, setForms] = useState<VisionForm[]>([]);
  const [assigneeMap, setAssigneeMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VisionFormStatus | "all">("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("vision_forms")
          .select("*")
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setForms(data || []);

        const assignedIds = [
          ...new Set(
            (data || [])
              .map((f: VisionForm) => f.assigned_to)
              .filter(Boolean) as string[]
          ),
        ];

        if (assignedIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", assignedIds);

          const map: Record<string, string> = {};
          (profiles || []).forEach((p: { id: string; full_name: string | null; email: string }) => {
            map[p.id] = p.full_name || p.email;
          });
          setAssigneeMap(map);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load vision forms");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const filtered = useMemo(() => {
    return forms.filter((f) => {
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (planFilter !== "all" && f.plan !== planFilter) return false;
      if (search && !f.brand_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateFrom && f.created_at < dateFrom) return false;
      if (dateTo && f.created_at > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [forms, statusFilter, planFilter, search, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vision Forms Queue</h1>
        <p className="text-muted-foreground mt-1">
          Manage and review submitted vision forms
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <label className="mb-1.5 block text-sm font-medium">Search</label>
          <Input
            placeholder="Search by brand name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-44">
          <label className="mb-1.5 block text-sm font-medium">Status</label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as VisionFormStatus | "all")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <label className="mb-1.5 block text-sm font-medium">Plan</label>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <label className="mb-1.5 block text-sm font-medium">From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="w-40">
          <label className="mb-1.5 block text-sm font-medium">To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        {(search || statusFilter !== "all" || planFilter !== "all" || dateFrom || dateTo) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setPlanFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand Name</TableHead>
              <TableHead>Subdomain</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No vision forms found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((form) => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium">{form.brand_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {form.subdomain || "—"}
                  </TableCell>
                  <TableCell className="capitalize">{form.plan || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[form.status]}>
                      {form.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(form.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {form.assigned_to
                      ? assigneeMap[form.assigned_to] || "Unknown"
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/vision-forms/${form.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {forms.length} vision forms
      </p>
    </div>
  );
}
