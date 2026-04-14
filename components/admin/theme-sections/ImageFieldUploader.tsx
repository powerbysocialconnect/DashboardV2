"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, RefreshCw } from "lucide-react";

interface ImageFieldUploaderProps {
  storeId: string;
  sectionType: string;
  fieldId: string;
  value: string | null | undefined;
  label: string;
  recommendedAspectRatio?: string;
  maxFileSizeMB?: number;
  fileTypes?: string[];
  onChange: (url: string | null) => void;
}

export function ImageFieldUploader({
  storeId,
  sectionType,
  fieldId,
  value,
  label,
  recommendedAspectRatio,
  maxFileSizeMB = 5,
  fileTypes = ["image/jpeg", "image/png", "image/webp"],
  onChange,
}: ImageFieldUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Client-side validation
      if (!fileTypes.includes(file.type)) {
        setError(
          `Invalid file type. Accepted: ${fileTypes
            .map((t) => t.replace("image/", "").toUpperCase())
            .join(", ")}`
        );
        return;
      }

      const maxBytes = maxFileSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`File too large. Maximum ${maxFileSizeMB}MB.`);
        return;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sectionType", sectionType);
        formData.append("fieldId", fieldId);

        const res = await fetch(
          `/api/admin/stores/${storeId}/section-overrides/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        const data = await res.json();
        onChange(data.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [storeId, sectionType, fieldId, fileTypes, maxFileSizeMB, onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptStr = fileTypes.join(",");

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        onChange={handleInputChange}
        className="hidden"
        id={`img-upload-${fieldId}`}
      />

      {value ? (
        /* ── Has Image ── */
        <div className="space-y-3">
          <div className="relative group overflow-hidden rounded-lg border bg-muted/20">
            <img
              src={value}
              alt={label}
              className="w-full h-auto max-h-[280px] object-contain"
            />
            {/* Overlay controls */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="shadow-lg"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                disabled={uploading}
                className="shadow-lg"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Drop Zone ── */
        <div
          className={`
            relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed 
            px-4 py-10 text-center transition-colors cursor-pointer
            ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/20 hover:border-muted-foreground/40 bg-muted/10"
            }
            ${uploading ? "pointer-events-none opacity-60" : ""}
          `}
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {uploading ? (
            <>
              <RefreshCw className="h-8 w-8 text-muted-foreground/40 animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <div className="rounded-full bg-muted/40 p-3">
                <Upload className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Drop image here or click to upload
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  {fileTypes
                    .map((t) => t.replace("image/", "").toUpperCase())
                    .join(", ")}{" "}
                  · Max {maxFileSizeMB}MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Aspect ratio hint */}
      {recommendedAspectRatio && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
          <ImageIcon className="h-3 w-3" />
          Recommended: {recommendedAspectRatio} aspect ratio
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
