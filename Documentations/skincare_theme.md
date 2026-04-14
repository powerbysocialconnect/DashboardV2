# Theme Blueprint: Skincare (Glowing)

This document maps the **Glowing Shopify Theme** to the **PixeoCommerce V2** architecture. It identifies the necessary sections, schemas, and configurations required to replicate the high-end, editorial skincare aesthetic.

**Reference URL**: [Glowing Shopify Theme](https://glowing-theme.myshopify.com/) (Password: `1`)

---

## 1. Visual Identity & Aesthetic
- **Color Palette**: Cream/Off-white backgrounds (`#F9F9F9`), Deep Forest Green accents (`#1A2B24`), and Muted Sage.
- **Typography**: Editorial Serif for headings (Classic/Premium feel) and clean Sans-Serif for body text.
- **Imagery**: Soft, natural lighting, high-contrast product shots with botanical elements.

---

## 2. Homepage Layout Mapping

The following table maps the visual sections seen on the live site to the **PixeoCommerce Section Registry**.

| Visual Section | Pixeo Section Type | Key Override Fields |
| :--- | :--- | :--- |
| **Top Announcement** | `announcement_bar` | `title`: "Free shipping on all orders over $75", `backgroundColor`: `#1A2B24` |
| **Hero Banner** | `hero` | `title`: "Be Your Kind of Beauty", `variant`: `left-aligned`, `imageUrl`: (Skincare leaf flatlay) |
| **Featured Products** | `featured_products` | `title`: "Our Featured Products", `limit`: 8 |
| **Middle Hero / Dual Banner** | `collection_promo` | `title1`: "Intensive Glow Serum", `title2`: "25% off Everything" |
| **Value Propositions** | `service_features` | `columns`: 4, `variant`: `minimal` |
| **Logo Grid / Press** | `logo_cloud` | `title`: "As Seen In", `variant`: `grayscale`, `opacity`: 0.6 |
| **Customer Quote** | `rich_text` | `title`: "Customer favorite beauty essentials", `body`: (Large quote style) |
| **Social / Instagram** | `social_grid` | `handle`: "@glowing_skin", `limit`: 5 |
| **Footer Signup** | `newsletter` | `title`: "Good emails", `ctaLabel`: "Subscribe" |

---

## 3. Required Registry Schemas

To fully support this layout, the following schemas must be configured in `lib/themes/sectionSchemas.ts`:

### `logo_cloud` (Press / Partners)
- **icon**: `Component`
- **Fields**: `title` (text), `variant` (original/grayscale/inverse), `opacity` (number).

### `service_features` (Trust Badges)
- **icon**: `ShieldCheck`
- **Fields**: `columns` (number), `variant` (minimal/cards/bold).

### `collection_promo` (Dual Banner)
- **icon**: `Columns2`
- **Fields**: `title1`, `imageUrl1`, `ctaLabel1`, `title2`, `imageUrl2`, `ctaLabel2`.

---

## 4. Asset Guidelines for Developers
- **Hero Image**: 2000px wide, landscape (16:9). Prefer images with "negative space" on the left for text overlay.
- **Collection Banners**: Square or 4:3 ratio. Consistent lighting is critical for the side-by-side look.
- **Logo Cloud**: Transparent PNGs or SVGs are mandatory for the grayscale filter to look professional.

---

## 5. Development Status
- `[x]` Section Schemas Registered in `lib/themes/sectionSchemas.ts`
- `[ ]` React Components created in `components/themes/sections/`
- `[ ]` Wired into `SectionRenderer.tsx` dispatch
