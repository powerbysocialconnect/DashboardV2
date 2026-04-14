"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw } from "lucide-react";
import type {
  SectionSchemaDefinition,
  SectionFieldDefinition,
} from "@/lib/themes/sectionSchemas";
import type { MergedFieldMeta } from "@/lib/themes/mergeSectionData";
import { ImageFieldUploader } from "./ImageFieldUploader";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface SectionFieldEditorProps {
  storeId: string;
  sectionType: string;
  schema: SectionSchemaDefinition;
  /** Current merged values for display */
  values: Record<string, unknown>;
  /** Per-field metadata (source, isOverridden) */
  fieldMeta: Record<string, MergedFieldMeta>;
  /** The current store-specific overrides (sparse) */
  overrides: Record<string, unknown>;
  /** Validation errors keyed by field ID */
  errors: Record<string, string>;
  /** Called when a field value changes */
  onFieldChange: (fieldId: string, value: unknown) => void;
  /** Called to reset a single field to default */
  onFieldReset: (fieldId: string) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SectionFieldEditor({
  storeId,
  sectionType,
  schema,
  values,
  fieldMeta,
  overrides,
  errors,
  onFieldChange,
  onFieldReset,
}: SectionFieldEditorProps) {
  // Group fields by their `group` property
  const groups = schema.groups || {};
  const groupedFields: Record<string, SectionFieldDefinition[]> = {};
  const ungroupedFields: SectionFieldDefinition[] = [];

  for (const field of schema.fields) {
    if (field.group && groups[field.group]) {
      if (!groupedFields[field.group]) groupedFields[field.group] = [];
      groupedFields[field.group].push(field);
    } else {
      ungroupedFields.push(field);
    }
  }

  const renderField = (field: SectionFieldDefinition) => {
    const value = values[field.id];
    const meta = fieldMeta[field.id];
    const isOverridden = field.id in overrides;
    const error = errors[field.id];

    return (
      <div key={field.id} className="space-y-2">
        {/* Field header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label
              className="text-sm font-medium leading-none"
              htmlFor={`field-${sectionType}-${field.id}`}
            >
              {field.label}
              {field.required && (
                <span className="ml-0.5 text-destructive">*</span>
              )}
            </label>
            {isOverridden && (
              <Badge
                variant="outline"
                className="h-5 text-[9px] font-semibold uppercase tracking-wider bg-primary/5 text-primary border-primary/20"
              >
                Modified
              </Badge>
            )}
          </div>
          {isOverridden && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onFieldReset(field.id)}
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>

        {/* Field description */}
        {field.description && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {field.description}
          </p>
        )}

        {/* Field input */}
        {renderFieldInput(field, value)}

        {/* Character count for text fields */}
        {(field.type === "text" ||
          field.type === "textarea" ||
          field.type === "richtext") &&
          field.maxLength && (
            <p className="text-[10px] text-muted-foreground/50 text-right tabular-nums">
              {String(value || "").length} / {field.maxLength}
            </p>
          )}

        {/* Validation error */}
        {error && (
          <p className="text-xs font-medium text-destructive">{error}</p>
        )}
      </div>
    );
  };

  const renderFieldInput = (
    field: SectionFieldDefinition,
    value: unknown
  ) => {
    const inputId = `field-${sectionType}-${field.id}`;

    switch (field.type) {
      case "text":
        return (
          <Input
            id={inputId}
            value={String(value ?? "")}
            onChange={(e) => onFieldChange(field.id, e.target.value)}
            placeholder={
              field.default ? String(field.default) : `Enter ${field.label.toLowerCase()}...`
            }
            maxLength={field.maxLength}
          />
        );

      case "textarea":
      case "richtext":
        return (
          <Textarea
            id={inputId}
            value={String(value ?? "")}
            onChange={(e) => onFieldChange(field.id, e.target.value)}
            placeholder={
              field.default ? String(field.default) : `Enter ${field.label.toLowerCase()}...`
            }
            maxLength={field.maxLength}
            className="min-h-[100px] resize-y"
          />
        );

      case "image":
        return (
          <ImageFieldUploader
            storeId={storeId}
            sectionType={sectionType}
            fieldId={field.id}
            value={value as string | null | undefined}
            label={field.label}
            recommendedAspectRatio={field.recommendedAspectRatio}
            maxFileSizeMB={field.maxFileSizeMB}
            fileTypes={field.fileTypes}
            onChange={(url) => onFieldChange(field.id, url)}
          />
        );

      case "url":
        return (
          <Input
            id={inputId}
            type="url"
            value={String(value ?? "")}
            onChange={(e) => onFieldChange(field.id, e.target.value)}
            placeholder={field.default ? String(field.default) : "https://..."}
          />
        );

      case "boolean":
        return (
          <div className="flex items-center gap-3">
            <Switch
              id={inputId}
              checked={Boolean(value)}
              onCheckedChange={(checked) => onFieldChange(field.id, checked)}
            />
            <label
              htmlFor={inputId}
              className="text-sm text-muted-foreground cursor-pointer"
            >
              {value ? "Enabled" : "Disabled"}
            </label>
          </div>
        );

      case "select":
        return (
          <Select
            value={String(value ?? field.default ?? "")}
            onValueChange={(v) => onFieldChange(field.id, v)}
          >
            <SelectTrigger id={inputId}>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "color":
        return (
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                id={inputId}
                type="color"
                value={String(value ?? field.default ?? "#000000")}
                onChange={(e) => onFieldChange(field.id, e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-md border border-input p-1"
              />
            </div>
            <Input
              value={String(value ?? "")}
              onChange={(e) => onFieldChange(field.id, e.target.value)}
              placeholder="#000000"
              className="w-32 font-mono text-sm"
              maxLength={7}
            />
          </div>
        );

      case "number":
        return (
          <Input
            id={inputId}
            type="number"
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) => {
              const num = e.target.value === "" ? undefined : Number(e.target.value);
              onFieldChange(field.id, num);
            }}
            min={field.min}
            max={field.max}
            step={field.step}
            placeholder={field.default !== undefined ? String(field.default) : ""}
          />
        );

      default:
        return (
          <Input
            value={String(value ?? "")}
            onChange={(e) => onFieldChange(field.id, e.target.value)}
            placeholder={`Enter value...`}
          />
        );
    }
  };

  // ── Render grouped fields ──

  const groupKeys = Object.keys(groupedFields);

  return (
    <div className="space-y-6">
      {groupKeys.map((groupKey, idx) => (
        <div key={groupKey}>
          {idx > 0 && <Separator className="mb-6" />}
          <div className="space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              {groups[groupKey] || groupKey}
            </h4>
            <div className="space-y-5">
              {groupedFields[groupKey].map(renderField)}
            </div>
          </div>
        </div>
      ))}

      {/* Ungrouped fields */}
      {ungroupedFields.length > 0 && (
        <div>
          {groupKeys.length > 0 && <Separator className="mb-6" />}
          <div className="space-y-5">
            {ungroupedFields.map(renderField)}
          </div>
        </div>
      )}
    </div>
  );
}
