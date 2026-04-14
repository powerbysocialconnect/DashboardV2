"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StoreProvisioningJob, ProvisioningJobStatus } from "@/types/database";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const STATUS_OPTIONS: { value: ProvisioningJobStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusVariant: Record<ProvisioningJobStatus, "default" | "secondary" | "destructive" | "outline"> = {
  queued: "outline",
  running: "secondary",
  completed: "default",
  failed: "destructive",
  cancelled: "destructive",
};

export default function ProvisioningJobsPage() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<StoreProvisioningJob[]>([]);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ProvisioningJobStatus | "all">("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<StoreProvisioningJob | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("store_provisioning_jobs")
          .select("*")
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setJobs(data || []);

        const storeIds = Array.from(
          new Set((data || []).map((j: StoreProvisioningJob) => j.store_id))
        );
        if (storeIds.length > 0) {
          const { data: stores } = await supabase
            .from("stores")
            .select("id, name")
            .in("id", storeIds);

          const map: Record<string, string> = {};
          (stores || []).forEach((s: { id: string; name: string }) => {
            map[s.id] = s.name;
          });
          setStoreNames(map);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load provisioning jobs");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return jobs;
    return jobs.filter((j) => j.status === statusFilter);
  }, [jobs, statusFilter]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleRetry(job: StoreProvisioningJob) {
    setRetrying(job.id);
    try {
      const { data, error: insertError } = await supabase
        .from("store_provisioning_jobs")
        .insert({
          store_id: job.store_id,
          job_type: job.job_type,
          status: "queued",
          payload: job.payload,
          result: {},
          attempts: 0,
        })
        .select("*")
        .single();

      if (insertError) throw insertError;
      if (data) setJobs((prev) => [data, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to retry job");
    } finally {
      setRetrying(null);
    }
  }

  function openDetail(job: StoreProvisioningJob) {
    setSelectedJob(job);
    setDetailDialogOpen(true);
  }

  function formatDuration(start: string | null, end: string | null): string {
    if (!start) return "—";
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs < 1000) return `${diffMs}ms`;
    if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s`;
    return `${Math.round(diffMs / 60000)}m`;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-44" />
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

  const failedCount = jobs.filter((j) => j.status === "failed").length;
  const runningCount = jobs.filter((j) => j.status === "running").length;
  const queuedCount = jobs.filter((j) => j.status === "queued").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Provisioning Jobs</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage store provisioning jobs
        </p>
      </div>

      {/* Quick Stats */}
      <div className="flex flex-wrap gap-4">
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Queued</p>
          <p className="text-2xl font-bold">{queuedCount}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Running</p>
          <p className="text-2xl font-bold">{runningCount}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="text-2xl font-bold text-destructive">{failedCount}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{jobs.length}</p>
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="w-48">
          <label className="mb-1.5 block text-sm font-medium">Status</label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ProvisioningJobStatus | "all")}
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
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Store Name</TableHead>
              <TableHead>Job Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No provisioning jobs found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((job) => (
                <Collapsible key={job.id} asChild open={expandedIds.has(job.id)}>
                  <>
                    <TableRow className="group">
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <button
                            onClick={() => toggleExpand(job.id)}
                            className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
                          >
                            <svg
                              className={`h-4 w-4 transition-transform ${
                                expandedIds.has(job.id) ? "rotate-90" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell className="font-medium">
                        {storeNames[job.store_id] || job.store_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>{job.job_type || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[job.status]}>{job.status}</Badge>
                      </TableCell>
                      <TableCell>{job.attempts}</TableCell>
                      <TableCell>
                        {new Date(job.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {formatDuration(job.started_at, job.completed_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetail(job)}
                          >
                            Details
                          </Button>
                          {job.status === "failed" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleRetry(job)}
                              disabled={retrying === job.id}
                            >
                              {retrying === job.id ? "Retrying..." : "Retry"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    <CollapsibleContent asChild>
                      <tr>
                        <td colSpan={8} className="bg-muted/30 px-8 py-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            {job.error_message && (
                              <div className="md:col-span-2">
                                <p className="text-sm font-medium text-destructive mb-1">
                                  Error Message
                                </p>
                                <pre className="rounded-md bg-destructive/10 p-3 text-sm text-destructive whitespace-pre-wrap break-words">
                                  {job.error_message}
                                </pre>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">
                                Payload
                              </p>
                              <pre className="rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words max-h-40 overflow-auto">
                                {JSON.stringify(job.payload, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">
                                Result
                              </p>
                              <pre className="rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words max-h-40 overflow-auto">
                                {JSON.stringify(job.result, null, 2)}
                              </pre>
                            </div>
                            <div className="md:col-span-2 flex gap-6 text-sm text-muted-foreground">
                              <span>
                                Started:{" "}
                                {job.started_at
                                  ? new Date(job.started_at).toLocaleString()
                                  : "—"}
                              </span>
                              <span>
                                Completed:{" "}
                                {job.completed_at
                                  ? new Date(job.completed_at).toLocaleString()
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {jobs.length} jobs
      </p>

      {/* Job Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>
              {selectedJob?.job_type || "Provisioning Job"} &mdash;{" "}
              {selectedJob && storeNames[selectedJob.store_id]}
            </DialogDescription>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Status:</span>{" "}
                  <Badge variant={statusVariant[selectedJob.status]}>
                    {selectedJob.status}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Attempts:</span>{" "}
                  {selectedJob.attempts}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Duration:</span>{" "}
                  {formatDuration(selectedJob.started_at, selectedJob.completed_at)}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>
                  Created: {new Date(selectedJob.created_at).toLocaleString()}
                </span>
                <span>
                  Started:{" "}
                  {selectedJob.started_at
                    ? new Date(selectedJob.started_at).toLocaleString()
                    : "—"}
                </span>
                <span>
                  Completed:{" "}
                  {selectedJob.completed_at
                    ? new Date(selectedJob.completed_at).toLocaleString()
                    : "—"}
                </span>
              </div>

              {selectedJob.error_message && (
                <div>
                  <p className="text-sm font-medium text-destructive mb-1">
                    Error Message
                  </p>
                  <pre className="rounded-md bg-destructive/10 p-3 text-sm text-destructive whitespace-pre-wrap break-words">
                    {selectedJob.error_message}
                  </pre>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Payload</p>
                <pre className="rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words max-h-52 overflow-auto">
                  {JSON.stringify(selectedJob.payload, null, 2)}
                </pre>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Result</p>
                <pre className="rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words max-h-52 overflow-auto">
                  {JSON.stringify(selectedJob.result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
            {selectedJob?.status === "failed" && (
              <Button
                onClick={() => {
                  if (selectedJob) handleRetry(selectedJob);
                  setDetailDialogOpen(false);
                }}
              >
                Retry Job
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
