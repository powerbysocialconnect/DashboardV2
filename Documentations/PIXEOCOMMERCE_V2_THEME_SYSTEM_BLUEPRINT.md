# PixeoCommerce V2 Theme System: The Global Blueprint (V2.1)

This document defines the production-grade architecture for a **Code-First** theme ecosystem. It moves beyond simple configuration to a professional development lifecycle—ensuring security, performance, and merchant flexibility.

---

## 1. Architectural Philosophy
Themes in V2 are not mere database entries; they are **compiled software packages**.
- **Controlled Execution**: Themes run as controlled bundles within a platform-provided Runtime.
- **Unified Logic**: The same SDK works for internal Pixeo builders and external ecosystem developers.
- **Contract Driven**: The SDK defines the strict interface between Store Data and Scene Rendering.
- **Immutable Versions**: Once a theme version is published, it is never modified. Upgrades are explicit.

---

## 2. Ecosystem Separation (Critical)
The PixeoCommerce ecosystem is split into two distinct repositories to ensure modularity and scalability:
1.  **The Host Platform (This Repo)**: Acts as the **Registry** and **Runtime Host**. It stores theme metadata, handles merchant assignments, and renders the stores.
2.  **The Theme SDK & Starter Template (Separate Repo)**: This is where the actual theme development happens. It contains the CLI, the React base components, and the compilation logic.

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
   - Loops through the Store’s homepage template.
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
1.  **Layer 1: Schema Defaults**: hardcoded fallbacks defined in `lib/themes/sectionSchemas.ts`.
2.  **Layer 2: Theme Section**: The baseline content defined in the theme's `homepage_layout`.
3.  **Layer 3: Store Overrides**: Sparse field-level overrides stored in the `store_section_overrides` database table.

**Merge Rule**: The engine iterates over **Schema fields only**. If a store has an override for a field that was removed from the theme schema, it is ignored at runtime (Schema Change Safety).

### 7.2. Persistence Architecture
Overrides are stored in a dedicated `store_section_overrides` table with the following properties:
- **Sparse Storage**: Only fields modified by the merchant are saved in the `overrides` JSONB column.
- **Theme Scoping**: All overrides are scoped to a `theme_code`. If a store switches themes, their old overrides remain safely dormant and do not collide with the new theme's sections.
- **Instance Identity**: Overrides are matched via `section_type` + `section_index`.

### 7.3. The Schema Registry (Source of Truth)
The platform maintains a central file (`lib/themes/sectionSchemas.ts`) that defines:
- Every editable field (ID, Type, Label).
- Validation rules (MaxLength, FileSize, RecommendedAspectRatio).
- Dynamic Form Grouping for the Admin UI.

### 7.4. Draft & Publish Workflow
The system supports a stateful lifecycle via the `is_draft` column:
- **Published**: The current live state visible to customers.
- **Draft**: (Phase 2) Allows merchants to preview changes in a "Work in Progress" state before going live.


---

## 8. Security & Validation Constraints
The `pixeo-cli push` command performs static analysis.

### Hard Blocks (Push Forbidden):
- **No External Scripts**: `<script src="...">` tags or `document.createElement('script')` are blocked.
- **No Unsafe Execution**: Use of `eval()`, `new Function()`, or `innerHTML` (without sanitization) is blocked.
- **Restricted API**: Themes cannot access `window.localStorage`, `cookies`, or the platform's internal API keys.
- [ ] **Data Privacy**: Themes can only access data provided via the authorized `Store` and `Product` interfaces.
- [ ] **Resource Limits**: Themes cannot perform heavy computational tasks or large unoptimized loops during rendering.

---

## 9. Fallback & Error Handling
- **Section Isolation**: If a specific section crashes (Runtime Error), the **Scenery Engine** catches it, logs it, and renders a "Section Unavailable" placeholder instead of crashing the entire storefront.
- **Version Compatibility**: If a store uses an old version of a theme that is missing a newly required SDK field, the platform provides a "Safe Default".

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
2.  **Schema-Driven Only**: Only fields defined in the `sectionSchemas.ts` will be available in the `section` prop. Unregistered properties are filtered out for security.
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

Customization is driven by a `settings_schema.json` file provided by the theme. This allows the Admin Dashboard to render a tailored UI for every theme.

### 16.1. Schema Definition
The schema defines the "Knobs and Dials" available to the merchant:
```json
{
  "settings": [
    {
      "id": "colors",
      "label": "Branding Colors",
      "type": "group",
      "fields": [
        { "id": "primary_color", "type": "color", "label": "Primary Brand", "default": "#000000" },
        { "id": "accent_color", "type": "color", "label": "Accent / CTA", "default": "#FF3E00" }
      ]
    },
    {
      "id": "typography",
      "label": "Fonts",
      "type": "group",
      "fields": [
        { "id": "heading_font", "type": "font_picker", "label": "Heading Font", "default": "Outfit" }
      ]
    }
  ]
}
```

### 16.2. The Dynamic Customizer UI
1. **Introspection**: The Admin Dashboard reads the theme's schema.
2. **Generation**: It loops through the `fields` and renders the appropriate React Hook Form components (Color Pickers, Font Dropdowns, Image Uploaders).
3. **Persistence**: When the merchant clicks "Save", the values are stored in the `store_theme_configs.theme_settings` JSONB column.
4. **Instant Preview**: Changes are pushed to a hidden iframe running the **Theme Runtime**, updating the CSS Variables in real-time for a "What You See Is What You Get" (WYSIWYG) experience.

