# 💎 PixeoCommerce / Driptonia: Master Developer Encyclopedia

Welcome to the PixeoCommerce technical ecosystem. This document is a comprehensive "Source of Truth" for new developers. It explains not just the architecture, but the exact **Frontend-to-Backend plumbing** that makes the platform work.

---

## 🏛️ 1. System Blueprint & Core Architecture

PixeoCommerce is a **multi-tenant SaaS platform** for headless e-commerce.

- **Frontend**: Next.js 14+ (App Router). Built for speed and SEO.
- **Backend/Database**: Supabase (PostgreSQL). Handles auth, real-time data, and storage.
- **Payments**: Stripe Connect. Enables unique vendor payouts automatically.
- **Email**: Resend / Supabase Edge Functions.

### The Single-Instance Model
There is only **one** codebase. Every store (e.g., `aura`, `ldnshades`) runs on the exact same code. Logic is separated by `store_id` in the database and `subdomain` in the URL.

---

## 🚦 2. The Routing & Connection Engine

How does a browser request for `store.pixeocommerce.com` reach the database?

### A. Subdomain Resolution (The Entry Point)
1. **Middleware (`middleware.ts`)**: Every request is intercepted. The system extracts the subdomain from the `Host` header.
2. **Path Rewriting**: If the subdomain is `aura`, the middleware internally rewrites the request to `/store/aura/...`.
3. **Connection**: The `x-store-subdomain` header is set, which allows Server Components to know *which* store context to fetch.

### B. Site Disabled Flow (The Kill Switch)
Every page load is wrapped in a `ClientLayout.tsx` check.
- **Frontend**: `useEffect` triggers a Supabase query.
- **Backend**: Checks `stores.is_disabled`. If true, the frontend renders a "Site Disabled" overlay instead of the shop.
- **Connection**: This ensures that non-paying merchants are automatically locked out across the whole platform.

---

## 📦 3. Product & Inventory Logic (The Data Engine)

### A. Data Modeling
- **Images**: We use an `image_urls` (text array) in Supabase.
  - *Frontend Connection*: The `Thumbnail` component takes the array and displays `image_urls[0]`.
- **Variants**: Stored as a **JSONB array** inside the `products` table. This allows infinite flexibility (Size, Color, Material) without changing the schema.

### B. Category System
- **Static**: Main nave categories are defined in `FeaturedCategories.tsx`.
- **Dynamic**: The `ShopAll` page fetches all products and uses a unique `Set()` in JavaScript to generate filterable categories from the database `category` column on the fly.

---

## 💸 4. The End-to-End Payment Lifecycle (The Plumbing)

This is the most critical "connection" in the project.

### 1. The Cart (Frontend Persistence)
- **Action**: User adds an item.
- **Backend Connection**: Items are stored in `CartContext`. No database call is made yet to keep it fast.

### 2. Checkout Initiation (`/api/create-cart-checkout`)
- **Action**: User clicks "Checkout".
- **Backend Connection**: The frontend POSTs to the API. The API resolves the `store_id` to a `stripe_account_id`.
- **Pricing Resolution**: The system checks for `connected_stripe_price_id` first (Connected Account), then falls back to `stripe_price_id` (Platform).

### 3. Verification & Order Success (The Webhook)
- **Action**: Payment succeeds on Stripe.
- **Frontend Connection**: Stripe redirects to `/success`, but the **database is updated by the Webhook**, not the page.
- **The Connection Route**: `/api/stripe/webhook` processes the event.
  - **Orders**: A new record is inserted into `orders`.
  - **Customers**: Upserts the customer into the `customers` table.
  - **Inventory**: Decrements the `stock` count. **Crucially**, for variants, it maps the `variant_id` from Stripe metadata to the `variants` JSONB array in Supabase and updates that specific object.

---

## 🔑 5. Customer Authentication & Accounts

We use a **Magic Link (Passwordless)** system for customers.

1. **Frontend**: Customer enters email in the login modal.
2. **Backend Connection**: `/api/auth/send-magic-link` generates a secure token in the `magic_link_tokens` table and (eventually) sends an email.
3. **Verification**: When the customer clicks the link, they are routed to `/auth/verify`, which confirms the token against the DB and initializes the `CustomerAuthContext`.

---

## 🛡️ 6. Admin & Billing Management

### The "Permission" pattern
In the Admin Dashboard, we often need to see data that Row Level Security (RLS) restricts.
- **Pattern**: Instead of one large Postgres join (which often fails with nulls), we fetch the primary IDs first, then perform a separate lookup for profiles/billing.
- **Subscription Truth**: A merchant's plan ("Premium", "Starter") is stored in the `profiles.subscription_plan` column.

---

## 🆘 7. Common Developer Tasks & Troubleshooting

- **"Plan is showing as Free"**: Ensure the `owner_id` in the `stores` table matches a `profile.id` that has a valid `subscription_plan` string.
- **"Images failing to load"**: Check if the code is looking for a `thumbnail_url` string when the data lives in the `image_urls` array.
- **"Webhook timing out"**: Use the Stripe CLI (`stripe listen`) to verify events are reaching your local endpoint during development.
- **Local Testing**: Always use `{subdomain}.localhost:3000` to test storefront logic.

---
*Created by the PixeoCommerce Core Team. Refer to individual files in `/Documentations` for deep-dive technical specs.*
