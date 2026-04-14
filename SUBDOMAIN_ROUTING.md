# Subdomain Routing — Implementation Notes

## How it works

### Overview

Store subdomains allow each tenant to have a unique URL like `https://mystore.pixeocommerce.com`. 
The system auto-generates subdomains during store creation and routes requests via Next.js middleware.

### Request flow

```
Browser: mystore.pixeocommerce.com/product/123
     │
     ▼
Vercel (wildcard DNS: *.pixeocommerce.com → this Next.js app)
     │
     ▼
middleware.ts
  ├─ Extract subdomain from Host header → "mystore"
  ├─ Check: is it a platform subdomain (www, admin, dashboard, api)? → No
  ├─ Rewrite to: /store/mystore/product/123
  └─ Set x-store-subdomain header
     │
     ▼
app/store/[subdomain]/product/[id]/page.tsx
  ├─ Read subdomain from params
  ├─ resolveStorefront() → fetch store + products from Supabase
  └─ Render storefront
```

### Localhost development

For local development, use `{store}.localhost:3000`:

```
http://mystore.localhost:3000          → rewrites to /store/mystore
http://mystore.localhost:3000/cart     → rewrites to /store/mystore/cart
http://localhost:3000                  → normal app (marketing)
http://localhost:3000/dashboard        → merchant dashboard
http://localhost:3000/admin            → admin panel
http://localhost:3000/store/mystore    → CANONICAL REDIRECT to http://mystore.localhost:3000 (New!)
```

### Canonical Redirects
To ensure the best merchant experience and SEO, any request to a storefront route (`/store/[slug]`) made on the main platform domain (e.g., `dashboard.pixeocommerce.com` or `localhost:3000`) is now automatically redirected to the corresponding subdomain (`[slug].pixeocommerce.com` or `[slug].localhost`).

This ensures that:
1. Links from the dashboard always land on the merchant's dedicated domain.
2. The user experience is consistent and premium.
3. Local development supports multiple ports (e.g., `:3001`) automatically.

Browsers resolve `*.localhost` to `127.0.0.1` by default. No `/etc/hosts` edits needed.

---

## Vercel Wildcard Domain Setup

### Prerequisites

1. A domain registered and pointing to Vercel (e.g. `pixeocommerce.com`)
2. A Vercel project for this Next.js app

### Steps

1. **Add the apex domain** in Vercel Dashboard → Project → Settings → Domains:
   - `pixeocommerce.com`
   - `www.pixeocommerce.com`

2. **Add the wildcard domain**:
   - `*.pixeocommerce.com`
   - Vercel will provide DNS records (either a CNAME or an A record)

3. **Configure DNS** at your registrar:
   - `A` record for `@` → Vercel IP (e.g. `76.76.21.21`)
   - `CNAME` for `*` → `cname.vercel-dns.com`
   - `CNAME` for `www` → `cname.vercel-dns.com`

4. **Set environment variable**:
   ```
   NEXT_PUBLIC_ROOT_DOMAIN=pixeocommerce.com
   ```

That's it. The middleware handles everything else.

---

## Backward Compatibility

### What stays the same

| Feature | Impact |
|---------|--------|
| Existing stores | Continue working. Subdomain column is nullable — stores without one still load via `/store/[subdomain]` path routing |
| Current dashboard routes | `/admin/*`, `/dashboard/*`, `/login` — all unaffected. Middleware passes through for these |
| Stripe webhooks | `/api/webhooks/*` paths bypass all middleware logic, as before |
| Direct path access | `/store/{subdomain}` URL pattern still works alongside real subdomain routing |
| Existing database schema | Migration is additive only — `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` |

### What's new

| Feature | How |
|---------|-----|
| Subdomain auto-generation | `generateUniqueSubdomain()` creates slugs from store name with collision avoidance |
| Wildcard routing | Middleware extracts subdomain from Host header and rewrites to `/store/[subdomain]` internally |
| Reserved word protection | 30+ reserved subdomains (www, admin, api, etc.) are blocked during validation |
| Subdomain editing | Admin and merchant UIs allow changing subdomain with live availability checking |

---

## Testing Checklist

### Duplicate subdomain handling
- [ ] Creating two stores with the same name generates different subdomains (e.g. `cool-store`, `cool-store-2`)
- [ ] Attempting to manually set a taken subdomain returns a 409 error
- [ ] The unique database index prevents any race condition duplicates

### Reserved word handling
- [ ] Attempting to use `www`, `admin`, `dashboard`, `api`, `app`, `support`, etc. returns a validation error
- [ ] Reserved words cannot be set via the API or UI

### Localhost development
- [ ] `http://mystore.localhost:3000` routes to the mystore storefront
- [ ] `http://localhost:3000` shows the marketing/home page
- [ ] `http://localhost:3000/admin` shows admin dashboard
- [ ] `http://localhost:3000/dashboard` shows merchant dashboard
- [ ] `http://localhost:3000/store/mystore` still works as direct path access

### Existing store fallback
- [ ] Stores without a subdomain column value still load via `/store/[subdomain]` path
- [ ] Disabled stores return null from `resolveStorefront()` (unchanged behavior)
- [ ] Unknown subdomains (e.g. `nonexistent.pixeocommerce.com`) rewrite to `/store/nonexistent` which shows a 404

### Middleware safety
- [ ] Webhook endpoints (`/api/webhooks/*`) bypass middleware completely
- [ ] Static assets (`/_next/*`, images) are not rewritten
- [ ] API routes (`/api/*`) are not rewritten by subdomain logic

---

## Custom Domains (NOT yet implemented)

Custom domain support is **not** part of this implementation. When added later, the flow would be:

1. Merchant adds a custom domain in the UI (existing `store_domains` table)
2. Middleware checks custom domain → resolves to store
3. Vercel API is called to add the domain to the project
4. DNS verification flow confirms ownership

This can be layered on top of the current subdomain system without changes.
