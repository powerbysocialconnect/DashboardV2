/**
 * Strict section schemas for the page builder.
 * Each section type has a defined structure — no raw HTML, no arbitrary payloads.
 */

import type { PageSection, PageSectionType } from "@/types/database";

/** Human-readable labels for each section type */
export const SECTION_LABELS: Record<PageSectionType, string> = {
  hero: "Hero Section",
  text: "Text Block",
  image_text: "Image + Text",
  faq_accordion: "FAQ Accordion",
  contact_form: "Contact Form",
  cta_banner: "CTA Banner",
  testimonials: "Testimonials",
  spacer: "Spacer",
};

/** Description for each section type */
export const SECTION_DESCRIPTIONS: Record<PageSectionType, string> = {
  hero: "Full-width banner with heading, subheading, and optional CTA button",
  text: "Rich text content block for paragraphs and information",
  image_text: "Side-by-side image and text layout",
  faq_accordion: "Expandable question and answer pairs",
  contact_form: "Contact information with an embedded form",
  cta_banner: "Call-to-action banner with button",
  testimonials: "Customer quotes and reviews",
  spacer: "Vertical spacing between sections",
};

/** 
 * All allowed section types.
 * This is the single source of truth — the builder will only allow these types.
 */
export const ALLOWED_SECTION_TYPES: PageSectionType[] = [
  "hero",
  "text",
  "image_text",
  "faq_accordion",
  "contact_form",
  "cta_banner",
  "testimonials",
  "spacer",
];

/** Generate a unique ID for a new section */
export function generateSectionId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/** Create a blank section with default values for the given type */
export function createBlankSection(type: PageSectionType): PageSection {
  const base = { id: generateSectionId(), type };

  switch (type) {
    case "hero":
      return {
        ...base,
        heading: "Your Heading Here",
        subheading: "Your subheading goes here",
        button_text: "",
        button_url: "",
        background_image_url: "",
      };
    case "text":
      return {
        ...base,
        content: "Enter your text content here...",
      };
    case "image_text":
      return {
        ...base,
        heading: "Section Title",
        content: "Describe this section...",
        image_url: "",
        image_alt: "",
        image_position: "left",
      };
    case "faq_accordion":
      return {
        ...base,
        heading: "Frequently Asked Questions",
        items: [
          { question: "What is your return policy?", answer: "We offer 30-day returns on all items." },
        ],
      };
    case "contact_form":
      return {
        ...base,
        form_heading: "Get in Touch",
        email: "",
        phone: "",
        address: "",
      };
    case "cta_banner":
      return {
        ...base,
        cta_heading: "Ready to get started?",
        cta_description: "Take the next step today.",
        cta_button_text: "Shop Now",
        cta_button_url: "/",
        cta_background_color: "#000000",
      };
    case "testimonials":
      return {
        ...base,
        heading: "What Our Customers Say",
        testimonials: [
          { name: "Jane Doe", role: "Customer", quote: "Amazing experience!", avatar_url: "" },
        ],
      };
    case "spacer":
      return {
        ...base,
        height: 64,
      };
    default:
      return base;
  }
}

/**
 * Validate that a section payload strictly conforms to its type schema.
 * Returns true if valid, or an error message string.
 */
export function validateSection(section: PageSection): true | string {
  if (!section.id || typeof section.id !== "string") {
    return "Section must have a valid id";
  }
  if (!ALLOWED_SECTION_TYPES.includes(section.type)) {
    return `Invalid section type: ${section.type}`;
  }

  switch (section.type) {
    case "hero":
      if (typeof section.heading !== "string") return "Hero section requires a heading";
      break;
    case "text":
      if (typeof section.content !== "string") return "Text section requires content";
      break;
    case "image_text":
      if (typeof section.content !== "string") return "Image+Text section requires content";
      if (section.image_position && !["left", "right"].includes(section.image_position)) {
        return "Image position must be 'left' or 'right'";
      }
      break;
    case "faq_accordion":
      if (!Array.isArray(section.items)) return "FAQ section requires items array";
      for (const item of section.items) {
        if (typeof item.question !== "string" || typeof item.answer !== "string") {
          return "Each FAQ item must have question and answer strings";
        }
      }
      break;
    case "contact_form":
      // Minimal validation — all contact fields are optional
      break;
    case "cta_banner":
      if (typeof section.cta_heading !== "string") return "CTA section requires a heading";
      break;
    case "testimonials":
      if (!Array.isArray(section.testimonials)) return "Testimonials section requires a testimonials array";
      for (const t of section.testimonials) {
        if (typeof t.name !== "string" || typeof t.quote !== "string") {
          return "Each testimonial must have name and quote strings";
        }
      }
      break;
    case "spacer":
      if (section.height !== undefined && (typeof section.height !== "number" || section.height < 0 || section.height > 500)) {
        return "Spacer height must be a number between 0 and 500";
      }
      break;
  }

  return true;
}

/**
 * Validate an entire content_json payload.
 * Returns true if all sections are valid, or the first error message.
 */
export function validateContentJson(sections: PageSection[]): true | string {
  if (!Array.isArray(sections)) return "content_json must be an array";
  for (let i = 0; i < sections.length; i++) {
    const result = validateSection(sections[i]);
    if (result !== true) return `Section ${i + 1}: ${result}`;
  }
  return true;
}
