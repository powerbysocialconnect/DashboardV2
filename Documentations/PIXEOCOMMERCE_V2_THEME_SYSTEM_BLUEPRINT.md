# PixeoCommerce V2 Theme System: The Global Blueprint (V2.3)

This document defines the production-grade architecture for the PixeoCommerce **Schema-Driven Theme Ecosystem**. It covers the code-first development model, the admin field editor system, validation, the **Theme SDK roadmap** for partner developers, and everything an AI or developer needs to create new themes rapidly.

For a simplified, implementation-first guide to the fixed-layout managed editor direction, use:
`Documentations/PIXEOCOMMERCE_MANAGED_THEME_EDITOR_PLAYBOOK.md`

---

## 0. North Star: A Shopify-Like Theme Ecosystem

The **whole purpose** of this blueprint is to support a model comparable to **Shopify Themes**: many stores share one platform, while **theme authors**—including Pixeo’s team and **external developers**—can ship polished storefront experiences without rebuilding checkout, cart, products, or platform APIs from scratch.

### How this maps to Shopify concepts

| Shopify idea | PixeoCommerce equivalent |
|--------------|---------------------------|
| **Dawn** (reference / starter theme) | **Core** (`core`) — minimal baseline layout, cart hooks, and patterns other themes should follow or fork |
| **Theme package** (Liquid + assets + `config`) | **ThemeDefinition** schema + React layout/components + optional `.pixeo` bundle in the long term |
| **Theme Store** (discovery & install) | **Theme registry** (`lib/themes/registry.ts`) + admin assignment per store (future: marketplace-style listing) |
| **Theme settings** (merchant-facing knobs) | **Tokens + sections** in `theme_settings`, edited via the **schema-driven field editor** (no per-theme hardcoded admin forms) |
| **Sections** | Same mental model: composable blocks (hero, featured products, footer) with a **typed schema** per theme |
| **Third-party theme developers** | Devs **fork or remake Core**, add their own `ThemeDefinition`, register it, and implement `ThemeRenderer` — same contracts (`store`, `products`, `useCart`, etc.) |
| **Theme Kit / CLI + local dev** | **Pixeo Theme SDK** (`@pixeo/theme-types`, starter template, `pixeo` CLI) — see **§2.1** |

### What third-party developers are meant to do

1. **Treat Core as the boilerplate**, not a black box. Copy its layout shell, cart integration, and data patterns; replace visuals, typography, and section composition.
2. **Declare a `ThemeDefinition`** (tokens + sections + fields) so the **admin field editor** and **API validation** stay automatic—same as Shopify’s `settings_schema` driving the customizer.
3. **Register the theme** in the registry and wire rendering in **ThemeRenderer** so the platform can assign the theme to a store safely.
4. **Never bypass the contract**: themes receive **resolved config + store data** through documented props; they do not talk to the database directly.

### What the platform guarantees

- **One runtime, many themes**: storefront resolution, products, cart, and auth stay on the host; themes are **skins + section layouts** over that runtime.
- **Schema-first**: new themes scale because merchants and admins configure through **fields derived from the schema**, not bespoke dashboards per theme.
- **Path to a full “Theme Store”**: today the registry is in-repo; the same **ThemeDefinition + validation + merge** pipeline is the foundation for publishing third-party packages later (CLI push, signed bundles, versioning).

This document is the **contract** that keeps internal themes, partner themes, and AI-generated themes aligned—so you can keep adding theme after theme without fragmenting the platform.

---

## 1. Architectural Philosophy
Themes in V2 are not mere database entries; they are **compiled software packages**.
- **Controlled Execution**: Themes run as controlled bundles within a platform-provided Runtime.
- **Unified Logic**: The same SDK works for internal Pixeo builders and external ecosystem developers.
- **Contract Driven**: The SDK defines the strict interface between Store Data and Scene Rendering.
- **Immutable Versions**: Once a theme version is published, it is never modified. Upgrades are explicit.
- **Schema-Driven Admin**: The admin field editor is generated dynamically from each theme's schema definition. No per-theme hardcoded forms.

---

## 2. Ecosystem Separation (Critical)
The PixeoCommerce ecosystem is split into two distinct repositories to ensure modularity and scalability—mirroring how **Shopify** separates the **admin + Online Store runtime** from **theme source code** that authors ship independently:

1.  **The Host Platform (This Repo)**: Acts as the **Registry** and **Runtime Host**. It stores theme metadata, handles merchant assignments, validates saved config against each theme’s schema, and renders the stores. This is where **Core** lives as the canonical reference theme other devs can **remake or extend**.
2.  **The Theme SDK & Starter Template (Separate Repo)**: Where **external developers** clone a starter, iterate on layouts and CSS, run builds, and (in the full vision) **push** versioned theme packages—without needing full access to merchant data or platform internals. Same idea as developing a Shopify theme in your own repo and uploading the ZIP.

**Practical note for today:** third-party work may still start by **forking `components/themes/core/` and `lib/themes/definitions/core.ts`** in this repo or a private fork; the split-repo model is the **target shape** so theme shops can eventually work like Shopify theme partners.

---

## 2.1 The Pixeo Theme SDK (Required for Partner Expansion)

You **do** need a first-class **Theme SDK** so Pixeo can hand **Core** (and the schema contract) to other developers, let them build and test themes **outside** the main monorepo, and scale the ecosystem—same role Shopify’s **Theme Kit / CLI + Dawn** play for partners.

### Goals

| Goal | Outcome |
|------|--------|
| **Distributable Core** | Partners get a **starter repo** (or tarball) derived from Core: layout, cart patterns, section examples—not a vague “read our codebase.” |
| **Shared contract** | `@pixeo/theme-sdk` (name TBD) publishes **TypeScript types** aligned with `lib/themes/types.ts`, **section builders**, and docs so schemas stay in sync with the host. |
| **Local dev without production DB** | `pixeo dev` (or `pnpm theme:dev`) runs a **Vite** storefront shell with **mock store/product data**, so themes are developed like Shopify themes in isolation. |
| **Validate before submit** | `pixeo validate` runs the same rules as the host: schema shape, forbidden APIs, bundle size—fail fast before review. |
| **Ship artifacts** | `pixeo build` outputs the **`.pixeo` / `dist/`** layout (see §3); `pixeo push` (later) uploads to Pixeo’s registry for admin assignment. |

### What the SDK repo contains (target layout)

```
pixeo-theme-sdk/                 # npm workspace or single package
├── packages/
│   ├── theme-types/             # Mirrors ThemeDefinition, fields, tokens (synced from host or generated)
│   ├── theme-section-builders/  # Optional: shared createHeroSection, etc.
│   └── cli/                     # pixeo-cli: dev | build | validate | push
├── starters/
│   └── core-theme/              # Forkable template: React + Tailwind + Core layout parity
└── README.md
```

- **`theme-types`**: Published to npm as **`@pixeo/theme-types`** (or scoped under your org). Host platform imports the **same** major version to avoid drift; alternatively the host remains source of truth and types are **copied on release** (document the process).
- **`starters/core-theme`**: The **gift to other devs**—clone, rename, add sections, publish. Includes a **sample `ThemeDefinition`** and instructions to register on the host (or submit a PR / bundle).

### What stays on the host platform (this repo)

- **Registry** (`getThemeByCode`, assignment per store).
- **Admin field editor** + **API validation** (`validateThemeConfig`).
- **ThemeRenderer** and production **data loading** (Supabase, cart, products).
- **Ingestion** of partner-built themes: today = merge their code or copy bundle into `components/themes/`; future = load **versioned bundle** from storage/CDN.

### Phased rollout (recommended)

1. **Phase A — Publishable contract (low risk)**  
   Extract or duplicate **`ThemeDefinition` types + section builder patterns** into a public **`@pixeo/theme-types`** package (or git submodule). Document “host version X uses types `^1.y`.” Partners install from npm; Pixeo pins the same version in the host.

2. **Phase B — Starter template repo**  
   Public (or licensed) repo: **Core storefront UI** + Tailwind + **mock data** + README “how to add a section + schema.” Dev workflow: **Vite** for fast HMR; **no** requirement to run the full Next app.

3. **Phase C — CLI**  
   `pixeo dev` / `build` / `validate` wrapping Vite and static checks. Output matches §3 `dist/` so the host can adopt **remote bundles** later.

4. **Phase D — Registry & push**  
   Authenticated `pixeo push`, theme listing, semver, signing—full **Shopify Theme Store**-style pipeline.

### Relationship to the current codebase

- **Today:** themes live **inside** Next.js; bundler is **Next**, not Vite (see repo `package.json`).
- **SDK world:** partners work in the **starter + CLI** repo with **Vite** for dev/build of the **theme artifact**; the **host** remains Next and either **imports** partner React code (monorepo/git dep) or **loads** the compiled bundle when Phase D exists.

### Success criteria

- A developer who has **never** cloned the full PixeoCommerce app can **build a new theme** using only the SDK + starter, then deliver an artifact Pixeo can **register and assign** to a store.
- Pixeo can **version Core** in the starter and **changelog** breaking schema changes (`ThemeDefinition.version`).

---

## 3. The Build Output Format (Dist Structure)
Themes are developed in React/Tailwind but distributed as a compiled `.pixeo` (ZIP) bundle.

### `/dist` Directory Structure:
- **`manifest.json`**: The registry manifest. Lists all available sections, their handles, and entry points.
- **`schema.json`**: The configuration schema. Defines the inputs (colors, fonts, toggles) for the Admin Customizer.
- **`bundle.js`**: The compiled JavaScript/React logic (CJS/ESM hybrid for runtime compatibility).
- **`bundle.css`**: The compiled Tailwind/CSS styles (pre-scoped to avoid clashing with the dashboard).
- **`/assets/`**: Images, fonts, and icons used by the theme.

---

## 4. The Theme Runtime Model
The platform never executes raw source code. It uses a **Theme Runtime Layer**.

### Runtime Execution:
1. **The Loader**: Fetches the `bundle.js` and `manifest.json` for the active version.
2. **Injection**: Safely injects the theme into the storefront page without granting access to internal platform globals.
3. **The Scenery Engine**:
   - Loops through the Store's homepage template.
   - For each section, it calls the corresponding component from the theme bundle.
   - Passes a standard `PixeoContext` (Data + Merged Settings).
4. **Sandboxing**: Previews in the Admin Dashboard are wrapped in a **Sandboxed Iframe** to isolate the Merchant UI from the Theme Code.

---

## 5. Formal SDK API (The Contract)
The `pixeo-sdk` provides the primitives that every theme must use.

### `defineTheme(config)`
Registers the theme metadata.
```typescript
export default defineTheme({
  name: "Milo Premium",
  version: "1.1.0",
  sections: ["HeroSection", "ProductGrid"]
});
```

### `defineSection(schema, component)`
Declares a modular section with its own settings.
```typescript
export const HeroSection = defineSection({
  label: "Hero Banner",
  settings: [{ id: "title", type: "text", label: "Heading" }]
}, ({ settings, store }) => {
  return <section>...</section>;
});
```

### `useAsset(filename)`
The **only** approved way to reference local theme assets.
```typescript
const logoUrl = useAsset('logo.png'); // Returns a storage/CDN URL
```

---

## 6. Asset Handling System
- **Pipeline**: Upon `push`, the CLI bundles assets into the ZIP. The platform extracts them and pushes them to a **Global CDN** path.
- **References**: The `useAsset` hook handles the mapping between local file names and production CDN URLs based on the theme version.

---

## 7. Store Override & Merging Layer
Merchant customization works via a robust, schema-driven multi-layer merge strategy. This ensures that themes can receive updates without breaking individual store customizations.

### 7.1. The 3-Layer Merge Pipeline
Every section rendered in a Pixeo storefront is the result of a pure merge function (`mergeSectionData`):
1.  **Layer 1: Schema Defaults**: hardcoded fallbacks defined in the theme's `ThemeDefinition`.
2.  **Layer 2: Stored Config**: The per-store overrides saved in `store_theme_configs.theme_settings`.
3.  **Layer 3: Resolution**: The `mergeThemeConfigWithDefaults()` utility merges layers, filling gaps with schema defaults.

**Merge Rule**: The engine iterates over **Schema fields only**. If a store has a stored value for a field that was removed from the theme schema, it is ignored at runtime (Schema Change Safety).

### 7.2. Persistence Architecture
Theme configs are stored in `store_theme_configs.theme_settings` (JSONB) with this shape:
```json
{
  "themeCode": "glowing",
  "version": 2,
  "tokens": {
    "background": "#F5F1EB",
    "text": "#111111",
    "accent": "#C8B28A"
  },
  "sections": {
    "hero": {
      "enabled": true,
      "overlayHeading": "Glow Naturally",
      "ctaLabel": "Shop Now",
      "ctaLink": "/collections/all"
    },
    "newsletter": {
      "enabled": true,
      "heading": "Good emails",
      "subheading": "Sign up and receive 10% off."
    }
  }
}
```

### 7.3. Resolution Utilities
- `buildDefaultThemeConfig(themeDef)` — Generates a complete config from schema defaults.
- `mergeThemeConfigWithDefaults(themeDef, storedConfig)` — Merges stored overrides over schema defaults.
- `resolveSectionConfig(themeDef, sectionId, storedSections)` — Resolves a single section for storefront use.
- `sanitizeStoredConfig(themeDef, stored)` — Strips stale keys that no longer exist in the current schema version.

### 7.4. Draft & Publish Workflow
The system supports a stateful lifecycle via the `is_draft` column:
- **Published**: The current live state visible to customers.
- **Draft**: (Phase 2) Allows merchants to preview changes in a "Work in Progress" state before going live.


---

## 8. Security & Validation Constraints

### 8.1. Theme Code Security
The `pixeo-cli push` command performs static analysis.

#### Hard Blocks (Push Forbidden):
- **No External Scripts**: `<script src="...">` tags or `document.createElement('script')` are blocked.
- **No Unsafe Execution**: Use of `eval()`, `new Function()`, or `innerHTML` (without sanitization) is blocked.
- **Restricted API**: Themes cannot access `window.localStorage`, `cookies`, or the platform's internal API keys.
- **Data Privacy**: Themes can only access data provided via the authorized `Store` and `Product` interfaces.
- **Resource Limits**: Themes cannot perform heavy computational tasks or large unoptimized loops during rendering.

### 8.2. Admin API Validation (Backend Schema Enforcement)
The PUT route (`/api/admin/stores/[id]/theme-config`) validates all incoming data against the active theme schema using `validateThemeConfig()`.

**What is validated:**
- Unknown section keys are rejected
- Unknown field keys within sections are rejected
- Field type enforcement: text must be string, number must be numeric, boolean must be boolean, etc.
- Required fields are enforced
- Select field values are checked against allowed options
- URL/image fields are validated for safe URL patterns (`/…` or `https://…`)
- Color fields are validated for hex format (`#RGB`, `#RRGGBB`, `#RRGGBBAA`)
- Number fields are checked against `min`/`max` constraints
- String fields are checked against `minLength`/`maxLength`
- Repeater fields are validated recursively (item count, item field types)
- Unknown tokens are rejected
- Sanitized data (with invalid keys stripped) is what gets saved

**Validation is reusable**: `lib/themes/validateThemeConfig.ts` exports:
- `validateThemeConfig(themeDef, payload)` — Full validation with error list
- `getAllowedFieldPaths(themeDef)` — All valid dot-paths for debugging
- `sanitizeStoredConfig(themeDef, stored)` — Strip stale/invalid keys

---

## 9. Fallback & Error Handling
- **Section Isolation**: If a specific section crashes (Runtime Error), the **Scenery Engine** catches it, logs it, and renders a "Section Unavailable" placeholder instead of crashing the entire storefront.
- **Version Compatibility**: If a store uses an old version of a theme that is missing a newly required SDK field, the platform provides a "Safe Default".
- **Default Resolution**: Missing fields never break the admin editor or storefront because `mergeThemeConfigWithDefaults()` always fills gaps with schema defaults.

---

## 10. Environments: Preview vs Production
1. **Local Sandbox**: Developer running `pixeo dev`. Uses local files and live API data.
2. **Platform Preview (Staging)**: A unique URL generated per theme version (e.g., `preview.pixeo.com/[version_id]`). Used for QA before publishing.
3. **Published (Production)**: The version assigned to a live store. Cached and optimized for edge delivery.

---

## 11. The Developer Workflow (Standardized)
1. **Standardized Bundling**: The `pixeo-cli` is powered by **Vite** for the fastest possible development and production builds.
2. **Package & Push**: `pixeo build` -> `pixeo push --version 1.1.2`.
3. **Validation**: Automated security check runs on the Pixeo servers.
4. **Registry Update**: The theme version appears in the Admin Dashboard for assignment.

---

## 12. Standard Theme Features (Mandatory)
To ensure feature parity across all storefronts, every theme MUST implement the following global logic patterns.

### A. The Universal Footer Pattern
The footer must dynamically render merchant branding and social links from the core `stores` table.

**Data Requirements:**
- `footer_headline`: Custom SEO/Branding title.
- `footer_description`: Long-form brand story or details.
- `social_links`: A JSON object containing URLs for Instagram, Facebook, X, etc.

**Recommended Implementation:**
```tsx
const socialPlatforms = ['instagram', 'facebook', 'youtube', 'tiktok', 'x'];

{store.social_links && (
  <div className="social-grid">
    {socialPlatforms.map(platform => {
      const url = store.social_links[platform];
      return url ? <a href={url} key={platform}><Icon name={platform} /></a> : null;
    })}
  </div>
)}
```

### B. The Discount & Promotion System
Themes must interface with the `useCart` hook and the platform validation API to support real-time price reductions.

**The Validation Workflow:**
1.  Capture user input (the coupon code).
2.  Call `applyDiscount(code, storeId)` from the `useCart` hook.
3.  Display visual feedback (Success/Error).
4.  Render the `total` (discounted) vs the `subtotal` (original).

**Integration Sample:**
```tsx
const { applyDiscount, discount, subtotal, total } = useCart();

const handleApply = async () => {
  const result = await applyDiscount(inputCode, store.id);
  if (!result.success) setError(result.message);
};

return (
  <div>
    <p>Subtotal: {subtotal}</p>
    {discount && <p className="success">Discount: -{subtotal - total}</p>}
    <p className="total">Total: {total}</p>
  </div>
);
```

### C. Boilerplate & Rapid Development
The **Core Theme** (located in `components/themes/core/`) is the official **Boilerplate** for the PixeoCommerce ecosystem. To create a new theme instantly:

1.  **Duplicate the Shell**: Copy `CoreLayout.tsx`. You can completely redesign the CSS/HTML for the Header, Cart Drawer, and Footer, but keep the structure.
2.  **Maintain the Context**: Preserve all `useCart` hook calls. This ensures your new theme's cart UI still supports real-time quantity updates, removals, and discount validation logic without any extra work.
3.  **Standardized Branding**: Use the provided logic for `footer_headline`, `footer_description`, and `social_links`. This ensures your new theme instantly populates the merchant's brand identity details upon activation.

**Key URL:** `/api/store/[store_id]/validate-discount?code=[CODE]`
*(Note: Every theme must pass the UUID `storeId` to the cart drawer to enable this feature.)*

---

## 13. New Project Initialization (Portable Workflow)
To start a new theme project using the **Core Boilerplate** while staying connected to your live database:

1.  **Dependencies**: Copy the `lib/supabase/` folder to your new project. This contains the essential server/client logic for data fetching.
2.  **Authentication**: Ensure your `.env.local` file contains the correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3.  **Local Subdomain Workflow**: Run `npm run dev` and access your store via `[subdomain].localhost:3000`. The system will automatically resolve the Store UUID and load the correct data instantly.

---

## 14. Implementation Guide: Store-Editable Sections
To add a new editable section type to the PixeoCommerce ecosystem, follow this 3-step synchronization pattern.

### Step 1: Register in the Schema Registry
Add the section definition to `lib/themes/sectionSchemas.ts`. This drives the Admin UI form generation and the merge engine.

```typescript
// example: adding a "ServicesGrid" section
{
  id: "services_grid",
  label: "Services Grid",
  description: "Display your core services in a clean grid layout",
  fields: [
    { id: "title", type: "text", label: "Section Title", default: "Our Services" },
    { id: "columns", type: "number", label: "Grid Columns", default: 3, min: 2, max: 4 },
    { id: "showIcons", type: "boolean", label: "Show Service Icons", default: true }
  ]
}
```

### Step 2: Create/Update the Section Component
Create the React component that consumes the data. **Always destructure from the `section` prop**, which will contain the merged "Theme + Store Override" data.

```tsx
// components/themes/sections/ServicesGrid.tsx
export default function ServicesGrid({ section, settings, className }) {
  const { title, columns, showIcons } = section;
  
  return (
    <section className={className}>
      <h2>{title}</h2>
      <div className={`grid grid-cols-${columns}`}>
        {/* ... */}
      </div>
    </section>
  );
}
```

### Step 3: Wire into the SectionRenderer
Update the "switchboard" in `components/themes/sections/SectionRenderer.tsx` to handle the new type.

```tsx
// Inside switch (effectiveSection.type)
case "services_grid":
  return (
    <ServicesGrid
      section={effectiveSection}
      settings={settings}
      className={sectionClassName}
    />
  );
```

### Critical Rules for Section Developers:
1.  **No Direct DB Access**: Sections must never fetch their own data. They receive everything via props.
2.  **Schema-Driven Only**: Only fields defined in the schema will be available in the `section` prop. Unregistered properties are filtered out for security.
3.  **Default Handling**: Always provide sensible defaults in the schema so the theme looks good even before a merchant customizes it.

---

## 15. Global Design Tokens & Dynamic Theming

To ensure every store feels unique while using a shared theme, V2 implements a **Design Token System** powered by CSS Custom Properties (Variables).

### 15.1. Tokenized Architecture
Themes must not use hardcoded hex values for primary branding. Instead, they must reference "Pixeo Tokens":
- `--pixeo-primary`: The main brand color.
- `--pixeo-accent`: Highlights, buttons, and call-to-actions.
- `--pixeo-background`: The primary page background.
- `--pixeo-surface`: Cards, modals, and secondary backgrounds.
- `--pixeo-text-primary`: Main body copy color.
- `--pixeo-heading-font`: The font family used for titles.

### 15.2. Style Injection Engine
The platform runtime automatically generates a dynamic `<style>` block at the head of every storefront page. This block maps the Merchant's saved settings to the theme's expected tokens.

```tsx
// Platform Logic (Internal)
const DynamicStyles = ({ settings }) => (
  <style id="pixeo-theme-variables">{`
    :root {
      --pixeo-primary: ${settings.primary_color || '#000'};
      --pixeo-accent: ${settings.accent_color || '#555'};
      --font-heading: "${settings.heading_font || 'Inter'}";
    }
  `}</style>
);
```

### 15.3. Tailwind CSS Integration
For future complex themes, the SDK requires Tailwind configuration to map utility classes to These variables:
```javascript
// Theme tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--pixeo-primary)',
        accent: 'var(--pixeo-accent)',
      }
    }
  }
}
```

---

## 16. Admin Customizer & Settings Schema

Customization is driven by the theme's `ThemeDefinition` TypeScript schema. This allows the Admin Dashboard to render a tailored UI for every theme automatically.

### 16.1. Schema Definition
The schema defines the "Knobs and Dials" available to the admin. See Section 17 for the full TypeScript reference.

### 16.2. The Dynamic Customizer UI
1. **Introspection**: The Admin Dashboard reads the theme's schema from the registry.
2. **Generation**: It loops through tokens and section fields, rendering the appropriate inputs (color pickers, text fields, toggles, selects, repeaters).
3. **Persistence**: When the admin clicks "Save", the values are validated server-side and stored in `store_theme_configs.theme_settings` JSONB column.
4. **Validation**: The API rejects unknown keys, enforces types, validates required fields, and sanitizes data before saving.

---

## 17. Schema-Driven Theme Definition Reference (V2 Field Editor)

This section is the **complete reference** for building new themes using the schema-driven field editor system. Use this to create themes rapidly with AI or manually.

### 17.1. File Structure

```
lib/themes/
├── types.ts                  # All TypeScript interfaces
├── registry.ts               # Central theme registry
├── sectionBuilders.ts        # Reusable section schema builders
├── validateThemeConfig.ts    # Backend validation utility
├── resolveThemeConfig.ts     # Default resolution & merge utility
└── definitions/
    ├── core.ts               # Core theme schema
    ├── glowing.ts            # Glowing theme schema
    └── <new-theme>.ts        # Add new themes here
```

### 17.2. ThemeDefinition Interface

Every theme must export a `ThemeDefinition` object:

```typescript
interface ThemeDefinition {
  code: string;           // Unique identifier, e.g. "glowing", "minimal", "luxe"
  name: string;           // Display name, e.g. "Glowing Skincare"
  version: number;        // Schema version. Increment when fields change.
  description?: string;   // Short description shown in admin UI
  thumbnail?: string;     // Optional preview image URL
  minPlan?: string;       // Required plan tier, e.g. "Premium Store"
  editableTokens?: ThemeTokenDefinition[];      // Global design variables
  editableSections: ThemeSectionDefinition[];    // Page sections with fields
}
```

### 17.3. Available Field Types

| Type | Value stored as | Admin UI | Validation |
|------|----------------|----------|------------|
| `text` | `string` | Single-line text input | `minLength`, `maxLength` |
| `textarea` | `string` | Multi-line text area | `minLength`, `maxLength` |
| `richtext` | `string` | Multi-line text area (future: rich editor) | `minLength`, `maxLength` |
| `image` | `string` (URL) | URL input | Must start with `/` or `http` |
| `url` | `string` (URL) | URL input | Must start with `/` or `http` |
| `boolean` | `boolean` | Toggle switch | Must be `true`/`false` |
| `number` | `number` | Numeric input | `min`, `max`, `step` |
| `select` | `string` | Dropdown | Value must be in `options[]` |
| `color` | `string` (hex) | Color picker + hex input | Must match `#RGB`/`#RRGGBB`/`#RRGGBBAA` |
| `repeater` | `Array<Record<string, unknown>>` | List of item groups with add/remove | `maxItems`, each item validated recursively via `itemFields` |

### 17.4. ThemeFieldDefinition Interface

```typescript
interface ThemeFieldDefinition {
  key: string;            // Unique key within the section, e.g. "heading"
  label: string;          // Display label in admin, e.g. "Section Heading"
  type: ThemeFieldType;   // One of the types above
  required?: boolean;     // If true, API rejects empty/missing values
  defaultValue?: unknown; // Default value used when store has no override
  placeholder?: string;   // Placeholder text for text inputs
  helpText?: string;      // Small description shown below the field

  // Select-specific
  options?: { label: string; value: string }[];

  // Text/textarea validation
  maxLength?: number;
  minLength?: number;

  // Number validation
  min?: number;
  max?: number;
  step?: number;

  // Repeater-specific
  itemFields?: ThemeFieldDefinition[];   // Shape of each item
  maxItems?: number;                     // Max number of items
}
```

### 17.5. ThemeTokenDefinition Interface

```typescript
interface ThemeTokenDefinition {
  key: string;               // e.g. "primaryColor"
  label: string;             // e.g. "Primary Color"
  type: "color" | "text" | "font";
  defaultValue?: string;
  helpText?: string;
}
```

### 17.6. ThemeSectionDefinition Interface

```typescript
interface ThemeSectionDefinition {
  id: string;                // Unique section ID, e.g. "hero"
  type: string;              // Section type for the renderer, e.g. "hero"
  label: string;             // Display label, e.g. "Hero Banner"
  description?: string;      // Description shown in admin
  fields: ThemeFieldDefinition[];
  supportsToggle?: boolean;  // Show enable/disable toggle (default: true)
  defaultEnabled?: boolean;  // Default enabled state (default: true)
}
```

### 17.7. Section Enabled/Disabled System

Every section can be toggled on or off:
- If `supportsToggle` is `true` (default), the admin editor shows an Enable/Disable switch
- The `enabled` boolean is stored in the section's config: `sections.hero.enabled = true`
- The storefront renderer should check `sectionConfig.enabled` before rendering
- Sections with `supportsToggle: false` (like header/footer) are always shown

### 17.8. Repeater Fields

Repeater fields store arrays of structured items. Use them instead of `feature1Title`, `feature2Title` patterns.

**Schema example:**
```typescript
{
  key: "tiles",
  label: "Promo Tiles",
  type: "repeater",
  maxItems: 6,
  defaultValue: [
    { image: "", title: "Collection 1", buttonLabel: "Shop Now", buttonLink: "/collections/all" },
    { image: "", title: "Collection 2", buttonLabel: "Shop Now", buttonLink: "/collections/all" },
  ],
  itemFields: [
    { key: "image", label: "Tile Image", type: "image" },
    { key: "title", label: "Title", type: "text" },
    { key: "buttonLabel", label: "Button Label", type: "text" },
    { key: "buttonLink", label: "Button Link", type: "url" },
  ],
}
```

**Stored value:**
```json
{
  "tiles": [
    { "image": "/uploads/tile1.jpg", "title": "Summer Collection", "buttonLabel": "Shop Now", "buttonLink": "/collections/summer" },
    { "image": "/uploads/tile2.jpg", "title": "New Arrivals", "buttonLabel": "Explore", "buttonLink": "/collections/new" }
  ]
}
```

### 17.9. Reusable Section Builders

`lib/themes/sectionBuilders.ts` provides builder functions that return `ThemeSectionDefinition` objects. These reduce duplication across themes.

| Builder | Section ID | Description |
|---------|-----------|-------------|
| `createAnnouncementBarSection(opts)` | `announcement_bar` | Top-of-page promo strip |
| `createHeaderSection(opts)` | `header` | Logo, nav links, sticky toggle |
| `createHeroSection(opts)` | `hero` | Full-width hero with overlay text |
| `createBrandStatementSection(opts)` | `brand_statement` | Centered quote/tagline |
| `createServiceFeaturesSection(opts)` | `service_features` | Icon grid of selling points (repeater) |
| `createLogoCloudSection(opts)` | `logo_cloud` | Press/brand logo row (repeater) |
| `createPromoTilesSection(opts)` | `collection_promo` | Side-by-side promo cards (repeater) |
| `createFeaturedProductsSection(opts)` | `featured_products` | Product grid with heading |
| `createNewsletterSection(opts)` | `newsletter` | Email signup section |
| `createSocialGallerySection(opts)` | `social_gallery` | Instagram-style image grid |
| `createFooterSection(opts)` | `footer` | Brand info, links, legal |

**All builders accept:**
- Theme-specific default overrides (e.g. `defaultHeading`, `defaultBg`)
- `extraFields?: ThemeFieldDefinition[]` — Append additional fields unique to this theme
- `description?: string` — Override the default description
- `supportsToggle?: boolean` — Override toggle behavior
- `defaultEnabled?: boolean` — Override default enabled state

**Usage in a theme definition:**
```typescript
import { createHeroSection, createNewsletterSection } from "@/lib/themes/sectionBuilders";

export const myTheme: ThemeDefinition = {
  code: "mytheme",
  name: "My Theme",
  version: 1,
  editableSections: [
    createHeroSection({ defaultCtaLabel: "Discover" }),
    createNewsletterSection({ defaultHeading: "Join the club" }),
  ],
};
```

### 17.10. Product Sections Must Be Editor-Driven (Not Hardcoded)

For sections like **Featured Products** / **Latest Products**, selection logic should be configured in the schema editor, not hardcoded in theme components.

**Why:** merchants in Pixeo mostly add products; admins should control merchandising behavior per store without code changes.

**Required pattern for product sections:**
- `sourceType` (`latest` | `category` | `manual`)
- `categoryId` (used by `category`, optional filter for `manual`)
- `productIds` (manual product picks, ordered)
- `sortBy` (`newest`, `oldest`, `price_asc`, `price_desc`, `name_asc`)
- `limit`

**Implementation rule:**
- Theme component renders from resolved section config.
- Storefront resolver applies source/filter/sort/limit based on saved section values.
- Theme file only defines defaults/fallbacks; business behavior is editor-configurable.

### 17.11. Editor UX Rule for Product Picking

To keep the editor clean and non-confusing:
- Show `categoryId` only when source is `category` or `manual`.
- Show `productIds` only when source is `manual`.
- When `categoryId` is selected in manual mode, product picker should list products from that category first (or only, depending on UX choice).
- Preserve manual selection order in saved config.

---

## 18. How to Create a New Theme (Step-by-Step for AI & Developers)

This is the **Shopify-like path** for Pixeo: you are not inventing commerce from zero—you are **shipping a new theme** on top of the platform runtime. The fastest approach for humans or AI is to **copy Core** (`lib/themes/definitions/core.ts` + `components/themes/core/`), rename and restyle, adjust the `ThemeDefinition` (tokens and sections), then register. That mirrors forking **Dawn** to make a custom Shopify theme: same platform APIs, new look and optional new sections.

### Step 1: Create the schema definition file

Create `lib/themes/definitions/<name>.ts`:

```typescript
import type { ThemeDefinition } from "../types";
import {
  createHeaderSection,
  createHeroSection,
  createFeaturedProductsSection,
  createNewsletterSection,
  createFooterSection,
} from "../sectionBuilders";

export const myNewTheme: ThemeDefinition = {
  code: "my-theme",     // lowercase, kebab-case
  name: "My New Theme",
  version: 1,
  description: "A brief description of the theme's aesthetic.",
  minPlan: "Pro",        // optional

  editableTokens: [
    { key: "primaryColor", label: "Primary Color", type: "color", defaultValue: "#000000" },
    { key: "accentColor", label: "Accent Color", type: "color", defaultValue: "#FF6600" },
    { key: "backgroundColor", label: "Background", type: "color", defaultValue: "#FFFFFF" },
    { key: "headingFont", label: "Heading Font", type: "font", defaultValue: "Playfair Display" },
    { key: "bodyFont", label: "Body Font", type: "font", defaultValue: "Inter" },
  ],

  editableSections: [
    createHeaderSection({ defaultLogoText: "MY BRAND" }),
    createHeroSection({ defaultCtaLabel: "Shop Now" }),
    createFeaturedProductsSection({ defaultHeading: "Trending Now" }),
    createNewsletterSection({ defaultHeading: "Stay Connected" }),
    createFooterSection({ defaultBrandName: "MY BRAND" }),
  ],
};
```

### Step 2: Register in the theme registry

Edit `lib/themes/registry.ts`:

```typescript
import { myNewTheme } from "./definitions/my-theme";

const THEME_REGISTRY: Record<string, ThemeDefinition> = {
  [coreTheme.code]: coreTheme,
  [glowingTheme.code]: glowingTheme,
  [myNewTheme.code]: myNewTheme,    // <-- add here
};
```

### Step 3: Create the visual theme components

Create the React layout and section components in `components/themes/<name>/`. Each component receives resolved config via props.

### Step 4: Wire into ThemeRenderer

Add a case for the new theme code in the ThemeRenderer switch.

### Step 5: Test

1. Go to Admin > Stores > [Store] > Theme Editor
2. Switch to the new theme
3. Verify all sections and fields render correctly
4. Save and check that validation passes
5. View the storefront to confirm rendering

---

## 19. Existing Theme Schemas

### 19.1. Core Theme (`core`)
- **Version**: 2
- **Plan**: None (default for all stores)
- **Tokens**: primaryColor, accentColor, backgroundColor, headingFont, bodyFont
- **Sections**: header, featured_products, footer

### 19.2. Glowing Skincare Theme (`glowing`)
- **Version**: 2
- **Plan**: Premium Store
- **Tokens**: background, surface, text, accent, headingFont, bodyFont
- **Sections**: announcement_bar, header, hero, brand_statement, service_features, logo_cloud, collection_promo, featured_products, newsletter, social_gallery, footer

---

## 20. Permissions Model

| Role | Can view themes | Can switch theme | Can edit theme fields | Can save config |
|------|----------------|-----------------|----------------------|-----------------|
| Admin | Yes | Yes | Yes | Yes |
| Merchant | Yes (read-only) | No | No | No |

- **Backend enforcement**: API route checks `profiles.is_admin` before allowing PUT operations
- **Frontend enforcement**: Merchant dashboard shows view-only theme page with info banner

---

## 21. Data Migration Notes

When upgrading a theme's schema version:
- Old stored configs are automatically sanitized via `sanitizeStoredConfig()` — stale keys are stripped
- Missing new fields are filled via `mergeThemeConfigWithDefaults()` — no manual migration needed
- Increment the theme's `version` number in the definition file
- Existing stores will see new fields with their defaults on next load

---

## 22. Config Storage Shape (TypeScript)

```typescript
interface ThemeConfigData {
  themeCode: string;
  version: number;
  tokens: Record<string, unknown>;
  sections: Record<string, ThemeSectionConfigData>;
}

interface ThemeSectionConfigData {
  enabled?: boolean;
  [fieldKey: string]: unknown;
}

interface ResolvedThemeConfig {
  themeCode: string;
  version: number;
  tokens: Record<string, unknown>;
  sections: Record<string, ResolvedSectionConfig>;
}

interface ResolvedSectionConfig {
  enabled: boolean;
  [fieldKey: string]: unknown;
}
```
