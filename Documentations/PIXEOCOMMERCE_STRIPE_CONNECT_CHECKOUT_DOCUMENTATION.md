# Pixeocommerce Stripe Connect Checkout System Documentation

## Overview

This document provides comprehensive documentation for the Pixeocommerce Stripe Connect checkout system, designed to handle multi-tenant ecommerce stores with individual Stripe Connect accounts. This is the standard implementation for all Pixeocommerce websites.

## System Architecture

### Multi-Tenant Design
The system supports multiple independent stores, each with their own:
- Stripe Connect account
- Product catalog
- Shipping methods
- Discount codes
- Customer base
- Order management

### Core Components

1. **Database Layer** (Supabase)
2. **Frontend Checkout UI**
3. **API Endpoints**
4. **Stripe Connect Integration**
5. **Webhook Processing**
6. **Email Notifications**

---

## Database Schema

### Required Tables

#### 1. Stores Table
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  currency VARCHAR(3) DEFAULT 'gbp',
  contact_email VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'UTC',
  language VARCHAR(10) DEFAULT 'en',
  stripe_account_id VARCHAR(255), -- Connected Stripe account ID
  is_disabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Products Table
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  image_urls TEXT[],
  variants JSONB, -- For product variants
  -- Stripe Integration Fields
  stripe_price_id VARCHAR(255), -- Platform Stripe price ID
  connected_stripe_price_id VARCHAR(255), -- Connected account price ID
  stripe_products JSONB, -- Platform Stripe product variants
  connected_stripe_products JSONB, -- Connected account variants
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. Customers Table
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  address JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. Orders Table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID REFERENCES customers(id),
  status VARCHAR(50) DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL,
  stripe_session_id VARCHAR(255),
  products JSONB, -- Array of ordered products
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. Shipping Methods Table
```sql
CREATE TABLE shipping_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  name VARCHAR(255) NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  estimated_days INTEGER,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. Discounts Table
```sql
CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  code VARCHAR(50) NOT NULL,
  stripe_coupon_id VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Frontend Implementation

### 1. Checkout Page Component

**Location**: `app/checkout/page.tsx`

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../../contexts/CartContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const [customer, setCustomer] = useState({ name: "", email: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [discountCode, setDiscountCode] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const payload = {
        items: cartItems,
        storeId: process.env.NEXT_PUBLIC_STORE_ID,
        storeName: "Your Store Name",
        discountCode,
      };
      
      const res = await fetch("/api/create-product-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Failed to start checkout");
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-6 max-w-xl">
        <h1 className="text-3xl font-light tracking-wide mb-8">Checkout</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div>
            <label className="block mb-2">Name</label>
            <input 
              name="name" 
              value={customer.name} 
              onChange={(e) => setCustomer({...customer, name: e.target.value})} 
              required 
              className="w-full border px-4 py-2" 
            />
          </div>
          
          <div>
            <label className="block mb-2">Email</label>
            <input 
              name="email" 
              type="email"
              value={customer.email} 
              onChange={(e) => setCustomer({...customer, email: e.target.value})} 
              required 
              className="w-full border px-4 py-2" 
            />
          </div>
          
          <div>
            <label className="block mb-2">Address</label>
            <textarea 
              name="address" 
              value={customer.address} 
              onChange={(e) => setCustomer({...customer, address: e.target.value})} 
              required 
              className="w-full border px-4 py-2" 
            />
          </div>
          
          {/* Discount Code */}
          <div>
            <label className="block mb-2">Discount Code</label>
            <input
              type="text"
              value={discountCode}
              onChange={e => setDiscountCode(e.target.value)}
              placeholder="Enter code"
              className="w-full border px-4 py-2"
            />
          </div>
          
          {/* Order Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <span>Subtotal</span>
              <span>${getCartTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
          </div>
          
          {error && <div className="text-red-600">{error}</div>}
          
          <button 
            type="submit" 
            className="w-full bg-primary text-white py-3 rounded" 
            disabled={loading}
          >
            {loading ? "Processing..." : "Proceed to Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 2. Product Page Buy Now Implementation

**Location**: `app/products/[id]/page.tsx`

```tsx
const handleBuyNow = async () => {
  if (!product) return;
  setIsAddedToCart(true);

  try {
    const itemPayload: any = {
      product_id: product.id,
      quantity: quantity
    };
    
    if (selectedVariant) {
      itemPayload.variant_id = selectedVariant.id;
    }

    const response = await fetch('/api/create-product-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [itemPayload],
        storeId: process.env.NEXT_PUBLIC_STORE_ID,
        storeName: "Your Store",
        discountCode: discountCode,
      }),
    });

    const { url, error } = await response.json();
    
    if (error) {
      alert(`Failed to create checkout session: ${error}`);
      setIsAddedToCart(false);
      return;
    }

    window.location.href = url;
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Failed to create checkout session. Please try again.');
    setIsAddedToCart(false);
  }
};
```

---

## API Implementation

### 1. Checkout Session Creation

**Endpoint**: `/api/create-product-checkout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request
    const { items, storeId, storeName, discountCode } = await request.json();
    
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // 2. Fetch store and validate Stripe connection
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('stripe_account_id, currency')
      .eq('id', storeId)
      .single();

    if (storeError || !store?.stripe_account_id) {
      return NextResponse.json({ 
        error: 'Store is not connected to Stripe' 
      }, { status: 400 });
    }

    // 3. Fetch shipping methods
    const { data: shippingMethods } = await supabase
      .from('shipping_methods')
      .select('*')
      .eq('store_id', storeId)
      .eq('active', true)
      .order('sort_order', { ascending: true });

    // 4. Convert shipping methods to Stripe format
    const shippingOptions = shippingMethods?.map((method) => ({
      shipping_rate_data: {
        type: 'fixed_amount' as const,
        fixed_amount: {
          amount: Math.round(method.rate * 100),
          currency: store.currency.toLowerCase(),
        },
        display_name: method.name,
        delivery_estimate: {
          minimum: { unit: 'business_day' as const, value: 3 },
          maximum: { unit: 'business_day' as const, value: 7 },
        },
      },
    })) || [];

    // 5. Validate discount code
    let couponId = undefined;
    if (discountCode) {
      const { data: discount, error: discountError } = await supabase
        .from('discounts')
        .select('stripe_coupon_id')
        .eq('store_id', storeId)
        .eq('code', discountCode)
        .eq('active', true)
        .single();
        
      if (discountError || !discount?.stripe_coupon_id) {
        return NextResponse.json({ 
          error: 'Invalid or inactive discount code' 
        }, { status: 400 });
      }
      couponId = discount.stripe_coupon_id;
    }

    // 6. Process items and get Stripe price IDs
    const itemPriceIds = [];
    for (const item of items) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('connected_stripe_price_id, stripe_price_id, connected_stripe_products, stripe_products')
        .eq('id', item.product_id)
        .single();

      if (productError || !product) {
        return NextResponse.json({ 
          error: 'Product not found',
          details: `Product ID: ${item.product_id}` 
        }, { status: 400 });
      }

      let priceId = null;

      // Handle variant pricing
      if (item.variant_id) {
        // Try connected account variants first
        if (product.connected_stripe_products?.length > 0) {
          const connectedVariant = product.connected_stripe_products.find(
            (v: any) => v.variant_id === item.variant_id
          );
          priceId = connectedVariant?.connected_stripe_price_id;
        }
        
        // Fallback to platform variants
        if (!priceId && product.stripe_products?.length > 0) {
          const platformVariant = product.stripe_products.find(
            (v: any) => v.variant_id === item.variant_id
          );
          priceId = platformVariant?.stripe_price_id;
        }
      }

      // Use main product price if no variant price found
      if (!priceId) {
        priceId = product.connected_stripe_price_id || product.stripe_price_id;
      }

      if (!priceId) {
        return NextResponse.json({ 
          error: 'Price not found for item' 
        }, { status: 400 });
      }

      itemPriceIds.push({
        price: priceId,
        quantity: item.quantity
      });
    }

    // 7. Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: itemPriceIds.map((item) => ({
        price: item.price,
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
        items_count: items.length.toString(),
        discount_code: discountCode || '',
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      },
      shipping_options: shippingOptions,
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
      // application_fee_amount: 100, // Optional: platform fee in cents
    }, {
      stripeAccount: store.stripe_account_id, // CRITICAL: Use connected account
    });

    return NextResponse.json({ 
      sessionId: session.id, 
      url: session.url 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

### 2. Shipping Methods API

**Endpoint**: `/api/shipping-methods/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const { data: shippingMethods, error } = await supabase
      .from('shipping_methods')
      .select('*')
      .eq('store_id', storeId)
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch shipping methods' }, { status: 500 });
    }

    return NextResponse.json({ shippingMethods: shippingMethods || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Stripe Webhook Implementation

### Webhook Handler

**Endpoint**: `/api/stripe/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ 
      error: 'Webhook signature verification failed.' 
    }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const connectedAccountId = event.account; // Connected account ID

    try {
      // 1. Upsert customer
      const { data: customerData } = await supabase
        .from('customers')
        .upsert([{
          store_id: session.metadata?.store_id,
          email: session.customer_details?.email,
          name: session.customer_details?.name,
          address: session.customer_details?.address || null,
        }])
        .select('id')
        .single();

      // 2. Fetch line items from Stripe
      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
        { expand: ['data.price.product'] },
        connectedAccountId ? { stripeAccount: connectedAccountId } : undefined
      );

      // 3. Process products from line items
      const products = await Promise.all(
        lineItems.data.map(async (item) => {
          let supabaseProductId = null;
          let variantId = null;
          const stripeProduct = item.price?.product;

          // Extract product metadata
          if (typeof stripeProduct === 'object' && 'metadata' in stripeProduct) {
            supabaseProductId = stripeProduct.metadata?.supabase_product_id || 
                              stripeProduct.metadata?.product_id;
            variantId = stripeProduct.metadata?.variant_id;
          } else if (typeof stripeProduct === 'string') {
            const productObj = await stripe.products.retrieve(
              stripeProduct,
              connectedAccountId ? { stripeAccount: connectedAccountId } : undefined
            );
            supabaseProductId = productObj.metadata?.supabase_product_id || 
                              productObj.metadata?.product_id;
            variantId = productObj.metadata?.variant_id;
          }

          return {
            product_id: supabaseProductId,
            variant_id: variantId,
            quantity: item.quantity,
            price: item.amount_total ? item.amount_total / 100 : 0,
          };
        })
      );

      // 4. Create order record
      const { data: orderData } = await supabase
        .from('orders')
        .insert([{
          store_id: session.metadata?.store_id,
          customer_id: customerData?.id,
          status: 'paid',
          total: session.amount_total ? session.amount_total / 100 : 0,
          stripe_session_id: session.id,
          products: products,
        }])
        .select('id')
        .single();

      // 5. Update stock levels
      for (const item of products) {
        if (!item.product_id) continue;

        try {
          if (item.variant_id) {
            // Update variant stock
            const { data: product } = await supabase
              .from('products')
              .select('variants')
              .eq('id', item.product_id)
              .single();

            if (product?.variants) {
              const updatedVariants = product.variants.map((variant: any) => {
                if (variant.id === item.variant_id) {
                  return { 
                    ...variant, 
                    stock: Math.max(0, (variant.stock || 0) - (item.quantity || 0))
                  };
                }
                return variant;
              });

              await supabase
                .from('products')
                .update({ variants: updatedVariants })
                .eq('id', item.product_id);
            }
          } else {
            // Update simple product stock
            const { data: currentProduct } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.product_id)
              .single();

            const currentStock = currentProduct?.stock || 0;
            const newStock = Math.max(0, currentStock - (item.quantity || 0));

            await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', item.product_id);
          }
        } catch (stockError) {
          console.error('Error updating stock:', stockError);
        }
      }

      // 6. Send order confirmation email (optional)
      // Implementation depends on your email service

    } catch (err) {
      console.error('Webhook processing error:', err);
      return NextResponse.json({ 
        error: 'Order processing failed' 
      }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
```

---

## Stripe Configuration

### 1. Stripe Client Setup

**File**: `lib/stripe.ts`

```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});
```

### 2. Product Creation API

**Endpoint**: `/api/stripe/create-product/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { supabaseProductId, name, description, price, images } = await request.json();
    
    // Create Stripe product
    const stripeProduct = await stripe.products.create({
      name: name,
      description: description || '',
      images: images || [],
      metadata: {
        supabase_product_id: supabaseProductId
      }
    });

    // Create Stripe price
    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(price * 100), // Convert to cents
      currency: 'usd',
    });

    return NextResponse.json({ 
      success: true, 
      stripeProduct: {
        id: stripeProduct.id,
        name: stripeProduct.name,
        metadata: stripeProduct.metadata
      },
      stripePrice: {
        id: stripePrice.id,
        unit_amount: stripePrice.unit_amount
      }
    });
  } catch (error) {
    console.error('Error creating Stripe product:', error);
    return NextResponse.json({ 
      error: 'Failed to create Stripe product' 
    }, { status: 500 });
  }
}
```

---

## Environment Configuration

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_live_... # or sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Store Configuration
NEXT_PUBLIC_STORE_ID=your_store_uuid

# Optional: Email Service
RESEND_API_KEY=your_resend_key # if using Resend for emails
```

---

## Implementation Guide

### Step 1: Database Setup

1. **Create all required tables** using the SQL schemas provided above
2. **Set up Row Level Security (RLS)** in Supabase:

```sql
-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;

-- Create policies (example for products)
CREATE POLICY "Products are viewable by everyone" 
ON products FOR SELECT 
USING (true);

CREATE POLICY "Products are editable by store owners" 
ON products FOR ALL 
USING (auth.uid() IN (
  SELECT user_id FROM store_users WHERE store_id = products.store_id
));
```

### Step 2: Frontend Implementation

1. **Install required dependencies**:
```bash
npm install @stripe/stripe-js stripe
```

2. **Set up cart context** (if not already done):
```typescript
// contexts/CartContext.tsx
// Implementation provided in previous documentation
```

3. **Create checkout page** using the component provided above

4. **Update product pages** to include Buy Now functionality

### Step 3: API Implementation

1. **Create all API endpoints** as shown in the documentation above
2. **Configure Stripe webhook endpoint** in your Stripe dashboard
3. **Test webhook locally** using Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Step 4: Stripe Connect Setup

1. **Create Stripe Connect application** in your Stripe dashboard
2. **Implement store onboarding flow** (not covered in this template)
3. **Store connected account IDs** in your stores table

### Step 5: Testing

1. **Test checkout flow** with test products
2. **Verify webhook processing** 
3. **Test discount codes**
4. **Test shipping methods**
5. **Verify order creation** and stock updates

---

## Key Features

### ✅ Multi-Tenant Support
- Each store has its own Stripe Connect account
- Isolated customer bases and orders
- Store-specific shipping methods and discounts

### ✅ Flexible Product System
- Support for simple products and variants
- Dual price system (platform + connected account)
- Automatic stock management

### ✅ Comprehensive Checkout
- Dynamic shipping options
- Discount code validation
- Address collection
- Multi-currency support

### ✅ Robust Webhook Processing
- Automatic order creation
- Stock level updates
- Customer management
- Error handling and logging

### ✅ Platform Revenue
- Optional application fees
- Transparent fee structure
- Revenue splitting

---

## Security Considerations

### 1. Environment Variables
- Never expose secret keys in frontend code
- Use service role keys only in server-side code
- Rotate webhook secrets regularly

### 2. Webhook Security
- Always verify webhook signatures
- Implement idempotency for webhook processing
- Log all webhook events for debugging

### 3. Database Security
- Use Row Level Security (RLS)
- Validate all user inputs
- Sanitize data before database operations

### 4. Stripe Security
- Use connected account IDs correctly
- Validate store ownership before operations
- Implement proper error handling

---

## Troubleshooting

### Common Issues

1. **Checkout session creation fails**
   - Check store has valid stripe_account_id
   - Verify products have valid price IDs
   - Ensure all environment variables are set

2. **Webhook not processing**
   - Verify webhook signature
   - Check webhook endpoint URL
   - Review webhook event logs in Stripe dashboard

3. **Products not found**
   - Verify product exists in database
   - Check store_id matches
   - Ensure product has valid Stripe price ID

4. **Shipping methods not appearing**
   - Check shipping_methods table has active records
   - Verify store_id is correct
   - Review API response in browser network tab

### Debug Steps

1. **Check browser console** for JavaScript errors
2. **Review API logs** in your deployment platform
3. **Use Stripe dashboard** to inspect sessions and payments
4. **Query Supabase** directly to verify data integrity
5. **Test webhook locally** using Stripe CLI

---

## Monitoring and Analytics

### Key Metrics to Track

1. **Checkout conversion rate**
2. **Failed payment attempts**
3. **Average order value**
4. **Popular shipping methods**
5. **Discount code usage**

### Logging Strategy

1. **Log all checkout attempts**
2. **Track webhook processing times**
3. **Monitor API response times**
4. **Alert on critical errors**

---

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Database tables created with proper indexes
- [ ] RLS policies implemented
- [ ] Stripe webhook endpoint configured
- [ ] Webhook secret added to environment
- [ ] Test transactions completed successfully
- [ ] Error handling tested
- [ ] Monitoring and logging configured
- [ ] SSL certificates installed
- [ ] Domain configured for webhooks

---

This documentation provides a complete guide for implementing the Pixeocommerce Stripe Connect checkout system across all your ecommerce websites. Follow the step-by-step instructions for consistent implementation and reliable multi-tenant commerce functionality.
