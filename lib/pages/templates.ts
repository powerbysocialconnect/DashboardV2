/**
 * Pre-built page templates that pre-load sections into content_json.
 * Staff can select these when creating a new page for faster workflow.
 */

import type { PageSection, PageType } from "@/types/database";
import { createBlankSection, generateSectionId } from "./schemas";

export interface PageTemplate {
  name: string;
  description: string;
  page_type: PageType;
  sections: PageSection[];
}

export const PAGE_TEMPLATES: Record<string, PageTemplate> = {
  about: {
    name: "About Us",
    description: "Hero + text + image section for an about page",
    page_type: "standard",
    sections: [
      {
        id: generateSectionId(),
        type: "hero",
        heading: "About Our Brand",
        subheading: "Built for performance and style",
        button_text: "Shop Now",
        button_url: "/",
        background_image_url: "",
      },
      {
        id: generateSectionId(),
        type: "text",
        content:
          "We started with a simple idea: to create products that combine quality craftsmanship with modern design. Every piece in our collection is carefully curated to reflect our commitment to excellence.",
      },
      {
        id: generateSectionId(),
        type: "image_text",
        heading: "Our Story",
        content:
          "Founded in 2022, we have grown from a small workshop into a recognized brand serving customers worldwide. Our team is passionate about delivering exceptional experiences.",
        image_url: "",
        image_alt: "Our workshop",
        image_position: "right",
      },
    ],
  },

  contact: {
    name: "Contact Page",
    description: "Contact form with email, phone, and address block",
    page_type: "contact",
    sections: [
      {
        id: generateSectionId(),
        type: "hero",
        heading: "Get in Touch",
        subheading: "We would love to hear from you",
        button_text: "",
        button_url: "",
        background_image_url: "",
      },
      {
        id: generateSectionId(),
        type: "contact_form",
        form_heading: "Send Us a Message",
        email: "hello@example.com",
        phone: "+1 (555) 000-0000",
        address: "123 Commerce Street, Suite 100",
      },
    ],
  },

  faq: {
    name: "FAQ Page",
    description: "Frequently asked questions with expandable accordion",
    page_type: "faq",
    sections: [
      {
        id: generateSectionId(),
        type: "hero",
        heading: "Frequently Asked Questions",
        subheading: "Find answers to common questions",
        button_text: "",
        button_url: "",
        background_image_url: "",
      },
      {
        id: generateSectionId(),
        type: "faq_accordion",
        heading: "General Questions",
        items: [
          {
            question: "What is your return policy?",
            answer:
              "We offer a 30-day return policy on all items. Items must be in original condition with tags attached.",
          },
          {
            question: "How long does shipping take?",
            answer:
              "Standard shipping takes 5-7 business days. Express shipping is available for 2-3 business day delivery.",
          },
          {
            question: "Do you ship internationally?",
            answer:
              "Yes, we ship to over 50 countries worldwide. International shipping times vary by destination.",
          },
          {
            question: "How can I track my order?",
            answer:
              "Once your order ships, you will receive a tracking number via email that you can use to monitor your delivery.",
          },
        ],
      },
      {
        id: generateSectionId(),
        type: "cta_banner",
        cta_heading: "Still have questions?",
        cta_description: "Our support team is here to help.",
        cta_button_text: "Contact Us",
        cta_button_url: "/contact",
        cta_background_color: "#000000",
      },
    ],
  },

  blank: {
    name: "Blank Page",
    description: "Start from scratch with an empty page",
    page_type: "custom",
    sections: [],
  },
};

/**
 * Get a fresh copy of a template's sections (with new IDs).
 */
export function getTemplateSections(templateKey: string): PageSection[] {
  const template = PAGE_TEMPLATES[templateKey];
  if (!template) return [];

  return template.sections.map((section) => ({
    ...section,
    id: generateSectionId(),
    // Deep-clone arrays
    ...(section.items ? { items: section.items.map((i) => ({ ...i })) } : {}),
    ...(section.testimonials
      ? { testimonials: section.testimonials.map((t) => ({ ...t })) }
      : {}),
  }));
}
