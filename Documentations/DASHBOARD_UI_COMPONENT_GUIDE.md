# Dashboard UI Component Guide
> **Pixeocommerce Shopi — Merchant Dashboard**
> Last updated: April 2026

This document maps every existing UI and dashboard component, explains the current design system, and proposes what new components and pages should be added next.

---

## 1. Design System Overview

### Theme Engine
- **Library:** [shadcn/ui](https://ui.shadcn.com/) (`style: "default"`, `baseColor: neutral`)
- **CSS Framework:** Tailwind CSS v3 with `tailwindcss-animate` plugin
- **CSS Variables:** All tokens are defined via HSL CSS variables in `app/globals.css`
- **Dark Mode:** Supported via `class` strategy (`.dark` class on `<html>`)
- **Border Radius:** `--radius: 0.5rem` (sm = 0.25rem, md = 0.375rem, lg = 0.5rem)

### Color Tokens (Light Mode)

> **Note:** The theme is a **monochromatic neutral (greyscale) system** — primary is near-black, secondary is near-white. There are no brand accent colours defined yet. This is a prime area for improvement.

- `--background` — `0 0% 100%` — Page background
- `--foreground` — `0 0% 3.9%` — Body text
- `--primary` — `0 0% 9%` — Buttons, active states
- `--secondary` — `0 0% 96.1%` — Secondary buttons, chips
- `--muted` — `0 0% 96.1%` — Disabled, empty states
- `--muted-foreground` — `0 0% 45.1%` — Placeholder text, labels
- `--accent` — `0 0% 96.1%` — Hover backgrounds
- `--destructive` — `0 84.2% 60.2%` — Danger/delete actions
- `--border` — `0 0% 89.8%` — Card borders, dividers
- `--ring` — `0 0% 3.9%` — Focus ring

### Sidebar Tokens (separate palette)

- `--sidebar-background` — `0 0% 98%` — sidebar bg
- `--sidebar-foreground` — `240 5.3% 26.1%` — nav text
- `--sidebar-accent` — `240 4.8% 95.9%` — active nav item bg
- `--sidebar-primary` — `240 5.9% 10%` — active nav icon
- `--sidebar-border` — `220 13% 91%` — sidebar right border

---

## 2. Existing Component Inventory

### 2a. shadcn/ui Primitives (`/components/ui/`)

- **`Accordion`** (`accordion.tsx`) — Not yet used in dashboard
- **`AlertDialog`** (`alert-dialog.tsx`) — Product delete confirmation
- **`Avatar`** (`avatar.tsx`) — Not yet used in dashboard
- **`Badge`** (`badge.tsx`) — Order status, discount status
- **`Button`** (`button.tsx`) — Everywhere
- **`Card`** + `CardHeader/Content/...` (`card.tsx`) — All dashboard pages
- **`Checkbox`** (`checkbox.tsx`) — Not yet used in dashboard
- **`Collapsible`** (`collapsible.tsx`) — Not yet used
- **`Dialog`** (`dialog.tsx`) — Create discount dialog
- **`DropdownMenu`** (`dropdown-menu.tsx`) — Not yet used in dashboard
- **`Form`** + `FormField/...` (`form.tsx`) — Product edit page
- **`Input`** (`input.tsx`) — All forms
- **`Label`** (`label.tsx`) — All forms
- **`Popover`** (`popover.tsx`) — Not yet used
- **`Progress`** (`progress.tsx`) — Onboarding checklist, plan limits
- **`ScrollArea`** (`scroll-area.tsx`) — Not yet used in dashboard
- **`Select`** (`select.tsx`) — Product form, discount form
- **`Separator`** (`separator.tsx`) — Not yet used
- **`Skeleton`** (`skeleton.tsx`) — All loading states
- **`Switch`** (`switch.tsx`) — Product active toggle, discount active toggle
- **`Table`** + `TableHeader/Body/...` (`table.tsx`) — Discounts, Orders, Customers pages
- **`Tabs`** (`tabs.tsx`) — Not yet used in dashboard
- **`Textarea`** (`textarea.tsx`) — Product description
- **`Toast`** (`toast.tsx`) — Wired in but not actively used (uses `sonner`)
- **`Tooltip`** (`tooltip.tsx`) — Not yet used in dashboard

### 2b. Dashboard-Specific Components (`/components/dashboard/`)

- **`DashboardSidebar`** (`DashboardSidebar.tsx`) — Main navigation sidebar (7 nav items + logout)
- **`ImageUpload`** (`ImageUpload.tsx`) — Multi-image uploader for products
- **`TrialBanner`** (`TrialBanner.tsx`) — Trial expiry warning (shows only in last 7 days)
- **`PlanLimitIndicator`** (`PlanLimitIndicator.tsx`) — Progress bar for plan resource limits
- **`BillingSummary`** (`BillingSummary.tsx`) — Billing plan info card

### 2c. Admin-Specific Components (`/components/admin/`)

- **`AdminSidebar`** (`AdminSidebar.tsx`) — Sidebar for `/admin` routes
- **`OnboardingChecklist`** (`OnboardingChecklist.tsx`) — Setup task list with progress bar
- **`StoreStatusBadge`** (`StoreStatusBadge.tsx`) — Coloured badge for store status

---

## 3. Existing Dashboard Pages

- `/dashboard` (`page.tsx`) — ✅ Done — stats, chart, recent orders, quick setup
- `/dashboard/products` (`products/page.tsx`) — ✅ Done — product list
- `/dashboard/products/new` (`products/new/page.tsx`) — ✅ Done — create product form
- `/dashboard/products/[id]` (`products/[id]/page.tsx`) — ✅ Done — edit product form
- `/dashboard/categories` (`categories/page.tsx`) — ✅ Done
- `/dashboard/orders` (`orders/page.tsx`) — ✅ Done — order list
- `/dashboard/customers` (`customers/page.tsx`) — ✅ Done
- `/dashboard/discounts` (`discounts/page.tsx`) — ✅ Done
- `/dashboard/domain` (`domain/page.tsx`) — ✅ Done
- `/dashboard/settings` (`settings/page.tsx`) — ✅ Done
- `/dashboard/settings/shipping` (`settings/shipping/page.tsx`) — ✅ Done

---

## 4. Missing Components — What to Add

### 4a. shadcn/ui Components Installed But Never Used

These are already installed — just `import` and use them:

- **`Tabs`** — Orders page — filter by `All / Pending / Fulfilled / Cancelled`
- **`DropdownMenu`** — User avatar menu in header; bulk order actions
- **`Tooltip`** — Sidebar icon labels in collapsed mode; chart data points
- **`Avatar`** — Customer profile image in customer page; user menu
- **`Collapsible`** — Settings sections (collapse General / Shipping / etc.)
- **`Accordion`** — FAQ/Help section; product variant groups
- **`Separator`** — Section dividers in settings or sidebar
- **`ScrollArea`** — Long product lists; sidebar overflow on small screens
- **`Checkbox`** — Bulk select orders/products for mass actions
- **`Popover`** — Date range pickers; quick filters

---

### 4b. New Dashboard Components to Build

#### 1. `TopBar` / `Header` — `components/dashboard/TopBar.tsx`
The layout currently has **no top bar** — just the sidebar. Add a sticky header with:
- Store name + avatar/user menu with dropdown (logout, profile, admin link)
- Global search bar (search products/orders/customers)
- Notification bell with unread count badge
- Dark mode toggle

```tsx
// Placement: app/dashboard/layout.tsx — above <main>
<TopBar storeName={store?.name} userEmail={user?.email} />
```

---

#### 2. `StatCard` — Promote to reusable component
`StatCard` is currently defined inline in `app/dashboard/page.tsx`. Move it to:
```
components/dashboard/StatCard.tsx
```
So it can be reused on other pages (e.g., an analytics page).

---

#### 3. `EmptyState` — `components/dashboard/EmptyState.tsx`
Multiple pages have their own inline empty state markup. Standardise into one component:

```tsx
<EmptyState
  icon={Package}
  title="No products yet"
  description="Add your first product to start selling."
  action={{ label: "Add Product", href: "/dashboard/products/new" }}
/>
```

---

#### 4. `DataTable` — `components/dashboard/DataTable.tsx`
Orders, customers, products, and discounts all use the `Table` primitive with custom logic. A shared `DataTable` component with:
- Column definitions
- Sortable columns
- Pagination controls
- Search/filter row
- Bulk select checkboxes

Would eliminate massive code duplication.

---

#### 5. `PageHeader` — `components/dashboard/PageHeader.tsx`
Every page repeats the same heading pattern. Extract:

```tsx
<PageHeader
  title="Products"
  description="Manage your store's catalogue"
  action={<Button asChild><Link href="/new">Add Product</Link></Button>}
/>
```

---

#### 6. `ConfirmDialog` — `components/dashboard/ConfirmDialog.tsx`
Currently the product delete uses `AlertDialog`. Discounts use `window.confirm()`. Centralise:

```tsx
<ConfirmDialog
  title="Delete this product?"
  description="This cannot be undone."
  onConfirm={handleDelete}
  trigger={<Button variant="destructive">Delete</Button>}
/>
```

---

#### 7. `OrderStatusBadge` — `components/dashboard/OrderStatusBadge.tsx`
Similar to `StoreStatusBadge` in admin. Maps order status to a colour:

- `pending` — Yellow / amber
- `paid` — Green
- `shipped` — Blue
- `delivered` — Teal / dark green
- `cancelled` — Red / destructive
- `refunded` — Purple

---

#### 8. `StoreHealthWidget` — `components/dashboard/StoreHealthWidget.tsx`
A card on the dashboard showing at a glance:
- Stripe connection status (connected / not connected)
- Domain verification status
- Products count vs plan limit
- SSL status

---

### 4c. New Pages to Add

**High Priority**
- `/dashboard/analytics` — Revenue graph, conversion funnel, top products, traffic
- `/dashboard/orders/[id]` — Order detail — items, shipping, fulfillment actions

**Medium Priority**
- `/dashboard/customers/[id]` — Customer profile — order history, LTV, contact info
- `/dashboard/reviews` — Product reviews moderation
- `/dashboard/notifications` — In-app notification centre

**Low Priority**
- `/dashboard/integrations` — Stripe, Mailchimp, etc. connection cards
- `/dashboard/reports` — Exportable CSV reports for orders/revenue

---

## 5. Theme Improvements to Consider

### 5a. Add a Brand Accent Colour
Currently the theme is purely neutral. Consider adding:

```css
/* In app/globals.css */
:root {
  --brand: 262 83% 58%;           /* A purple brand colour, for example */
  --brand-foreground: 0 0% 100%;
}
```

And in `tailwind.config.ts`:
```ts
brand: {
  DEFAULT: "hsl(var(--brand))",
  foreground: "hsl(var(--brand-foreground))",
},
```

### 5b. Dark Mode Toggle
Dark mode CSS variables are defined but **no toggle exists** in the UI. Add a `ThemeToggle` component using `next-themes`:

```tsx
// components/dashboard/ThemeToggle.tsx
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
```

### 5c. Sidebar Collapsed Mode
Add a collapsed state (icon-only) to the `DashboardSidebar` for wider screen real estate. Use a `Tooltip` to show the label on hover.

### 5d. Mobile Responsive Sidebar
The current sidebar is fixed-width `w-64` and not responsive. Add a `Sheet` component (a slide-in drawer from the left) for mobile screens.

---

## 6. Install Commands for Missing shadcn/ui Components

If any primitives are needed that aren't yet in `components/ui`:

```bash
# Date picker
npx shadcn@latest add calendar date-picker

# Command palette / search
npx shadcn@latest add command

# Toast (already partially installed, upgrade to latest)
npx shadcn@latest add sonner

# Sheet (mobile sidebar drawer)
npx shadcn@latest add sheet

# Radio group (for shipping method selection)
npx shadcn@latest add radio-group

# Number input with +/- buttons
npx shadcn@latest add number-input
```

---

## 7. Summary Checklist

- [ ] Move `StatCard` to `components/dashboard/StatCard.tsx`
- [ ] Build `TopBar` with user menu, search, notification bell
- [ ] Build `EmptyState` reusable component
- [ ] Build `DataTable` to replace repeated table code
- [ ] Build `PageHeader` to replace repeated h1+description pattern
- [ ] Build `ConfirmDialog` — replace `window.confirm()` on discounts page
- [ ] Build `OrderStatusBadge` for the orders table
- [ ] Build `StoreHealthWidget` for the dashboard home
- [ ] Add `/dashboard/orders/[id]` order detail page
- [ ] Add `/dashboard/analytics` page
- [ ] Add `/dashboard/customers/[id]` customer profile page
- [ ] Add dark mode toggle to layout
- [ ] Add mobile responsive sidebar using `Sheet`
- [ ] Add optional brand accent colour token to the theme
- [ ] Use `Tabs` on orders page for status filtering
- [ ] Replace `window.confirm()` calls with `AlertDialog`
