"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import type {
  ThemeFieldDefinition,
  ThemeTokenDefinition,
  ThemeSectionDefinition,
} from "@/lib/themes/types";

/**
 * Renders a single field based on its schema definition.
 */
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ThemeFieldDefinition | ThemeTokenDefinition;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const fieldType = field.type;
  const placeholder =
    "placeholder" in field ? (field as ThemeFieldDefinition).placeholder : undefined;

  switch (fieldType) {
    case "text":
    case "font":
      return (
        <Input
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      );

    case "textarea":
    case "richtext":
      return (
        <Textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      );

    case "url":
    case "image":
      return (
        <Input
          type="url"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || (fieldType === "image" ? "https://… or /uploads/…" : "https://…")}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={value !== undefined && value !== null ? String(value) : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          placeholder={placeholder}
          min={"min" in field ? (field as ThemeFieldDefinition).min : undefined}
          max={"max" in field ? (field as ThemeFieldDefinition).max : undefined}
          step={"step" in field ? (field as ThemeFieldDefinition).step : undefined}
        />
      );

    case "color":
      return (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={String(value ?? "#000000")}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border p-0.5"
          />
          <Input
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1 font-mono text-xs"
          />
        </div>
      );

    case "boolean":
      return (
        <Switch
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked)}
        />
      );

    case "select": {
      const opts = "options" in field ? (field as ThemeFieldDefinition).options ?? [] : [];
      return (
        <Select
          value={String(value ?? "")}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {opts.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    case "repeater": {
      const f = field as ThemeFieldDefinition;
      const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      const itemFields = f.itemFields ?? [];
      const maxItems = f.maxItems ?? 20;

      function updateItem(index: number, key: string, val: unknown) {
        const updated = [...items];
        updated[index] = { ...updated[index], [key]: val };
        onChange(updated);
      }

      function addItem() {
        const emptyItem: Record<string, unknown> = {};
        for (const sub of itemFields) {
          emptyItem[sub.key] = sub.defaultValue ?? "";
        }
        onChange([...items, emptyItem]);
      }

      function removeItem(index: number) {
        onChange(items.filter((_, i) => i !== index));
      }

      return (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border bg-muted/30 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Item {idx + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeItem(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {itemFields.map((sub) => (
                <div key={sub.key} className="space-y-1">
                  <Label className="text-xs">{sub.label}</Label>
                  <FieldInput
                    field={sub}
                    value={item[sub.key]}
                    onChange={(v) => updateItem(idx, sub.key, v)}
                  />
                </div>
              ))}
            </div>
          ))}
          {items.length < maxItems && (
            <Button variant="outline" size="sm" onClick={addItem} className="w-full">
              <Plus className="mr-2 h-3 w-3" /> Add Item
            </Button>
          )}
        </div>
      );
    }

    default:
      return (
        <Input
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/**
 * Renders a group of token fields (global design variables).
 */
export function TokenFieldGroup({
  tokens,
  values,
  onChange,
}: {
  tokens: ThemeTokenDefinition[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      {tokens.map((token) => (
        <div key={token.key} className="space-y-1.5">
          <Label className="text-sm font-medium">{token.label}</Label>
          {token.helpText && (
            <p className="text-[11px] text-muted-foreground">{token.helpText}</p>
          )}
          <FieldInput
            field={token}
            value={values[token.key] ?? token.defaultValue}
            onChange={(v) => onChange(token.key, v)}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Renders all fields for a single section, including an optional enabled toggle.
 */
export function SectionFieldGroup({
  section,
  values,
  onChange,
}: {
  section: ThemeSectionDefinition;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const showToggle = section.supportsToggle !== false;
  const isEnabled = values.enabled !== undefined ? Boolean(values.enabled) : (section.defaultEnabled !== false);

  return (
    <div className="space-y-4">
      {section.description && (
        <p className="text-xs text-muted-foreground">{section.description}</p>
      )}

      {showToggle && (
        <>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Enable Section</Label>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => onChange("enabled", checked)}
            />
          </div>
          <Separator />
        </>
      )}

      <div className={showToggle && !isEnabled ? "opacity-40 pointer-events-none" : ""}>
        {section.fields.map((field) => (
          <div key={field.key} className="space-y-1.5 mb-4">
            <Label className="text-sm font-medium">{field.label}</Label>
            {field.helpText && (
              <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
            )}
            <FieldInput
              field={field}
              value={values[field.key] ?? field.defaultValue}
              onChange={(v) => onChange(field.key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
