"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/dashboard/ImageUpload";
import { Plus, Trash2 } from "lucide-react";
import type { PageSection, PageSectionType } from "@/types/database";
import { SECTION_LABELS } from "@/lib/pages/schemas";

interface SectionEditorProps {
  section: PageSection;
  onChange: (updated: PageSection) => void;
}

/**
 * Renders the editing fields for a specific section type.
 * Strictly typed — only renders fields defined in the PageSection interface.
 */
export function SectionEditor({ section, onChange }: SectionEditorProps) {
  const update = (fields: Partial<PageSection>) => {
    onChange({ ...section, ...fields });
  };

  switch (section.type) {
    case "hero":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input
              value={section.heading || ""}
              onChange={(e) => update({ heading: e.target.value })}
              placeholder="Hero heading"
            />
          </div>
          <div className="space-y-2">
            <Label>Subheading</Label>
            <Input
              value={section.subheading || ""}
              onChange={(e) => update({ subheading: e.target.value })}
              placeholder="Hero subheading"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={section.button_text || ""}
                onChange={(e) => update({ button_text: e.target.value })}
                placeholder="Shop Now"
              />
            </div>
            <div className="space-y-2">
              <Label>Button URL</Label>
              <Input
                value={section.button_url || ""}
                onChange={(e) => update({ button_url: e.target.value })}
                placeholder="/"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Background Image</Label>
            <ImageUpload
              value={section.background_image_url ? [section.background_image_url] : []}
              onChange={(urls) => update({ background_image_url: urls[urls.length - 1] || "" })}
              onRemove={() => update({ background_image_url: "" })}
            />
          </div>
        </div>
      );

    case "text":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={section.content || ""}
              onChange={(e) => update({ content: e.target.value })}
              placeholder="Enter your text content..."
              rows={6}
            />
          </div>
        </div>
      );

    case "image_text":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input
              value={section.heading || ""}
              onChange={(e) => update({ heading: e.target.value })}
              placeholder="Section heading"
            />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={section.content || ""}
              onChange={(e) => update({ content: e.target.value })}
              placeholder="Section text content..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Image Position</Label>
            <Select
              value={section.image_position || "left"}
              onValueChange={(v) => update({ image_position: v as "left" | "right" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Image Left</SelectItem>
                <SelectItem value="right">Image Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <ImageUpload
              value={section.image_url ? [section.image_url] : []}
              onChange={(urls) => update({ image_url: urls[urls.length - 1] || "" })}
              onRemove={() => update({ image_url: "" })}
            />
          </div>
          <div className="space-y-2">
            <Label>Image Alt Text</Label>
            <Input
              value={section.image_alt || ""}
              onChange={(e) => update({ image_alt: e.target.value })}
              placeholder="Describe this image"
            />
          </div>
        </div>
      );

    case "faq_accordion":
      return <FAQEditor section={section} onChange={onChange} />;

    case "contact_form":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Form Heading</Label>
            <Input
              value={section.form_heading || ""}
              onChange={(e) => update({ form_heading: e.target.value })}
              placeholder="Get in Touch"
            />
          </div>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              value={section.email || ""}
              onChange={(e) => update({ email: e.target.value })}
              placeholder="hello@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={section.phone || ""}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea
              value={section.address || ""}
              onChange={(e) => update({ address: e.target.value })}
              placeholder="123 Commerce St, Suite 100"
              rows={2}
            />
          </div>
        </div>
      );

    case "cta_banner":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input
              value={section.cta_heading || ""}
              onChange={(e) => update({ cta_heading: e.target.value })}
              placeholder="Ready to get started?"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={section.cta_description || ""}
              onChange={(e) => update({ cta_description: e.target.value })}
              placeholder="Take the next step today."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={section.cta_button_text || ""}
                onChange={(e) => update({ cta_button_text: e.target.value })}
                placeholder="Shop Now"
              />
            </div>
            <div className="space-y-2">
              <Label>Button URL</Label>
              <Input
                value={section.cta_button_url || ""}
                onChange={(e) => update({ cta_button_url: e.target.value })}
                placeholder="/"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Background Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={section.cta_background_color || "#000000"}
                onChange={(e) => update({ cta_background_color: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded border"
              />
              <Input
                value={section.cta_background_color || "#000000"}
                onChange={(e) => update({ cta_background_color: e.target.value })}
                placeholder="#000000"
                className="w-32"
              />
            </div>
          </div>
        </div>
      );

    case "testimonials":
      return <TestimonialsEditor section={section} onChange={onChange} />;

    case "spacer":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Height (px)</Label>
            <Input
              type="number"
              min={8}
              max={500}
              value={section.height ?? 64}
              onChange={(e) => update({ height: parseInt(e.target.value) || 64 })}
            />
          </div>
          <div
            className="mx-auto rounded border-2 border-dashed border-muted-foreground/20 bg-muted/30"
            style={{ height: `${Math.min(section.height ?? 64, 120)}px` }}
          />
        </div>
      );

    default:
      return (
        <p className="text-sm text-muted-foreground">
          Unknown section type: {section.type}
        </p>
      );
  }
}

/** Sub-editor for FAQ items */
function FAQEditor({
  section,
  onChange,
}: {
  section: PageSection;
  onChange: (s: PageSection) => void;
}) {
  const items = section.items || [];

  const updateItem = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...section, items: updated });
  };

  const addItem = () => {
    onChange({
      ...section,
      items: [...items, { question: "", answer: "" }],
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...section,
      items: items.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Heading</Label>
        <Input
          value={section.heading || ""}
          onChange={(e) => onChange({ ...section, heading: e.target.value })}
          placeholder="Frequently Asked Questions"
        />
      </div>

      <div className="space-y-3">
        <Label>Questions</Label>
        {items.map((item, index) => (
          <div
            key={index}
            className="space-y-2 rounded-lg border bg-muted/30 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  value={item.question}
                  onChange={(e) => updateItem(index, "question", e.target.value)}
                  placeholder="Question"
                />
                <Textarea
                  value={item.answer}
                  onChange={(e) => updateItem(index, "answer", e.target.value)}
                  placeholder="Answer"
                  rows={2}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>
    </div>
  );
}

/** Sub-editor for Testimonials */
function TestimonialsEditor({
  section,
  onChange,
}: {
  section: PageSection;
  onChange: (s: PageSection) => void;
}) {
  const testimonials = section.testimonials || [];

  const updateTestimonial = (
    index: number,
    field: keyof (typeof testimonials)[0],
    value: string
  ) => {
    const updated = [...testimonials];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...section, testimonials: updated });
  };

  const addTestimonial = () => {
    onChange({
      ...section,
      testimonials: [
        ...testimonials,
        { name: "", role: "", quote: "", avatar_url: "" },
      ],
    });
  };

  const removeTestimonial = (index: number) => {
    onChange({
      ...section,
      testimonials: testimonials.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Heading</Label>
        <Input
          value={section.heading || ""}
          onChange={(e) => onChange({ ...section, heading: e.target.value })}
          placeholder="What Our Customers Say"
        />
      </div>

      <div className="space-y-3">
        <Label>Testimonials</Label>
        {testimonials.map((t, index) => (
          <div
            key={index}
            className="space-y-2 rounded-lg border bg-muted/30 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={t.name}
                    onChange={(e) =>
                      updateTestimonial(index, "name", e.target.value)
                    }
                    placeholder="Customer name"
                  />
                  <Input
                    value={t.role || ""}
                    onChange={(e) =>
                      updateTestimonial(index, "role", e.target.value)
                    }
                    placeholder="Role (optional)"
                  />
                </div>
                <Textarea
                  value={t.quote}
                  onChange={(e) =>
                    updateTestimonial(index, "quote", e.target.value)
                  }
                  placeholder="Their testimonial..."
                  rows={2}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive"
                onClick={() => removeTestimonial(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTestimonial}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Testimonial
        </Button>
      </div>
    </div>
  );
}
