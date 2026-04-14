"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X, UploadCloud } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  onRemove: (url: string) => void;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const { url } = await response.json();

      onChange([...value, url]);
      toast.success("Image uploaded");
    } catch (error: any) {
      toast.error(error.message || "Error uploading image");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {value.map((url) => (
          <div
            key={url}
            className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
          >
            <Image
              fill
              src={url}
              alt="Product Image"
              className="object-cover"
            />
            <button
              onClick={() => onRemove(url)}
              type="button"
              className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-white shadow-sm transition-transform hover:scale-110"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        
        <label
          className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:bg-muted ${
            disabled || isUploading ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="sr-only"
            disabled={disabled || isUploading}
          />
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <UploadCloud className="mb-2 h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Upload
              </span>
            </>
          )}
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Accepted formats: PNG, JPG, WEBP. Max size: 5MB.
      </p>
    </div>
  );
}
