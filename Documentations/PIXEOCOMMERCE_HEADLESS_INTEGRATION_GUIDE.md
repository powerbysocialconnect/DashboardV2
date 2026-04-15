# PixeoCommerce Headless Integration Guide

This guide is for developers who are building a custom frontend (e.g., a Premium $40/mo plan website) and want to connect it to the PixeoCommerce backend.

## 1. Quick Start

Your custom frontend can fetch products and process payments by calling the **Headless API** of your main PixeoCommerce instance.

### Configuration
In your custom Next.js project's `.env.local` file:
```bash
NEXT_PUBLIC_PIXEO_API_URL=https://dashboard.pixeocommerce.com
NEXT_PUBLIC_STORE_ID=your-unique-store-uuid
```

---

## 2. API Reference

### Get Store Info
Fetches the store name, logo, currency, and brand settings.
- **Endpoint**: `GET /api/headless/stores/[STORE_ID]`
- **Response**: `{ "store": { ... }, "themeConfig": { ... } }`

### Get Categories (NEW)
Fetches all product categories for navigation and collection pages.
- **Endpoint**: `GET /api/headless/stores/[STORE_ID]/categories`
- **Response**:
```json
{
  "categories": [
    { "id": "uuid", "name": "Summer Collection", "slug": "summer" }
  ]
}
```

### Get Product Catalog
Fetches all active products for the store with support for search, sorting, and pagination.
- **Endpoint**: `GET /api/headless/stores/[STORE_ID]/products`
- **Optional Params**: 
  - `limit=50` (Default: 100)
  - `page=1` (For pagination)
  - `category_id=uuid` (Filter by category)
  - `q=text` (Search by name or description)
  - `sort=latest|oldest|price_asc|price_desc`
- **Response**:
```json
{
  "products": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

### Validate Discount (NEW)
Check if a discount code is valid before creating a checkout session.
- **Endpoint**: `GET /api/headless/stores/[STORE_ID]/discounts/validate?code=SUMMER10`
- **Response**:
```json
{
  "valid": true,
  "discount": {
    "id": "uuid",
    "code": "SUMMER10",
    "type": "percentage",
    "value": 10,
    "min_order_amount": 50
  }
}
```

### Get Shipping Methods (NEW)
Fetches available shipping options for the store.
- **Endpoint**: `GET /api/headless/stores/[STORE_ID]/shipping-methods`
- **Response**:
```json
{
  "shippingMethods": [
    { "id": "uuid", "name": "Standard Shipping", "rate": 5.00, "description": "3-5 business days" }
  ]
}
```

### Create Checkout
Redirects the customer to the secure Stripe Checkout page hosted on the merchant's Connect account.
- **Endpoint**: `POST /api/headless/stores/[STORE_ID]/checkout`
- **Body**:
```json
{
  "items": [
    { 
      "productId": "uuid", 
      "variantId": "uuid", // Optional: for specific variations
      "quantity": 1 
    }
  ],
  "discount_code": "SUMMER10", // Optional: applied to Stripe session
  "shipping_rate_id": "uuid", // Optional: selected shipping method ID
  "success_url": "https://your-custom-site.com/thanks",
  "cancel_url": "https://your-custom-site.com/cart"
}
```

---

## 3. Advanced Integration Patterns

### Creating a Category-Based Page
```typescript
// pages/collections/[id].tsx
async function CategoryPage({ params }) {
  const categoryId = params.id;
  const res = await fetch(`${process.env.NEXT_PUBLIC_PIXEO_API_URL}/api/headless/stores/${process.env.NEXT_PUBLIC_STORE_ID}/products?category_id=${categoryId}`);
  const { products } = await res.json();
  
  return (
    <div>
      <h1>Category Products</h1>
      <ProductGrid items={products} />
    </div>
  );
}
```

### Implementing Server-Side Search
```typescript
// components/SearchBox.tsx
async function SearchBox({ query }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_PIXEO_API_URL}/api/headless/stores/${process.env.NEXT_PUBLIC_STORE_ID}/products?q=${query}&limit=6`);
  const { products } = await res.json();
  
  return (
    <div className="search-results">
      {products.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
```

### Displaying a Multi-Image Gallery
Products in PixeoCommerce support multiple images in the `image_urls` array.
```tsx
function ProductGallery({ product }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {product.image_urls.map((url, i) => (
        <img key={i} src={url} alt={product.name} className="rounded-lg" />
      ))}
    </div>
  );
}
```

### Handling Variants
V2 now supports full variant management with specific price and stock levels.
```tsx
{product.variants?.map(variant => (
  <button key={variant.id}>
    {variant.name} - ${variant.price} (Stock: {variant.stock})
  </button>
))}
```
When a variant is selected, pass its `id` as `variantId` to the checkout API.

---

## 4. Why Use Headless?
1. **Design Freedom**: Build any UI you want in a fresh Next.js repo.
2. **Shared Backend**: Manage all products, orders, and Stripe settings from the main PixeoCommerce Dashboard.
3. **Automated Payments**: All sales from your custom frontend automatically flow into the merchant's Stripe Connect account and appear in your Admin dashboard.
