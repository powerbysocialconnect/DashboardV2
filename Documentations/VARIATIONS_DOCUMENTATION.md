# Product Variations Documentation - Pixeocommerce Store

## Table of Contents
1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Fetching Variations](#fetching-variations)
4. [Checkout Process](#checkout-process)
5. [Stock Management](#stock-management)
6. [API Reference](#api-reference)
7. [Integration Points](#integration-points)
8. [Best Practices](#best-practices)

## Overview

The Pixeocommerce store implements a flexible product variation system that integrates Supabase for data storage with Stripe for payment processing. This system supports both simple products and complex products with multiple variants (size, color, style, etc.).

### Key Features
- **Flexible Variant Storage**: JSON-based variant storage in Supabase
- **Dual Stripe Integration**: Support for both connected accounts and platform pricing
- **Dynamic Stock Management**: Real-time stock updates at variant level
- **Image Handling**: Combined product and variant image management
- **Price Range Display**: Automatic price range calculation for variant products

## Database Architecture

### Products Table Structure

The `products` table in Supabase contains the following variant-related fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `store_id` | UUID | Foreign key to stores table |
| `name` | TEXT | Product name |
| `description` | TEXT | Product description |
| `price` | DECIMAL | Base product price |
| `stock` | INTEGER | Base product stock |
| `image_urls` | JSON | Array of product image URLs |
| `variants` | JSON | Array of variant objects |
| `connected_stripe_products` | JSON | Stripe products for connected accounts |
| `stripe_products` | JSON | Stripe products for platform |
| `connected_stripe_price_id` | TEXT | Main Stripe price ID (connected) |
| `stripe_price_id` | TEXT | Main Stripe price ID (platform) |
| `active` | BOOLEAN | Product visibility status |

### Variant Object Schema

Each variant in the `variants` JSON array follows this structure:

```json
{
  "id": "unique_variant_id",
  "name": "Variant Display Name",
  "price": 29.99,
  "stock": 10,
  "image_urls": ["https://example.com/variant1.jpg"],
  "attributes": {
    "size": "Large",
    "color": "Blue",
    "material": "Cotton"
  }
}
```

### Stripe Integration Schema

For Stripe pricing, variants are stored in separate arrays:

#### Connected Stripe Products
```json
[
  {
    "variant_id": "variant_123",
    "connected_stripe_price_id": "price_abc123"
  }
]
```

#### Platform Stripe Products
```json
[
  {
    "variant_id": "variant_123",
    "stripe_price_id": "price_xyz789"
  }
]
```

## Fetching Variations

### 1. Product Detail Page Implementation

**File**: `app/products/[id]/page.tsx`

#### Initial Product Fetch
```typescript
// Fetch product with all variant data
const { data, error } = await supabase
  .from("products")
  .select("*")
  .eq("id", productId)
  .eq("store_id", storeId)
  .single();

// Auto-select first variant if available
if (data?.variants && data.variants.length > 0) {
  setSelectedVariant(data.variants[0]);
}
```

#### Variant Selection Logic
```typescript
// Check if product has variants
const hasVariants = product.variants && product.variants.length > 0;

// Get current price based on selection
const getCurrentPrice = () => {
  if (selectedVariant) {
    return selectedVariant.price;
  }
  return product?.price || 0;
};

// Get current stock based on selection
const getCurrentStock = () => {
  if (selectedVariant) {
    return selectedVariant.stock || 0;
  }
  return product?.stock || 0;
};
```

#### Image Handling
```typescript
// Combine product and variant images
const getAllImages = () => {
  const images = [];
  
  // Add base product images
  if (product?.image_urls && product.image_urls.length > 0) {
    images.push(...product.image_urls);
  }
  
  // Add selected variant images
  if (selectedVariant?.image_urls && selectedVariant.image_urls.length > 0) {
    images.push(...selectedVariant.image_urls);
  }
  
  return images.length > 0 ? images : ["/placeholder.svg"];
};
```

### 2. Product Listing Implementation

**File**: `app/shop-all/page.tsx`

#### Products Fetch
```typescript
// Fetch all active products for the store
const { data, error } = await supabase
  .from("products")
  .select("*")
  .eq("store_id", process.env.NEXT_PUBLIC_STORE_ID)
  .eq("active", true)
  .order('created_at', { ascending: false });
```

#### Price Calculation for Listings
```typescript
const getProductPrice = (product) => {
  const currency = store?.currency || 'gbp';
  
  if (product.variants && product.variants.length > 0) {
    const prices = product.variants.map(v => v.price || 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    return minPrice === maxPrice ? 
      formatPrice(minPrice, currency) : 
      formatPriceRange(minPrice, maxPrice, currency);
  }
  
  return formatPrice(product.price || 0, currency);
};
```

#### Stock Calculation for Listings
```typescript
const getTotalStock = (product) => {
  if (product.variants && product.variants.length > 0) {
    // Sum up stock from all variants
    return product.variants.reduce((total, variant) => 
      total + (variant.stock || 0), 0
    );
  }
  // For simple products, use base stock
  return product.stock || 0;
};

const isOutOfStock = (product) => {
  return getTotalStock(product) === 0;
};
```

#### Image Handling for Listings
```typescript
const getProductImage = (product) => {
  // Try base product images first
  if (product.image_urls && product.image_urls.length > 0) {
    return product.image_urls[0];
  }
  
  // Fallback to first variant image
  if (product.variants && product.variants.length > 0) {
    for (const variant of product.variants) {
      if (variant.image_urls && variant.image_urls.length > 0) {
        return variant.image_urls[0];
      }
    }
  }
  
  return "/placeholder.svg";
};
```

## Checkout Process

### 1. Creating Checkout Session

**File**: `app/api/create-product-checkout/route.ts`

#### Item Payload Structure
```typescript
// Build item payload for checkout
const itemPayload = {
  product_id: product.id,
  quantity: quantity,
  // Only include variant_id if variant is selected
  ...(selectedVariant && { variant_id: selectedVariant.id })
};
```

#### Variant Price Resolution
```typescript
// Fetch product with Stripe pricing data
const { data: product } = await supabase
  .from('products')
  .select('connected_stripe_price_id, stripe_price_id, connected_stripe_products, stripe_products')
  .eq('id', item.product_id)
  .single();

let priceId = null;

// If item has variant_id, find specific variant's price
if (item.variant_id) {
  console.log('[CHECKOUT] Looking for variant price, variant_id:', item.variant_id);
  
  // First try connected_stripe_products (for connected accounts)
  if (product.connected_stripe_products?.length > 0) {
    const connectedVariant = product.connected_stripe_products.find(
      v => v.variant_id === item.variant_id
    );
    if (connectedVariant?.connected_stripe_price_id) {
      priceId = connectedVariant.connected_stripe_price_id;
    }
  }
  
  // Fallback to platform stripe_products
  if (!priceId && product.stripe_products?.length > 0) {
    const platformVariant = product.stripe_products.find(
      v => v.variant_id === item.variant_id
    );
    if (platformVariant?.stripe_price_id) {
      priceId = platformVariant.stripe_price_id;
    }
  }
}

// If no variant-specific price found, use main product price
if (!priceId) {
  priceId = product.connected_stripe_price_id || product.stripe_price_id;
}
```

### 2. Stripe Session Creation
```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: itemPriceIds.map(item => ({
    price: item.price, // Resolved variant or product price
    quantity: item.quantity,
    adjustable_quantity: {
      enabled: true,
      minimum: 1,
      maximum: 10,
    },
  })),
  mode: 'payment',
  success_url: `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${request.nextUrl.origin}/shop-all?canceled=true`,
  metadata: {
    store_id: storeId,
    store_name: storeName,
  },
  // ... other session options
}, {
  stripeAccount: store.stripe_account_id // For connected accounts
});
```

## Stock Management

### Order Processing and Stock Updates

**File**: `app/api/stripe/webhook/route.ts`

#### Variant Identification in Webhook
```typescript
// Extract variant info from Stripe line items
const products = await Promise.all(
  lineItems.data.map(async (item) => {
    let supabaseProductId = null;
    let variantId = null;
    const stripeProduct = item.price?.product;
    
    // Check metadata for variant information
    if (stripeProduct.metadata?.variant_id) {
      variantId = stripeProduct.metadata.variant_id;
    }
    
    if (stripeProduct.metadata?.supabase_product_id) {
      supabaseProductId = stripeProduct.metadata.supabase_product_id;
    }
    
    return {
      product_id: supabaseProductId,
      variant_id: variantId,
      quantity: item.quantity,
      price: item.amount_total / 100,
    };
  })
);
```

#### Stock Decrement Logic
```typescript
// Process each product in the order
for (const item of products) {
  if (!item.product_id) continue;
  
  if (item.variant_id) {
    // Handle variant stock decrement
    const { data: product } = await supabase
      .from('products')
      .select('id, variants')
      .eq('id', item.product_id)
      .single();
    
    if (product?.variants) {
      const updatedVariants = product.variants.map(variant => {
        if (variant.id === item.variant_id) {
          const newStock = Math.max(0, (variant.stock || 0) - (item.quantity || 0));
          console.log(`Variant ${variant.id}: ${variant.stock || 0} -> ${newStock}`);
          return { ...variant, stock: newStock };
        }
        return variant;
      });
      
      // Update the entire variants array
      await supabase
        .from('products')
        .update({ variants: updatedVariants })
        .eq('id', item.product_id);
    }
  } else {
    // Handle simple product stock decrement
    const { data: currentProduct } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single();
    
    const newStock = Math.max(0, (currentProduct?.stock || 0) - (item.quantity || 0));
    
    await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', item.product_id);
  }
}
```

## API Reference

### Endpoints

#### GET `/products/[id]`
Fetches a single product with all variant data.

**Response:**
```json
{
  "id": "product_uuid",
  "name": "Product Name",
  "price": 25.00,
  "stock": 5,
  "variants": [
    {
      "id": "variant_1",
      "name": "Small",
      "price": 20.00,
      "stock": 3,
      "attributes": {
        "size": "S"
      }
    }
  ]
}
```

#### POST `/api/create-product-checkout`
Creates a Stripe checkout session for products with variants.

**Request:**
```json
{
  "items": [
    {
      "product_id": "product_uuid",
      "variant_id": "variant_uuid", // Optional
      "quantity": 2
    }
  ],
  "storeId": "store_uuid",
  "storeName": "Store Name",
  "discountCode": "SAVE10" // Optional
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/pay/..."
}
```

### Database Queries

#### Fetch Products with Variants
```sql
SELECT *
FROM products
WHERE store_id = 'store_uuid'
  AND active = true
ORDER BY created_at DESC;
```

#### Update Variant Stock
```sql
UPDATE products
SET variants = '[updated_variants_array]'
WHERE id = 'product_uuid';
```

## Integration Points

### Supabase Configuration
- **Database**: PostgreSQL with JSON column support
- **Row Level Security**: Enabled for store isolation
- **Real-time**: Optional for live stock updates

### Stripe Configuration
- **Connected Accounts**: For multi-vendor support
- **Webhooks**: For order processing and stock management
- **Metadata**: For variant identification

### Next.js Configuration
- **Server Components**: For SEO-friendly product pages
- **API Routes**: For checkout and webhook processing
- **Environment Variables**: For service configuration

## Best Practices

### Performance Optimization
1. **Indexing**: Create indexes on `store_id` and `active` fields
2. **Caching**: Implement Redis caching for frequently accessed products
3. **Image Optimization**: Use Next.js Image component with proper sizing
4. **Pagination**: Implement pagination for large product catalogs

### Error Handling
1. **Graceful Degradation**: Handle missing variant data
2. **Stock Validation**: Validate stock before checkout
3. **Webhook Retry**: Implement idempotency for webhook processing

### Security Considerations
1. **Input Validation**: Validate all variant data inputs
2. **Price Verification**: Verify prices with Stripe before checkout
3. **Stock Race Conditions**: Handle concurrent stock updates

### Data Consistency
1. **Atomic Updates**: Use database transactions for stock updates
2. **Webhook Idempotency**: Prevent duplicate order processing
3. **Backup Strategy**: Regular backups of product and variant data

### Monitoring and Logging
1. **Error Tracking**: Monitor variant-related errors
2. **Performance Metrics**: Track variant selection patterns
3. **Stock Alerts**: Alert when variant stock is low

## Email Notifications

### Order Confirmation Email Implementation

After successful order processing, the system automatically sends order confirmation emails to customers. This is implemented in the Stripe webhook handler.

**File**: `app/api/stripe/webhook/route.ts`

#### Email Trigger Process

The email sending is triggered after the `checkout.session.completed` webhook event is processed:

```typescript
// 5. Send order confirmation email
try {
  // Fetch the complete order with customer and product details
  if (!orderData?.id) {
    console.error('Order data is null or missing ID');
    return NextResponse.json({ error: 'Order creation failed' }, { status: 500 });
  }

  const { data: completeOrder, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      customers (
        id,
        name,
        email,
        address
      )
    `)
    .eq('id', orderData.id)
    .single();
```

#### Email Data Preparation

The system prepares comprehensive order data for the email:

```typescript
// Prepare order items with product details
const orderItemsWithProducts = await Promise.all(
  products.map(async (item) => {
    const { data: product } = await supabase
      .from('products')
      .select('id, name, image_urls, price, variants')
      .eq('id', item.product_id)
      .single();

    return {
      ...item,
      products: product || {}
    };
  })
);

// Prepare order data for email
const emailOrderData = {
  id: completeOrder.id,
  customer_email: completeOrder.customers?.email || session.customer_details?.email,
  customer_name: completeOrder.customers?.name || session.customer_details?.name,
  total_amount: completeOrder.total,
  currency: store?.currency || 'gbp',
  created_at: completeOrder.created_at,
  order_items: orderItemsWithProducts
};
```

#### Variant Information in Email

For products with variants, the email includes:
- **Product Details**: Base product information (name, images, base price)
- **Variant Details**: Specific variant information if applicable
- **Quantity**: Number of items ordered
- **Price**: Final price paid (including variant pricing)

The `orderItemsWithProducts` array contains:
```typescript
{
  product_id: "uuid",
  variant_id: "variant_uuid", // Only if variant was selected
  quantity: 2,
  price: 29.99,
  products: {
    id: "uuid",
    name: "Product Name",
    image_urls: ["url1", "url2"],
    price: 25.00,
    variants: [
      {
        id: "variant_uuid",
        name: "Large",
        price: 29.99,
        attributes: {
          size: "L",
          color: "Blue"
        }
      }
    ]
  }
}
```

#### Email Service Integration

The system uses Supabase Edge Functions to handle email sending:

```typescript
// Call the Supabase Edge Function to send email
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl && supabaseServiceKey) {
  const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      order: emailOrderData,
      store_name: store?.name || 'Your Store',
      store_logo: null // No logo_url column in stores table
    }),
  });

  if (emailResponse.ok) {
    const emailResult = await emailResponse.json();
    console.log('Order confirmation email sent successfully:', emailResult);
  } else {
    const errorText = await emailResponse.text();
    console.error('Failed to send order confirmation email:', errorText);
  }
}
```

#### Email Dependencies

The project includes the following email-related dependencies:

- **Resend**: Email delivery service (`resend: "^4.7.0"`)
- **@react-email/render**: For rendering React-based email templates

#### Email Payload Structure

The complete email payload sent to the edge function:

```json
{
  "order": {
    "id": "order_uuid",
    "customer_email": "customer@example.com",
    "customer_name": "John Doe",
    "total_amount": 59.98,
    "currency": "gbp",
    "created_at": "2025-08-28T10:00:00Z",
    "order_items": [
      {
        "product_id": "product_uuid",
        "variant_id": "variant_uuid",
        "quantity": 2,
        "price": 29.99,
        "products": {
          "id": "product_uuid",
          "name": "T-Shirt",
          "image_urls": ["https://example.com/image.jpg"],
          "price": 25.00,
          "variants": [...]
        }
      }
    ]
  },
  "store_name": "Your Store",
  "store_logo": null
}
```

#### Error Handling

Email sending is designed to be fault-tolerant:

```typescript
} catch (emailError) {
  console.error('Error in email sending process:', emailError);
  // Don't fail the webhook if email fails
}
```

- Email failures don't cause the entire webhook to fail
- Comprehensive error logging for debugging
- Graceful degradation if email service is unavailable

#### Variant Display in Emails

When displaying order items in emails, the system:

1. **Shows Product Name**: Base product information
2. **Includes Variant Details**: If variant was selected, shows variant name and attributes
3. **Displays Correct Price**: Uses the variant-specific price that was actually charged
4. **Shows Product Images**: Combines base product and variant images
5. **Includes Quantity**: Number of specific variant items ordered

This ensures customers receive clear, detailed information about exactly what they purchased, including any specific variants they selected.

---

**Last Updated**: August 28, 2025  
**Version**: 1.1  
**Author**: Pixeocommerce Development Team
