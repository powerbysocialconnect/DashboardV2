"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Type,
  Image,
  MessageSquare,
  HelpCircle,
  Megaphone,
  Quote,
  Minus,
  LayoutTemplate,
} from "lucide-react";
import type { PageSection, PageSectionType } from "@/types/database";
import {
  SECTION_LABELS,
  SECTION_DESCRIPTIONS,
  ALLOWED_SECTION_TYPES,
  createBlankSection,
} from "@/lib/pages/schemas";
import { SectionEditor } from "./SectionEditor";

interface PageBuilderProps {
  sections: PageSection[];
  onChange: (sections: PageSection[]) => void;
}

const SECTION_ICONS: Record<PageSectionType, React.ReactNode> = {
  hero: <LayoutTemplate className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  image_text: <Image className="h-4 w-4" />,
  faq_accordion: <HelpCircle className="h-4 w-4" />,
  contact_form: <MessageSquare className="h-4 w-4" />,
  cta_banner: <Megaphone className="h-4 w-4" />,
  testimonials: <Quote className="h-4 w-4" />,
  spacer: <Minus className="h-4 w-4" />,
};

export function PageBuilder({ sections, onChange }: PageBuilderProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  );
  const [addSectionType, setAddSectionType] = useState<PageSectionType>("text");

  const toggleExpanded = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSection = () => {
    const newSection = createBlankSection(addSectionType);
    onChange([...sections, newSection]);
    setExpandedSections((prev) => new Set([...prev, newSection.id]));
  };

  const removeSection = (id: string) => {
    onChange(sections.filter((s) => s.id !== id));
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const updateSection = (id: string, updated: PageSection) => {
    onChange(sections.map((s) => (s.id === id ? updated : s)));
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Section List */}
      {sections.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/20 py-16">
          <LayoutTemplate className="mb-4 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            No sections added yet
          </p>
          <p className="text-xs text-muted-foreground/60">
            Add your first section below to start building the page
          </p>
        </div>
      )}

      {sections.map((section, index) => {
        const isExpanded = expandedSections.has(section.id);

        return (
          <Card
            key={section.id}
            className="overflow-hidden border transition-shadow hover:shadow-sm"
          >
            {/* Section Header */}
            <div
              className="flex cursor-pointer items-center gap-3 border-b bg-muted/30 px-4 py-3"
              onClick={() => toggleExpanded(section.id)}
            >
              <div className="flex items-center gap-1 text-muted-foreground">
                <GripVertical className="h-4 w-4" />
              </div>

              <div className="flex items-center gap-2">
                {SECTION_ICONS[section.type]}
                <span className="text-sm font-semibold">
                  {SECTION_LABELS[section.type]}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-normal uppercase"
                >
                  {index + 1}
                </Badge>
              </div>

              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveSection(index, "up");
                  }}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveSection(index, "down");
                  }}
                  disabled={index === sections.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSection(section.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Section Editor (collapsible) */}
            {isExpanded && (
              <CardContent className="p-4 pt-4">
                <SectionEditor
                  section={section}
                  onChange={(updated) => updateSection(section.id, updated)}
                />
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Add Section Control */}
      <Card className="border-2 border-dashed border-muted-foreground/20 bg-muted/10">
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-center">
          <Select
            value={addSectionType}
            onValueChange={(v) => setAddSectionType(v as PageSectionType)}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Choose section type" />
            </SelectTrigger>
            <SelectContent>
              {ALLOWED_SECTION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center gap-2">
                    {SECTION_ICONS[type]}
                    <div>
                      <span className="font-medium">
                        {SECTION_LABELS[type]}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {SECTION_DESCRIPTIONS[type]}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={addSection} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
