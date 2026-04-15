# PixeoCommerce Managed Theme Editor Playbook (V1)

This document is a focused, easy-to-edit guide for building a **guided fixed-layout editor** on top of the existing schema system.

It complements `PIXEOCOMMERCE_V2_THEME_SYSTEM_BLUEPRINT.md` and is intentionally opinionated for implementation speed.

---

## 1) Product Direction (Non-Negotiable)

Refactor from:
- generic schema-driven configurable editor

to:
- guided fixed-layout theme editor

Important:
- Keep schema system underneath
- Do not build drag/drop builder
- Do not make one-off hardcoded forms

---

## 2) Managed Theme Model

For managed themes, homepage structure is predefined by blueprint + schema.

### Theme: Core Managed

Homepage fixed section order:
1. `header`
2. `hero`
3. `shop_by_category`
4. `latest_products`
5. `promo_banner`
6. `footer`

Admin cannot reorder sections for this theme profile.

---

## 3) Theme Structure Source of Truth

For each managed theme, this playbook + schema must define:
- fixed section order
- section ids
- section types
- section purpose
- default values
- editable fields
- dynamic backend fields
- media/upload fields
- backend-connected sections

---

## 4) Section Definitions (Core Managed)

### 4.1 Header / Nav (`header`)
Purpose: store identity + top navigation.

Editable fields:
- `logo_image`
- `logo_text`
- `nav_links` (repeater: `label`, `url`)
- `sticky` (boolean)

### 4.2 Hero (`hero`)
Purpose: primary visual + call-to-action.

Editable fields:
- `image`
- `mobile_image`
- `title`
- `subtitle`
- `cta_label`
- `cta_url`
- `overlay_position`

### 4.3 Shop by Category (`shop_by_category`)
Purpose: visual category merchandising block.

Editable fields:
- `title`
- `cards` (repeater):
  - `category_id`
  - `label_override` (optional)
  - `image` (upload)
  - `link_override` (optional)

### 4.4 Latest Products (`latest_products`)
Purpose: backend-driven product feed section.

Editable fields:
- `title`
- `source_type` (`latest` | `category` | `manual`)
- `category_id` (when source is `category` or `manual`)
- `product_ids` (when source is `manual`, ordered)
- `limit`
- `sort` (`newest`, `oldest`, `price_asc`, `price_desc`, `name_asc`)
- `cta_label`
- `cta_url`

Important rule:
- product source behavior must be editor-configurable, not hardcoded in component logic

### 4.5 Promo Banner (`promo_banner`)
Purpose: campaign block.

Editable fields:
- `image`
- `title`
- `subtitle`
- `cta_label`
- `cta_url`
- `background_color`
- `text_color`

### 4.6 Footer (`footer`)
Purpose: brand trust + social links + legal.

Editable fields:
- `logo_image`
- `brand_text`
- `footer_description`
- `social_links` (repeater: `platform`, `url`)
- `terms_url`
- `privacy_url`

---

## 5) Editor UX Rules (Guided, Non-Confusing)

- Show fixed section list in order
- Use section cards/accordion with clear labels
- Prioritize image fields first in visual sections
- Hide advanced controls unless needed
- Use conditional fields:
  - `product_ids` visible only when `source_type = manual`
  - `category_id` visible only when `source_type = category/manual`
- If category is selected in manual mode, product picker should filter to that category
- Keep save flow simple: one save button, clear success/error state

The editor should feel like:
- "Edit this store homepage"
not
- "Configure a complicated theme engine"

---

## 6) Schema Layer Requirements

- Keep using `ThemeDefinition` + `editableSections`
- Add managed-theme metadata as needed (optional):
  - `layoutMode: "fixed" | "flex"`
  - `fixedOrder: string[]`
- Section schemas must include defaults so empty stores still render cleanly
- Validation remains backend-enforced

---

## 7) Implementation Plan (Architecture First)

### Phase A: Blueprint + schema alignment
1. Add/confirm Core Managed section list and fields from this document
2. Ensure section ids/types are stable and versioned

### Phase B: Guided editor behavior
1. Fixed ordered section rendering
2. Conditional field visibility
3. Media-first grouping in UI
4. Category-aware product picker

### Phase C: Storefront contract
1. Resolver reads managed schema config
2. Product sections resolve via backend data sources
3. Theme components consume resolved values only

### Phase D: Operational quality
1. Validation messages mapped to user-friendly labels
2. Empty-state defaults polished
3. Optional section-level help text/tooltips

---

## 8) Deliverables Checklist

1. updated blueprint structure for managed model
2. fixed homepage section list
3. updated schema design for all sections
4. editor UX refactor plan
5. implementation plan for hero, shop_by_category, latest_products, promo_banner, footer

---

## 9) Prompt Template for Antigravity / Cursor

Use this file's section 1-8 as the prompt source. Keep this exact intent:
- fixed premium theme layout
- schema-defined editable fields
- simple store-specific content editing
- dynamic backend-driven product sections
- very clean admin UX
- architecture/refactor plan first, then implementation
