# Pixeocommerce Theme Ingestion Playbook (Official Workflow)

This is the official internal workflow for moving from manual theme registration to real package ingestion.

---

## 1) End-State Workflow

1. Build theme locally with Theme SDK
2. Export package as `.zip`
3. Upload `.zip` in Admin > Templates > Register Theme > Theme Bundle
4. Platform extracts + validates package
5. Platform uploads bundle/assets to storage
6. Platform auto-populates metadata/schema/blueprint fields
7. Finalize & Register writes theme registry record + version record
8. Assign theme to store
9. Admin editor auto-generates fields from schema for store-specific overrides
10. Storefront renders resolved config

---

## 2) Theme Package Contract (v1.0)

Required files in zip root:
- `theme.json` (identity + metadata)
- `schema.json` (editable tokens + sections + fields)
- `bundle.js` (compiled runtime)
- `bundle.css` (compiled styles)

Optional files:
- `blueprint.json` (fixed layout / section order / instances)
- `assets/**` (fonts/images/icons/etc)
- `preview.png` or `preview.jpg` or `preview.jpeg` or `preview.webp`

### 2.1 `theme.json` required fields
- `name`
- `themeCode` (lowercase kebab-case)
- `version` (semver x.y.z)

Optional:
- `description`
- `category`
- `repositoryUrl`
- `documentationUrl`
- `previewUrl`
- `minPlan`
- `requiredPlans`
- `systemInternalOnly`

### 2.2 `schema.json` contract
- `editableTokens[]`
- `editableSections[]` (at least one)
- supported field types:
  - `text`, `textarea`, `richtext`, `font`
  - `image`, `url`
  - `boolean`, `number`, `select`, `color`
  - `category`, `product_multi`
  - `repeater`

### 2.3 `blueprint.json` (optional)
- `layoutMode`: `fixed` or `flex`
- `sectionOrder[]`
- `sectionInstances[]` (optional)

---

## 3) Admin Upload Workflow

Admin page: `app/admin/templates/page.tsx`

### 3.1 Upload behavior
- choose `.zip` in Theme Bundle tab
- client sends file to `POST /api/admin/templates/ingest`
- response returns:
  - parsed metadata
  - parsed schema
  - parsed blueprint (if present)
  - uploaded `bundleUrl`, `styleUrl`, `previewUrl`, `assetUrls`
  - `packageHash`
  - file manifest list

### 3.2 Auto-detected fields
On success, form auto-populates:
- `name`
- `theme_code`
- `version`
- `description`
- `category`
- `repository_url`
- `documentation_url`
- `bundle_url`
- `style_url`
- `thumbnail_url` (from package preview)
- `config_schema_json` (from schema)
- `blueprint_json`
- `package_manifest_json`
- `source_type = zip_upload`
- `package_status = validated`

### 3.3 Finalize and Register
- `headless_templates` row is inserted/updated
- if `source_type=zip_upload` and `packageHash` exists, a row is upserted in `headless_template_versions`
- `headless_templates.current_version_id` is updated to linked version row

---

## 4) Ingestion API Architecture

Route: `app/api/admin/templates/ingest/route.ts`

### Security and safety rules
- admin-only access
- `.zip` required
- max zip size: 20MB
- max files in zip: 300
- max single file size: 10MB
- block path traversal (`../`) entries
- never execute uploaded code

### Processing pipeline
1. Validate zip envelope and file count/size
2. Validate required files
3. Parse `theme.json` / `schema.json` / optional `blueprint.json`
4. Validate contract with zod schemas (`lib/themes/packageContract.ts`)
5. Upload artifacts to `template-assets` using path:
   - `theme-packages/{themeCode}/{version}/bundle.js`
   - `theme-packages/{themeCode}/{version}/bundle.css`
   - `theme-packages/{themeCode}/{version}/assets/...`
   - `theme-packages/{themeCode}/{version}/preview.*`
6. Return parsed payload + storage URLs

---

## 5) Database Model and Versioning

### 5.1 Registry table (current pointer)
`headless_templates` stores current active record:
- identity, metadata, schema pointer fields
- ingestion fields:
  - `current_version_id`
  - `package_status`
  - `source_type`
  - `package_manifest`
  - `blueprint`

### 5.2 Immutable version table
`headless_template_versions` stores versioned package snapshots:
- `theme_code`
- `version`
- `package_hash`
- `source_type`
- `package_manifest`
- `schema_json`
- `blueprint_json`
- artifact URLs
- `status` (`draft|validated|published|archived`)

### 5.3 Migration
Apply:
- `sql/migrations/028_theme_ingestion_pipeline.sql`

---

## 6) Store Editing Workflow (Auto-Detected Schema)

After theme upload + registration:
1. Store uses `theme_code`
2. Theme editor loads schema from registered theme
3. Editor auto-renders:
   - global tokens
   - section fields
   - dynamic inputs (`category`, `product_multi`)
4. Save writes store-specific config in `store_theme_configs.theme_settings`
5. Storefront resolves config + defaults and renders live

Result: uploaded themes can “just work” with auto-detected editable fields.

---

## 7) Validation Failure Rules

Upload fails when:
- missing required files
- invalid semver
- invalid `themeCode`
- schema shape invalid
- unsupported field types
- zip/file size limits exceeded
- path traversal or unsafe entry names

Failure behavior:
- no code execution
- no partial theme registration
- admin sees explicit error and can retry

---

## 8) Future-Proofing Requirements

### 8.1 Theme versioning
- published versions must be immutable
- new upload for same code should produce a new version row

### 8.2 Re-upload existing theme code
- same `theme_code` + new semver => new version
- same package hash => duplicate detection

### 8.3 Draft vs published versions
- ingest as `validated`/`draft`
- publish action should explicitly promote version

### 8.4 Rollback safety
- assign store to previous `current_version_id`
- keep store overrides isolated from package immutability

### 8.5 Asset collisions
- storage path includes `{themeCode}/{version}` to prevent collisions

### 8.6 Backward compatibility
- manual entries remain supported (`source_type=manual`)
- UI keeps manual fallback fields during migration period

### 8.7 Section override compatibility
- future section override tables must key by:
  - `store_id`
  - `theme_code`
  - version/section identity as needed

---

## 9) Files Changed in This Upgrade

### Created
- `lib/themes/packageContract.ts`
- `app/api/admin/templates/ingest/route.ts`
- `sql/migrations/028_theme_ingestion_pipeline.sql`
- `playbook.md`

### Updated
- `app/admin/templates/page.tsx`
- `types/database.ts`
- `package.json` (added `adm-zip`)

---

## 10) Operational Notes

- Run DB migration `028_theme_ingestion_pipeline.sql` before using zip ingestion in production.
- Existing template rows continue to function.
- Zip ingestion is now the preferred path; manual JSON/URL fields remain as fallback during transition.
