# Specification: Admin Theme Customizer (Dynamic Settings)

## 1. Overview
The Admin Theme Customizer is a dynamic UI engine that allows merchants to modify their store's appearance without touching code. Unlike the "Core Theme" which has hardcoded settings, V2 themes provide a `settings_schema.json` that the dashboard uses to generate the customization form.

## 2. Core Architecture

### 2.1. The Schema-to-Form Pipeline
1. **Fetch Schema**: The dashboard retrieves the `settings_schema.json` from the active theme version.
2. **Form Generation**: A recursive component (`ThemeSettingsForm`) loops through the schema's `sections` and `fields`.
3. **State Management**: Uses `react-hook-form` to track changes.
4. **Debounced Preview**: As the merchant changes a value (e.g., sliding a color picker), the dashboard sends a `postMessage` to the Live Preview Iframe.

### 2.2. Database Persistence
Settings are stored in the `store_theme_configs` table under the `theme_settings` column (JSONB).
- **Structure**: `{ "primary_color": "#FF5500", "heading_font": "Inter", ... }`

---

## 3. UI Component Requirements

### 3.1. The Customizer Sidebar
- **Grouped Sections**: Accordion-style layout for groups (e.g., "Colors", "Typography").
- **Field Types**:
  - `color`: High-end Hex/HSL picker with presets.
  - `font_picker`: Searchable dropdown using Google Fonts API.
  - `text` / `textarea`: For custom labels or footer text.
  - `number`: Sliders/inputs for spacing and border-radii.
  - `image_picker`: Interface to the Supabase storage bucket.

### 3.2. Live Preview Iframe
- **Target**: Renders `https://[subdomain].pixeocommerce.com?preview=true`.
- **Communication Layer**:
  - **Sender (Dashboard)**: `iframe.contentWindow.postMessage({ type: 'UPDATE_TOKENS', settings }, '*')`
  - **Receiver (Storefront)**: A global listener in `CoreLayout.tsx` that updates the style tag dynamically.

---

## 4. Technical Implementation Steps

### Phase 1: The Schema Parser
Create a utility `renderSettingField(field: SettingField)` that returns the appropriate React component.

```tsx
function renderSettingField(field) {
  switch (field.type) {
    case 'color': return <ColorPicker key={field.id} label={field.label} />;
    case 'font_picker': return <FontSelector key={field.id} label={field.label} />;
    // ...
  }
}
```

### Phase 2: PostMessage Bridge
Implement a custom hook `useThemePreview(settings)` that debounces the settings state and pushes it to the iframe.

### Phase 3: Supabase Sync
Update the `app/admin/stores/[id]/page.tsx` to handle the `theme_settings` JSONB update.

---

## 5. Security & Validation
- **JSON Validation**: Ensure the incoming settings match the schema's value types (e.g., no code injection in color strings).
- **Fallback Recovery**: If a merchant enters an invalid value, the platform should revert to the theme's `default` value from the schema.

## 6. UX Aesthetic
- **Premium Feel**: Use subtle transitions when opening groups.
- **Visual Feedback**: The preview should feel "alive"—colors should change instantly via CSS variables without a page reload.
