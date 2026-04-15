# PixeoCommerce: Core Theme Clone Guide

This guide explains how to turn the existing **Core** theme into a brand new theme in the current repository workflow.

Use this when you want to:
- duplicate Core quickly,
- restyle it into a new look,
- keep all platform contracts (cart, sections, schema, validation),
- register and test it locally.

---

## 1) Prerequisites

- Run the app locally with `npm run dev` (Next.js workflow in this repo).
- Ensure `.env.local` has valid Supabase keys if your local environment needs live store data.
- Use local subdomain routing for storefront checks:
  - `http://[subdomain].localhost:3000`

---

## 2) Create the New Theme Definition

Create a new schema file by copying Core:

- From: `lib/themes/definitions/core.ts`
- To: `lib/themes/definitions/<your-theme>.ts`

Update these fields in the new file:
- `code` (unique, lowercase kebab-case, e.g. `aurora`)
- `name` (display name in admin)
- `version` (start at `1` for a fresh theme)
- `description` (optional but recommended)
- `editableTokens` defaults (brand colors/fonts)
- `editableSections` defaults (headings, labels, toggles, etc.)

Recommended approach:
- Keep the same section builder structure first.
- Only adjust defaults and add/remove sections once the base theme renders correctly.

---

## 3) Duplicate Core Visual Components

Copy the Core visual implementation:

- From: `components/themes/core/`
- To: `components/themes/<your-theme>/`

Then refactor safely:
- Rename components/files if needed, but keep imports consistent.
- Restyle markup/classes to your design direction.
- Preserve required functional patterns:
  - `useCart` integrations in cart drawer and cart interactions
  - footer merchant branding fields (`footer_headline`, `footer_description`)
  - `social_links` rendering behavior
  - product rendering contracts used by shared storefront data

Do **not** add direct database calls inside theme components. Theme components must render from provided props/config.

---

## 4) Register Theme in Registry

Edit `lib/themes/registry.ts`:

1. Import your new theme definition.
2. Add it to `THEME_REGISTRY`.

Example pattern:

```typescript
import { myTheme } from "./definitions/my-theme";

const THEME_REGISTRY: Record<string, ThemeDefinition> = {
  [coreTheme.code]: coreTheme,
  [glowingTheme.code]: glowingTheme,
  [myTheme.code]: myTheme,
};
```

---

## 5) Wire ThemeRenderer

Add support for the new theme code in the renderer switch:

- Locate `ThemeRenderer` (project renderer entry point).
- Add a `case` for your theme `code`.
- Render your new layout/components folder there.

If you skip this, the theme can exist in registry but still not render on storefront.

---

## 6) Optional: Add/Change Section Types

If you need a brand-new section type:

1. Add schema definition in `lib/themes/sectionSchemas.ts` (or section builders if using that pattern).
2. Implement section component in theme/sections components.
3. Wire it in `components/themes/sections/SectionRenderer.tsx`.

Rules:
- section fields must be schema-defined,
- defaults must be provided in schema,
- no direct DB access from section components.

---

## 7) Local Test Checklist

1. Start dev server: `npm run dev`
2. Open admin and switch store to new theme.
3. Open Theme Editor and verify:
   - tokens show correctly,
   - each section field renders,
   - toggles and repeaters behave correctly.
4. Save config and confirm backend validation passes.
5. Open storefront subdomain URL and confirm:
   - all enabled sections render,
   - cart actions still work,
   - discount flow still works,
   - footer branding and social links render from store data.

---

## 8) Common Mistakes to Avoid

- Theme `code` mismatch between definition, renderer, and registry.
- Forgetting to register in `lib/themes/registry.ts`.
- Forgetting ThemeRenderer `case`.
- Hardcoding product selection behavior instead of editor-driven fields.
- Removing `useCart` wiring while redesigning cart UI.
- Using fields in components that are not defined in schema.

---

## 9) Recommended Build Order (Fastest)

1. Copy `core.ts` to new definition.
2. Register in `registry.ts`.
3. Copy `components/themes/core/` folder.
4. Add renderer `case`.
5. Confirm it renders unchanged.
6. Restyle incrementally.
7. Add/modify section schema only after baseline is stable.

This sequence minimizes breakage and makes regressions easy to isolate.

---

## 10) Available Schemas in This Codebase

This is the current schema inventory in this repository.

### A) Registered theme definition schemas (active in registry)

These are the themes currently registered in `lib/themes/registry.ts`:
- `core` -> `lib/themes/definitions/core.ts`
- `glowing` -> `lib/themes/definitions/glowing.ts`

### B) Registered section schemas (from `lib/themes/sectionSchemas.ts`)

These section types exist in `SECTION_SCHEMA_REGISTRY`:
- `hero`
- `featured_products`
- `category_grid`
- `image_with_text`
- `testimonials`
- `newsletter`
- `rich_text`
- `promotional_banner`
- `announcement_bar`
- `logo_cloud`
- `service_features`
- `social_grid`
- `collection_promo`

### C) Reusable section schema builders (from `lib/themes/sectionBuilders.ts`)

These builder helpers are available for new theme definitions:
- `createAnnouncementBarSection`
- `createHeaderSection`
- `createHeroSection`
- `createBrandStatementSection`
- `createServiceFeaturesSection`
- `createLogoCloudSection`
- `createPromoTilesSection`
- `createFeaturedProductsSection`
- `createNewsletterSection`
- `createSocialGallerySection`
- `createFooterSection`

### D) Theme field types available in schema-driven definitions

From `lib/themes/types.ts`, the supported theme field types are:
- `text`
- `textarea`
- `richtext`
- `font`
- `image`
- `url`
- `boolean`
- `number`
- `select`
- `color`
- `category`
- `product_multi`
- `repeater`

---

## 11) What Files to Copy Into a New Project

Use one of these two paths depending on your setup.

### Option A: New theme inside this same repo (recommended now)

Minimum files/folders to create and edit:
1. Copy `lib/themes/definitions/core.ts` -> `lib/themes/definitions/<your-theme>.ts`
2. Copy `components/themes/core/CoreLayout.tsx` -> `components/themes/<your-theme>/CoreLayout.tsx` (or renamed layout file)
3. Edit `lib/themes/registry.ts` to register your new theme
4. Edit `components/themes/ThemeRenderer.tsx` to add your theme case

Usually also needed for full behavior:
- Reuse existing shared section renderer/components in `components/themes/sections/` if your layout depends on them.
- If adding new section types, update:
  - `lib/themes/sectionSchemas.ts`
  - `components/themes/sections/SectionRenderer.tsx`

### Option B: Separate new project (portable clone workflow)

If you are extracting to a separate project while still connected to real data, copy these from this repo:

**Theme schema/runtime contract files**
- `lib/themes/types.ts`
- `lib/themes/sectionBuilders.ts`
- `lib/themes/resolveThemeConfig.ts`
- `lib/themes/validateThemeConfig.ts`
- `lib/themes/mergeSectionData.ts`
- `lib/themes/packageContract.ts` (if you are packaging bundles)

**Theme source files**
- `lib/themes/definitions/core.ts` (as starting schema)
- `components/themes/core/CoreLayout.tsx` (as starting layout)
- Any required shared section files from `components/themes/sections/` used by your layout

**Data client files (for live store/product data)**
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`

**Environment config**
- `.env.local` with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**What else to mirror (critical runtime behavior)**
- subdomain store resolution (`[subdomain].localhost:3000` path)
- theme config merge pipeline (schema defaults + stored overrides)
- section enable/disable handling (`enabled`)
- token-to-CSS variable injection at render time
- product section resolver behavior (`sourceType`, `categoryId`, `productIds`, `sortBy`, `limit`)

**Commerce interaction layer to mirror**
- cart hook/state used by your theme layout (for quantity updates and removals)
- discount apply flow and endpoint usage
- subtotal/discount/total rendering logic expected by cart UI

**API/routes to mirror**
- theme config read/save endpoints used by admin editor
- discount validation endpoint used by cart
- store lookup + product/category endpoints used by storefront resolution

If the new project is still Next.js-based and should behave exactly like this repo, also copy/update:
- route handlers and API endpoints used by theme/cart/discount flows
- cart hook and shared storefront data loader modules your layout imports
- middleware and routing behavior required for store resolution/auth

**Recommended verification order after extraction**
1. Boot project with an unchanged Core clone.
2. Confirm store resolves via subdomain.
3. Confirm theme loads from registry and renderer.
4. Save theme config from editor and confirm validation + persistence.
5. Verify storefront renders merged config correctly.
6. Verify cart + discount flow end-to-end.
7. Start restyling only after all checks pass.

Tip: after copying, run the project once with an unchanged Core clone before restyling. This confirms imports/contracts are complete.

---

## 12) Keep Functionality, Change Visuals Only

If your goal is to focus only on design, keep these platform behaviors intact and only edit markup/classes/spacing/colors/typography.

### A) Search (already wired in Core)

How it works now:
- Search UI state is controlled by `UIProvider` (`isSearchOpen`, `toggleSearch`).
- `SearchOverlay` receives a `products` array from layout props.
- Filtering is client-side by product name (`includes(query)`), and results are capped.
- Product links resolve with store context (`/store/[subdomain]/product/[id]`).

What to keep unchanged:
- Keep `SearchOverlay` mounted in layout.
- Keep `UIProvider` wrapping the theme tree.
- Keep `products` passed into layout and then into search.
- Keep result links store-scoped.

Safe to change:
- search overlay visual style, typography, spacing, animations, cards, empty states.

### B) Cart + totals + quantity updates

How it works now:
- `CartProvider` powers cart state via `useCart()`.
- Cart persists in `localStorage` using store-scoped keys (`cart_<subdomain>`).
- Totals are computed in hook (`subtotal`, `discount`, `total`, `itemCount`).
- `updateQuantity`, `removeItem`, and `addItem` are provided by hook.

What to keep unchanged:
- Keep `CartProvider` wrapping layout.
- Keep `useCart()` calls in header/cart drawer/product actions.
- Keep cart item shape (`id`, `name`, `price`, `image`, `quantity`).
- Keep checkout navigation path format for subdomain stores.

Safe to change:
- drawer layout, button style, badge style, product row visual design.

### C) Discount code flow

How it works now:
- Cart calls `applyDiscount(code, storeId)` from `useCart`.
- Hook validates via `GET /api/store/[storeId]/validate-discount?code=...`.
- On valid response, discount state is stored and totals auto-recalculate.

What to keep unchanged:
- Keep `storeId` passed into cart drawer.
- Keep `applyDiscount`/`removeDiscount` wiring.
- Keep API route contract and response shape (`valid`, `discount`, `error`).

Safe to change:
- coupon input styling, success/error message visuals, discount badge visuals.

### D) Sidebar/menu open-close behavior

How it works now:
- Sidebar/search/cart visibility is coordinated by `useUI`.
- Opening one panel closes the others.

What to keep unchanged:
- calls to `toggleSidebar`, `toggleSearch`, `toggleCart`.
- overlay close interactions.

Safe to change:
- panel sizes, transitions, icon styling, menu layout.

### E) Footer brand + social data

How it works now:
- Footer reads from store data (`footer_headline`, `footer_description`, `social_links`).
- Social icons render conditionally based on available URLs.

What to keep unchanged:
- data keys and conditional rendering behavior.

Safe to change:
- footer composition, icon treatment, spacing, typography system.

### Visual-only guardrails (quick rule)

When redesigning, you should be mostly changing:
- class names and CSS variables/tokens,
- markup structure,
- animations/transitions.

Avoid changing unless necessary:
- provider placement (`CartProvider`, `UIProvider`),
- hook contracts (`useCart`, `useUI`),
- route paths and payload contracts,
- store/subdomain link construction logic.

If you keep those contracts and only reskin components, you can focus on visuals without breaking commerce behavior.

---

## 13) Scope Note

In this repository today, local development is Next.js-first (`npm run dev`).
The future SDK/CLI flow (`pixeo dev`, `pixeo build`, `pixeo push`) is a planned ecosystem direction, but this guide documents the **current working path** in this codebase.
