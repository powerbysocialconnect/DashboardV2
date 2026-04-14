
# Pixeocommerce Hybrid Store Platform PRD + Cursor Build Checklist

## 1. Product overview

Pixeocommerce is a multi-tenant ecommerce platform that onboards merchants through a vision form, provisions a store record immediately, and then supports two setup modes:

1. admin-assisted manual build
2. progressively automated build through templates and JSON-driven configuration

The goal is to preserve V1 and V2, avoid breaking existing stores, and add a scalable layer for:
- admin-assisted store setup
- user self-service dashboard
- theme/template configuration
- billing and trial management
- provisioning workflows

## 2. Core constraints

- Do not break V1 or V2.
- Additive changes only at first.
- If new config exists, use it.
- If new config does not exist, fall back to old fields and old rendering logic.
- Migrate store-by-store, not all at once.

## 3. Existing key tables observed

- profiles
- stores
- products
- orders
- order_items
- customers
- customer_addresses
- discounts
- shipping_methods
- templates
- template_categories
- vision_forms
- store_billing_settings
- subscription_events
- store_provisioning_jobs
- store_admin_actions
- magic_link_tokens
- categories
- one_time_purchases
- kit_files
- project_notes
- plan_limits

## 4. New tables to add safely

### 4.1 `store_theme_configs`

Purpose: central theme/config layer for store presentation.

```sql
create table if not exists public.store_theme_configs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  theme_code text not null default 'starter',
  theme_settings jsonb not null default '{}'::jsonb,
  homepage_layout jsonb not null default '[]'::jsonb,
  custom_css text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id)
);
```

### 4.2 `store_status_history`

Purpose: audit store lifecycle.

```sql
create table if not exists public.store_status_history (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  status text not null,
  notes text null,
  changed_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
```

### 4.3 `store_onboarding_tasks`

Purpose: onboarding checklist for admin and merchant.

```sql
create table if not exists public.store_onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  task_key text not null,
  title text not null,
  description text null,
  is_completed boolean not null default false,
  completed_at timestamptz null,
  assigned_to uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id, task_key)
);
```

### 4.4 `store_domains`

Purpose: future-safe custom domain handling.

```sql
create table if not exists public.store_domains (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  domain text not null unique,
  is_primary boolean not null default false,
  verification_status text not null default 'pending',
  ssl_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 4.5 Extend `store_provisioning_jobs`

```sql
alter table public.store_provisioning_jobs
  add column if not exists job_type text,
  add column if not exists status text default 'queued',
  add column if not exists payload jsonb default '{}'::jsonb,
  add column if not exists result jsonb default '{}'::jsonb,
  add column if not exists error_message text,
  add column if not exists attempts integer default 0,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;
```

### 4.6 Additive columns on `stores`

```sql
alter table public.stores
  add column if not exists status text default 'draft',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists launched_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists template_source text,
  add column if not exists onboarding_completed boolean default false;
```

## 5. Product requirements

### 5.1 Admin dashboard

Internal team can manage users, stores, vision forms, provisioning, billing, templates, and publishing.

Admin roles:
- super_admin
- admin
- ops_manager
- support_agent

Admin modules:
- Admin overview
- Vision forms queue
- Store provisioning workspace
- Merchant management
- Billing controls
- Template management
- Admin activity log

#### Admin overview
- total stores
- stores by status
- trials ending soon
- unpaid stores
- provisioning jobs queue
- latest vision forms
- recently published stores

#### Vision forms queue
- list all vision forms
- filter by status, plan, assigned_to, created_at
- open full submission
- assign owner internally
- convert vision form into store setup job
- attach template
- add notes

#### Store provisioning workspace
Per-store admin page should show:
- store identity
- owner profile
- linked vision form
- billing state
- plan limit summary
- theme/template config
- onboarding task checklist
- provisioning jobs history
- publish controls

Actions:
- generate starter config from vision form
- choose template
- edit theme settings
- edit homepage sections
- create default pages
- enable/disable store
- publish/unpublish store
- grant free month / extend trial

#### Billing controls
- view current plan
- trial status
- subscription status
- payment issues
- manually comp a store
- manually extend trial
- manually disable store
- inspect subscription_events

### 5.2 Merchant dashboard

Store owner can manage their store without touching internal admin-only controls.

Merchant modules:
- Dashboard home
- Products
- Orders
- Customers
- Theme / Design
- Store settings
- Billing
- Domain

#### Dashboard home
- store status
- onboarding checklist
- product count vs plan limit
- order summary
- trial/billing summary
- quick actions

#### Products
- create product
- edit product
- archive product
- manage stock
- manage variants
- upload images
- assign category
- configure Stripe price sync status

#### Theme / Design
- choose theme
- edit colors, fonts, button style, logo
- homepage section editor
- preview store

## 6. Storefront requirements

Render store based on store config without breaking old stores.

Rendering logic:
1. Resolve store by subdomain/domain.
2. Fetch `store_theme_configs` if present.
3. If absent, fall back to old branding/template fields.
4. Render selected theme component.
5. Render homepage sections from config.

Supported initial themes:
- starter
- premium
- luxury

Supported section types:
- hero
- featured_products
- category_grid
- image_with_text
- testimonials
- newsletter
- rich_text

## 7. Vision form to store generation

Flow:
1. User submits vision form.
2. Store exists or is created in draft state.
3. Admin sees entry in queue.
4. Admin clicks `Generate Store Setup`.
5. System creates or updates:
   - store record
   - store_theme_configs
   - onboarding tasks
   - provisioning job entry
6. Admin reviews and edits.
7. Admin clicks publish.
8. Store status becomes live.

Mapping rules:
- `brand_name` -> `stores.name`
- `subdomain` -> `stores.subdomain`
- `brand_style` -> `store_theme_configs.theme_code` or theme recommendation
- `website_category` / `business_category` -> template recommendation
- `business_description` / `website_details` -> hero copy draft and about section draft
- `logo_url` -> theme asset / branding field
- `social_links` -> footer/social config
- `inspiration_urls` -> internal reference notes only

## 8. Status model

### Store statuses
- draft
- vision_submitted
- building
- review_ready
- live
- maintenance
- disabled

### Provisioning job statuses
- queued
- running
- completed
- failed
- cancelled

### Vision form statuses
- new
- assigned
- building
- ready_for_review
- launched
- archived

## 9. Trial and billing rules

- Store can be trialing before publish.
- Admin can extend trial manually.
- Store can be disabled when trial/subscription ends.
- Dashboard must show clear billing state.
- Frontend disable logic must continue respecting `stores.is_disabled` and fallback logic already in place.

## 10. Route map

### Admin
- `/admin`
- `/admin/stores`
- `/admin/stores/[id]`
- `/admin/vision-forms`
- `/admin/vision-forms/[id]`
- `/admin/templates`
- `/admin/billing`
- `/admin/provisioning`

### Merchant dashboard
- `/dashboard`
- `/dashboard/products`
- `/dashboard/products/new`
- `/dashboard/orders`
- `/dashboard/customers`
- `/dashboard/theme`
- `/dashboard/settings`
- `/dashboard/billing`
- `/dashboard/domain`

## 11. Theme configuration schema

Example `theme_settings`:
```json
{
  "primaryColor": "#111111",
  "accentColor": "#D4AF37",
  "backgroundColor": "#FFFFFF",
  "headingFont": "Inter",
  "bodyFont": "Inter",
  "buttonStyle": "rounded",
  "logoAlignment": "left"
}
```

Example `homepage_layout`:
```json
[
  {
    "type": "hero",
    "variant": "centered",
    "title": "Luxury essentials for modern brands",
    "subtitle": "Built from your brand vision",
    "ctaLabel": "Shop now"
  },
  {
    "type": "featured_products",
    "title": "Featured products",
    "limit": 8
  },
  {
    "type": "image_with_text",
    "title": "Our story",
    "body": "Crafted around your brand positioning",
    "imageUrl": ""
  }
]
```

## 12. Logging and audit

Every admin action should write to `store_admin_actions`.

Examples:
- store published
- trial extended
- store disabled
- theme changed
- template assigned
- onboarding task completed

## 13. Step-by-step build plan

### Phase 1: Foundations
1. Audit live schema for:
   - stores
   - profiles
   - vision_forms
   - products
   - orders
   - order_items
   - store_billing_settings
   - store_provisioning_jobs
2. Add additive migrations.
3. Add RLS and policies.
4. Add shared backend service layer.

Service files:
- `lib/stores/getStoreByOwner.ts`
- `lib/stores/getStoreConfig.ts`
- `lib/stores/publishStore.ts`
- `lib/stores/generateStoreConfigFromVision.ts`
- `lib/stores/onboarding.ts`
- `lib/admin/logStoreAction.ts`

### Phase 2: Admin dashboard
5. Build admin shell.
6. Build admin overview page.
7. Build vision forms queue.
8. Build store detail admin page.
9. Build admin theme editor.
10. Build billing controls.

### Phase 3: Merchant dashboard
11. Build merchant dashboard shell.
12. Build dashboard home.
13. Build products CRUD.
14. Build orders + customers pages.
15. Build merchant theme page.
16. Build store settings page.

### Phase 4: Storefront integration
17. Add config resolver.
18. Add theme renderer abstraction.
19. Add homepage section renderer.
20. Ensure backward compatibility.

### Phase 5: Provisioning workflow
21. Implement `generateStoreConfigFromVisionForm`.
22. Add admin action `Generate Store Setup`.
23. Add publish flow.

### Phase 6: Billing hardening
24. Add trial UI and enforcement.
25. Link plan limits to dashboard usage.

## 14. Acceptance criteria

### Admin
- Admin can view all stores.
- Admin can open a vision form and generate a store setup.
- Admin can edit theme settings and homepage layout.
- Admin can publish or disable a store.
- Admin can extend a trial.

### Merchant
- Merchant can manage products and orders.
- Merchant can edit allowed theme settings.
- Merchant can see onboarding tasks and store status.
- Merchant cannot access admin-only notes or billing override actions.

### Storefront
- New stores render from `store_theme_configs`.
- Old stores continue rendering without breaking.
- Disabled stores still respect existing disabled-site behavior.

## 15. Risks and mitigation

### Risk: break V1/V2 rendering
Mitigation:
- fallback to old branding/template fields
- launch config rendering only when config exists

### Risk: schema drift between docs and live DB
Mitigation:
- inspect live schema before writing migrations
- use `add column if not exists`

### Risk: admin actions bypass audit
Mitigation:
- centralize writes through service functions that always log

## 16. Cursor starter prompt

```text
You are working on Pixeocommerce, a multi-tenant ecommerce platform using Next.js, Supabase, and Stripe.

Your task is to implement a non-breaking hybrid store management system.

Constraints:
- Do not break existing V1/V2 storefront logic.
- Only add new tables/fields and additive code paths.
- If new store config exists, use it. Otherwise fallback to old fields.
- Build both an internal admin dashboard and a merchant dashboard.
- Use the schema and phased plan from this PRD.

Start with:
1. database migrations for store_theme_configs, store_status_history, store_onboarding_tasks, store_domains, and additive store/store_provisioning_jobs fields
2. service functions for getStoreConfig, generateStoreConfigFromVisionForm, publishStore, createDefaultOnboardingTasks, logStoreAction
3. admin dashboard shell and admin stores list page
4. merchant dashboard shell and dashboard home page

For each step:
- show exact files to create/edit
- show SQL migration files
- keep types strict
- reuse existing tables where possible
- explain fallback behavior for backward compatibility
```

## 17. Exact implementation checklist for Cursor

### Foundation checklist
- [ ] inspect live Supabase schema
- [ ] write migration for `store_theme_configs`
- [ ] write migration for `store_status_history`
- [ ] write migration for `store_onboarding_tasks`
- [ ] write migration for `store_domains`
- [ ] alter `stores` safely
- [ ] alter `store_provisioning_jobs` safely
- [ ] add or update TypeScript DB types
- [ ] create store config service layer
- [ ] create admin action logging helper

### Admin checklist
- [ ] admin auth guard
- [ ] admin shell
- [ ] admin overview page
- [ ] stores list page
- [ ] store detail page
- [ ] vision forms queue
- [ ] vision form detail page
- [ ] billing controls UI
- [ ] theme editor UI
- [ ] publish / disable / extend trial actions

### Merchant dashboard checklist
- [ ] dashboard auth guard
- [ ] dashboard shell
- [ ] dashboard home
- [ ] products list
- [ ] create/edit product page
- [ ] orders list
- [ ] customers list
- [ ] theme settings page
- [ ] homepage layout page
- [ ] billing page
- [ ] store settings page

### Storefront checklist
- [ ] store config resolver
- [ ] fallback to old branding if config missing
- [ ] theme renderer
- [ ] section renderer
- [ ] starter theme
- [ ] premium theme
- [ ] luxury theme
- [ ] preview link from dashboard/admin

## 18. Recommended folder structure

```text
app/
  admin/
    page.tsx
    stores/
      page.tsx
      [id]/page.tsx
    vision-forms/
      page.tsx
      [id]/page.tsx
    templates/
      page.tsx
    billing/
      page.tsx
    provisioning/
      page.tsx

  dashboard/
    page.tsx
    products/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    orders/
      page.tsx
    customers/
      page.tsx
    theme/
      page.tsx
    settings/
      page.tsx
    billing/
      page.tsx
    domain/
      page.tsx

components/
  admin/
  dashboard/
  themes/
    ThemeRenderer.tsx
    starter/
    premium/
    luxury/

lib/
  admin/
    logStoreAction.ts
  stores/
    getStoreConfig.ts
    generateStoreConfigFromVision.ts
    publishStore.ts
    onboarding.ts
```
