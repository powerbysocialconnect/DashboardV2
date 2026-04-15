# PixeoCommerce Headless API Documentation (V1.0)

This documentation defines the **Headless API specification** for PixeoCommerce. Developers building custom storefronts (Next.js, Remix, Mobile Apps) can use these endpoints to interact with the PixeoCommerce backend, fetch product data, and process secure payments via Stripe Connect.

---

## 1. Quick Start & Configuration

To connect your custom frontend, configure your environment variables with your unique Store ID.

```bash
NEXT_PUBLIC_PIXEO_API_URL=https://dashboard.pixeocommerce.com
NEXT_PUBLIC_STORE_ID=your-unique-store-uuid
```

---

## 2. Authentication & Security

The Headless API is primarily **public** but scoped to a specific `STORE_ID`.

- **Isolation**: Every request MUST include the `STORE_ID` in the path. Requests are isolated at the database level using Supabase Row-Level Security (RLS).
- **Public Endpoints**: Catalog and Store info endpoints are publicly accessible.
- **Security**: Never expose Stripe Secret Keys or Supabase Service Role keys in your frontend code.
- **CORS**: Headless storefronts are allowed from any domain. You can restrict this in your Store Dashboard under **Settings > Domains**.

---

## 3. Store Identity & Branding

### Get Store Info
Fetches core store details, currency, and branding/theme configuration.

- **Endpoint**: `GET /api/headless/stores/[STORE_ID]`
- **Response**:
```json
{
  "store": {
    "id": "uuid",
    "name": "Acme Boutique",
    "subdomain": "acme",
    "description": "High-end fashion",
    "logo_url": "https://...",
    "currency": "USD",
    "branding": {
      "primaryColor": "#000000",
      "accentColor": "#6366f1"
    },
    "status": "live"
  },
  "themeConfig": {
    "theme_settings": {
      "headingFont": "Inter",
      "bodyFont": "Inter",
      "buttonStyle": "pill"
    },
    "homepage_layout": [...]
  }
}
```

---

## 4. Product Catalog

### List Products
Fetches a list of active products with support for filtering, search, and pagination.

- **Endpoint**: `GET /api/headless/stores/[STORE_ID]/products`
- **Params**:
  - `q`: Search query (searches name and description).
  - `category_id`: Filter products by category UUID.
  - `sort`: `latest` (default), `oldest`, `price_asc`, `price_desc`.
  - `page`: Page number for pagination.
  - `limit`: Results per page (default: 100).

### Get Single Product
Fetches full details for a product by its ID or Slug.

- **Endpoint**: `GET /api/headless/stores/[STORE_ID]/products/[id_or_slug]`
- **Response**:
```json
{
  "product": {
    "id": "uuid",
    "name": "Classic T-Shirt",
    "slug": "classic-t-shirt",
    "description": "100% Cotton...",
    "price": 25.00,
    "compare_at_price": 35.00,
    "image_urls": ["url1", "url2"],
    "stock": 50,
    "variants": [
      {
        "id": "var_uuid",
        "name": "Large / Black",
        "price": 25.00,
        "stock": 10
      }
    ],
    "active": true
  }
}
```

---

## 5. Categories

### Get All Categories
Fetches all active categories for the store.

- **Endpoint**: `GET /api/headless/stores/[STORE_ID]/categories`
- **Response**:
```json
{
  "categories": [
    { 
      "id": "uuid", 
      "name": "Apparel", 
      "slug": "apparel",
      "image_url": "https://..."
    }
  ]
}
```

---

## 6. Cart Architecture & Inventory

PixeoCommerce follows a **Frontend-Managed Cart** architecture.

- **State Management**: The frontend is responsible for maintaining the cart state (usually in `localStorage` or `Redux/Zustand`).
- **Inventory Validation**: The backend does **not** persist a "cart" object. Instead, product availability and pricing are re-validated server-side at the moment of checkout creation.
- **Inventory Rules**:
  - If a product or variant has `stock: 0`, it is treated as "Sold Out".
  - The Checkout API will reject requests if the requested quantity exceeds the current stock.

---

## 7. Checkout Flow (Stripe Connect)

PixeoCommerce uses **Stripe Connect** to route payments directly to the merchant's account.

1. **Frontend**: POSTs the cart items to `/checkout`.
2. **Backend**: 
    - Validates product existence and stock.
    - Resolves variant pricing.
    - Applies discounts.
    - Creates a Stripe Checkout Session via the merchant's connected account.
3. **Response**: Returns a secure `url` for redirection.
4. **Lifecycle**: Payment completion triggers a Stripe Webhook that creates the official Order in the PixeoCommerce dashboard.

### Create Checkout Session
- **Endpoint**: `POST /api/headless/stores/[STORE_ID]/checkout`
- **Body**:
```json
{
  "items": [
    { "productId": "uuid", "variantId": "opt_uuid", "quantity": 1 }
  ],
  "discount_code": "SUMMER10",
  "shipping_rate_id": "uuid",
  "success_url": "https://yoursite.com/success",
  "cancel_url": "https://yoursite.com/cart",
  "customer_details": {
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```
- **Response**: `{ "url": "https://checkout.stripe.com/..." }`

---

## 8. Error Handling System

All API errors return a standard 4xx or 5xx status code with a consistent JSON body:

```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable description"
  }
}
```

| Code | Description |
| :--- | :--- |
| `STORE_NOT_FOUND` | The provided Store ID is invalid. |
| `PRODUCT_NOT_FOUND` | One of the items in the cart no longer exists. |
| `OUT_OF_STOCK` | Requested quantity exceeds current stock. |
| `INVALID_DISCOUNT_CODE` | The discount code is invalid or expired. |
| `INTERNAL_SERVER_ERROR` | An unexpected error occurred on our end. |

---

## 9. Performance & Caching (Vercel/Next.js)

For building high-performance storefronts, we recommend:

- **Static Generation (SSG/ISR)**: Use `getStaticProps` or `generateStaticParams` for Product and Category pages. Suggested `revalidate` period: **60 seconds**.
- **Dynamic Fetching**: Use client-side fetching for `Discounts` and `Shipping Methods` to ensure real-time accuracy.
- **Global Edge Caching**: PixeoCommerce API responses include `Cache-Control` headers for shared product lists.

---

## 10. API Versioning

- **Current Version**: `v1`
- **Strategy**: We ensure no breaking changes to the `v1` path. Future breaking changes will be introduced via `v2`.

---

## 11. Minimal Working Example (Frontend)

```typescript
async function handleCheckout(cartItems) {
  const response = await fetch(`/api/headless/stores/${STORE_ID}/checkout`, {
    method: 'POST',
    body: JSON.stringify({
      items: cartItems.map(item => ({
        productId: item.id,
        variantId: item.variant_id,
        quantity: item.quantity
      })),
      success_url: window.location.origin + '/thanks',
      cancel_url: window.location.origin + '/cart'
    })
  });

  const { url, error } = await response.json();
  
  if (error) {
    alert(error.message);
    return;
  }

  // Redirect to Stripe
  window.location.href = url;
}
```
