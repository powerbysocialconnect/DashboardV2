# 🚀 PixeoCommerce Storefront Development Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Environment Setup](#environment-setup)
6. [Core Components](#core-components)
7. [API Integration](#api-integration)
8. [Stripe Integration](#stripe-integration)
9. [Checkout System](#checkout-system)
10. [Webhook System](#webhook-system)
11. [Discount System](#discount-system)
12. [Multi-Image Gallery](#multi-image-gallery)
13. [Currency & Localization](#currency--localization)
14. [Product Management](#product-management)
15. [Product Variations System](#product-variations-system)
16. [Order Processing](#order-processing)
17. [Email System](#email-system)
18. [Deployment](#deployment)
17. [Testing Checklist](#testing-checklist)
18. [Troubleshooting & Debug Guide](#troubleshooting--debug-guide)

---

## 🎯 Overview

This guide provides everything needed to build and ship e-commerce storefronts that integrate seamlessly with the PixeoCommerce Dashboard. The system supports:

- **Multi-tenant architecture** with individual store configurations
- **Stripe Connect integration** for vendor payouts
- **Dynamic currency management** across all components
- **Product variants** with individual pricing
- **Real-time inventory** management
- **Automated email confirmations** for orders
- **Responsive design** with modern UI components

---

## 🔧 Prerequisites

### Required Tools
- **Node.js** (v18+)
- **npm/pnpm** package manager
- **Git** for version control
- **Vercel CLI** for deployment
- **Supabase CLI** for database management
- **Stripe account** with Connect enabled

### Required Accounts
- **Vercel** account for hosting
- **Supabase** account for database
- **Stripe** account with Connect
- **Resend** account for emails

---

## 📁 Project Structure

```
storefront/
├── app/
│   ├── api/
│   │   ├── create-product-checkout/
│   │   │   └── route.ts          # Stripe checkout creation
│   │   ├── shipping-methods/
│   │   │   └── route.ts          # Shipping options API
│   │   └── stripe/
│   │       └── webhook/
│   │           └── route.ts       # Order processing webhook
│   ├── cart/
│   │   └── page.tsx              # Shopping cart page
│   ├── checkout/
│   │   └── page.tsx              # Checkout page
│   ├── products/
│   │   └── [id]/
│   │       └── page.tsx          # Product detail page
│   ├── shop-all/
│   │   └── page.tsx              # Product listing page
│   ├── shipping-returns/
│   │   └── page.tsx              # Shipping info page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage
├── components/
│   ├── Header.tsx                # Store header
│   ├── Footer.tsx                # Store footer
│   ├── Hero.tsx                  # Homepage hero
│   ├── FeaturedCategories.tsx    # Category showcase
│   ├── NewArrivals.tsx           # New products
│   ├── BrandStory.tsx            # Brand section
│   ├── Newsletter.tsx            # Newsletter signup
│   └── ui/                       # Shadcn UI components
├── contexts/
│   └── CartContext.tsx           # Shopping cart state
├── lib/
│   ├── supabase.ts               # Database client
│   ├── stripe.ts                 # Stripe configuration
│   └── utils.ts                  # Utility functions
├── public/                       # Static assets
├── styles/
│   └── globals.css               # Global styles
├── env.example                   # Environment template
├── package.json                  # Dependencies
├── tailwind.config.js            # Tailwind config
└── next.config.mjs               # Next.js config
```

---

## 🗄️ Database Schema

### Core Tables

#### `stores` Table
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  stripe_account_id TEXT,
  currency TEXT DEFAULT 'gbp',
  contact_email TEXT,
  description TEXT,
  branding JSONB,
  is_disabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `products` Table
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  sku TEXT,
  category_id UUID REFERENCES categories(id),
  variants JSONB DEFAULT '[]',
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  connected_stripe_product_id TEXT,
  connected_stripe_price_id TEXT,
  stripe_products JSONB,
  connected_stripe_products JSONB,
  featured BOOLEAN DEFAULT false,
  best_seller BOOLEAN DEFAULT false,
  new_arrival BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `orders` Table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  customer_id UUID REFERENCES customers(id),
  stripe_session_id TEXT,
  status TEXT DEFAULT 'pending',
  total_amount NUMERIC(10,2),
  currency TEXT DEFAULT 'gbp',
  shipping_address JSONB,
  billing_address JSONB,
  items JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `customers` Table
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## ⚙️ Environment Setup

### 1. Create Environment File
```bash
cp env.example .env.local
```

### 2. Required Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Store Configuration
NEXT_PUBLIC_STORE_ID=your_store_uuid
NEXT_PUBLIC_STORE_SUBDOMAIN=your_store_subdomain

# Email Configuration
RESEND_API_KEY=your_resend_api_key
```

### 3. Install Dependencies
```bash
npm install
# or
pnpm install
```

---

## 🛒 Checkout System

### Complete Working Checkout Implementation

The checkout system integrates with PixeoCommerce's multi-tenant architecture. **IMPORTANT: All PixeoCommerce stores use PLATFORM Stripe accounts by default, not connected accounts.**

#### Platform vs Connected Accounts

**Platform Account (Default for PixeoCommerce):**
- ✅ Uses your main Stripe account for all transactions
- ✅ `stripe_account_id` in stores table should be `NULL`
- ✅ Products use `stripe_price_id` (not `connected_stripe_price_id`)
- ✅ Checkout sessions created without `stripeAccount` parameter
- ✅ Simpler setup and management

**Connected Account (Rarely Used):**
- ❌ Only for marketplace/multi-vendor setups
- ❌ Requires separate Stripe Connect onboarding
- ❌ More complex fee structures
- ❌ Not the standard PixeoCommerce setup

#### 1. Database Requirements

**Required Tables:**

```sql
-- Stores table (must exist)
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  currency VARCHAR(3) DEFAULT 'gbp',
  contact_email VARCHAR(255),
  stripe_account_id VARCHAR(255), -- IMPORTANT: Should be NULL for platform accounts (default setup)
  is_disabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRITICAL: Most PixeoCommerce stores use PLATFORM accounts
-- This means stripe_account_id should be NULL (not a connected account ID)
-- Platform accounts use the main Stripe account for all transactions

-- Products table with proper pricing structure
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  image_urls TEXT[], -- Multiple images support
  variants JSONB,
  -- CRITICAL: At least one of these must be populated
  stripe_price_id VARCHAR(255), -- Platform Stripe price ID (MOST COMMON - use this)
  connected_stripe_price_id VARCHAR(255), -- Connected account price ID (rarely used)
  stripe_products JSONB, -- Platform variant prices (MOST COMMON - use this)
  connected_stripe_products JSONB, -- Connected variant prices (rarely used)
  featured BOOLEAN DEFAULT false,
  best_seller BOOLEAN DEFAULT false,
  new_arrival BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shipping methods table (optional - defaults provided if missing)
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

-- Discounts table (optional - for discount codes)
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

#### 2. Checkout API Implementation (CORRECTED VERSION)

**File:** `app/api/create-cart-checkout/route.ts`

**IMPORTANT:** This is the corrected version that fixes the price priority issue and works with connected accounts.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    // Debug environment variables (helpful for troubleshooting)
    console.log('🔧 Environment check:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    });

    // Parse and validate request
    const { items, storeId, storeName, discountCode } = await request.json();
    
    console.log('🛒 Checkout API called with:', {
      itemsCount: items?.length,
      storeId,
      storeName,
      discountCode,
      items: items?.slice(0, 3) // Log first 3 items for debugging
    });
    
    if (!items || items.length === 0) {
      console.error('❌ No items provided');
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    if (!storeId) {
      console.error('❌ No store ID provided');
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Fetch store and validate
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('stripe_account_id, currency')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ 
        error: 'Store not found' 
      }, { status: 400 });
    }

    // Fetch shipping methods (with graceful fallback)
    let shippingMethods: any[] = [];
    try {
      const { data, error } = await supabase
        .from('shipping_methods')
        .select('*')
        .eq('store_id', storeId)
        .eq('active', true)
        .order('sort_order', { ascending: true });
      
      if (error) {
        // Use default shipping methods if table doesn't exist
        shippingMethods = [
          { name: 'Standard Shipping', rate: 0 },
          { name: 'Express Shipping', rate: 9.99 }
        ];
      } else {
        shippingMethods = data || [];
      }
    } catch (err) {
      shippingMethods = [
        { name: 'Standard Shipping', rate: 0 },
        { name: 'Express Shipping', rate: 9.99 }
      ];
    }

    // Convert shipping methods to Stripe format
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

    // Validate discount code (graceful fallback)
    let couponId = undefined;
    if (discountCode) {
      try {
        const { data: discount, error: discountError } = await supabase
          .from('discounts')
          .select('stripe_coupon_id')
          .eq('store_id', storeId)
          .eq('code', discountCode)
          .eq('active', true)
          .single();
          
        if (!discountError && discount?.stripe_coupon_id) {
          couponId = discount.stripe_coupon_id;
        }
      } catch (err) {
        // Skip discount if table doesn't exist
        couponId = undefined;
      }
    }

    // Process items and get Stripe price IDs
    const itemPriceIds = [];
    
    for (const item of items) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, stripe_price_id, connected_stripe_price_id, connected_stripe_products, stripe_products, variants')
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
          if (connectedVariant?.connected_stripe_price_id) {
            priceId = connectedVariant.connected_stripe_price_id;
          }
        }
        
        // Fallback to platform variants
        if (!priceId && product.stripe_products?.length > 0) {
          const platformVariant = product.stripe_products.find(
            (v: any) => v.variant_id === item.variant_id
          );
          if (platformVariant?.stripe_price_id) {
            priceId = platformVariant.stripe_price_id;
          }
        }
      }

      // Use main product price if no variant price found
      // ✅ CORRECTED PRIORITY ORDER FOR PIXEOCOMMERCE STORES:
      if (!priceId) {
        // Priority 1: connected_stripe_price_id (Connected Account) - MOST COMMON for PixeoCommerce
        if (product.connected_stripe_price_id) {
          priceId = product.connected_stripe_price_id;
          console.log('✅ Using connected product price:', priceId);
        }
        // Priority 2: stripe_price_id (Platform Account) - fallback
        else if (product.stripe_price_id) {
          priceId = product.stripe_price_id;
          console.log('✅ Using platform product price:', priceId);
        }
      }

      if (!priceId) {
        return NextResponse.json({ 
          error: 'Price not found for item',
          details: `Product "${product.name}" is missing Stripe price configuration. Please add stripe_price_id or connected_stripe_price_id.`
        }, { status: 400 });
      }

      itemPriceIds.push({
        price: priceId,
        quantity: item.quantity
      });
    }

    // Create Stripe checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
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
      cancel_url: `${request.nextUrl.origin}/?canceled=true`,
      metadata: {
        store_id: storeId,
        store_name: storeName || '',
        items_count: items.length.toString(),
        discount_code: discountCode || '',
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      },
      shipping_options: shippingOptions,
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
    };

    // ✅ CORRECTED: PixeoCommerce stores use CONNECTED accounts 
    // Create session in connected account context (as documented)
    const session = await stripe.checkout.sessions.create(sessionConfig, {
      stripeAccount: store.stripe_account_id,
    });

    return NextResponse.json({ 
      sessionId: session.id, 
      url: session.url 
    });

  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      error
    });
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

#### 3. Frontend Cart Implementation

**File:** `components/CartDrawer.tsx`

```typescript
const handleCheckout = async () => {
  if (items.length === 0) return;
  
  setIsCheckingOut(true);
  try {
    const response = await fetch('/api/create-cart-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        items: items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          variant_id: item.variant?.id || undefined
        })),
        storeId: process.env.NEXT_PUBLIC_STORE_ID,
        storeName: "Your Store Name",
        discountCode: appliedDiscount?.code 
      }),
    });

    const { sessionId, url, error } = await response.json();
    
    if (error) throw new Error(error);
    
    // Redirect to Stripe checkout
    if (url) {
      window.location.href = url; // Preferred method
    } else if (sessionId) {
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      await stripe?.redirectToCheckout({ sessionId });
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Failed to proceed to checkout. Please try again.');
  } finally {
    setIsCheckingOut(false);
  }
};
```

#### 4. Product Page Buy Now

**File:** `components/ProductPage.tsx`

```typescript
const handleBuyNow = async () => {
  setLoading(true);
  try {
    const itemPayload: any = {
      product_id: product.id,
      quantity: quantity
    };
    
    if (product.variants?.length && selectedVariant !== undefined) {
      itemPayload.variant_id = selectedVariant; // Use variant index
    }

    const response = await fetch('/api/create-cart-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [itemPayload],
        storeId: process.env.NEXT_PUBLIC_STORE_ID,
        storeName: "Your Store Name",
        discountCode: undefined,
      }),
    });

    const { url, error } = await response.json();
    
    if (error) throw new Error(error);
    
    if (url) {
      window.location.href = url;
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Failed to proceed to checkout. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

#### 5. Quick Setup for New PixeoCommerce Store

**IMPORTANT UPDATE:** Most PixeoCommerce stores actually use **Connected Accounts** (not platform accounts as previously documented). Here's the correct setup:

**For Connected Account Setup (RECOMMENDED):**

```sql
-- 1. Create store record with connected account ID
INSERT INTO stores (id, name, currency, stripe_account_id) 
VALUES (
  'your-new-store-id',
  'Your Store Name',
  'gbp',
  'acct_your_connected_account_id'  -- Connected Stripe account ID
);

-- 2. Add products with CONNECTED price IDs (priority 1)
INSERT INTO products (store_id, name, price, connected_stripe_price_id) 
VALUES (
  'your-new-store-id',
  'Example Product',
  29.99,
  'price_connected_account_id'  -- Create in connected account, not platform
);

-- 3. Add default shipping methods
INSERT INTO shipping_methods (store_id, name, rate, active, sort_order) VALUES
('your-new-store-id', 'Standard Shipping', 0.00, true, 1),
('your-new-store-id', 'Express Shipping', 9.99, true, 2);
```

**Environment Variables:**
```bash
# .env.local
NEXT_PUBLIC_STORE_ID=your-new-store-id
STRIPE_SECRET_KEY=sk_test_your_platform_stripe_key  # Platform account key for API calls
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_platform_key
```

**Hybrid Setup (Recommended for Production):**
```sql
-- Add both connected AND platform prices for fallback protection
UPDATE products 
SET 
  connected_stripe_price_id = 'price_connected123',  -- Priority 1
  stripe_price_id = 'price_platform123'             -- Fallback
WHERE id = 'product-uuid';
```

**This setup will work immediately with the checkout system!**

---

## 🔔 Webhook System

### CRITICAL: PixeoCommerce Webhook Implementation

The webhook system is **essential** for order processing and inventory management. **This is the most critical part of the setup.**

Without proper webhook configuration:
- ❌ Orders won't appear in PixeoCommerce dashboard
- ❌ Inventory won't update after purchases
- ❌ Customer records won't be created

#### 1. Webhook Endpoint Implementation

**File:** `app/api/stripe/webhook/route.ts`

**Key Features:**
- Processes `checkout.session.completed` events
- Extracts product data from Stripe metadata 
- Creates orders in PixeoCommerce format
- Updates inventory for both simple and variant products
- Handles connected account context

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook received at:', new Date().toISOString())
  
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    console.log('✅ Webhook signature verified successfully')
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const connectedAccountId = event.account

    try {
      // Fetch line items with expanded product metadata (CRITICAL)
      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
        { expand: ['data.price.product'] },
        connectedAccountId ? { stripeAccount: connectedAccountId } : undefined
      )

      await processOrder(session, lineItems, connectedAccountId || '')
    } catch (error) {
      console.error('❌ Webhook processing error:', error)
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}

async function processOrder(session: Stripe.Checkout.Session, lineItems: any, connectedAccountId: string) {
  const supabase = createServerSupabaseClient()
  const storeId = session.metadata?.store_id
  const customerEmail = session.customer_details?.email

  if (!storeId || !customerEmail) {
    throw new Error('Missing required order data')
  }

  // 1. Upsert customer (PixeoCommerce method)
  const { data: customerData } = await supabase
    .from('customers')
    .upsert([{
      store_id: storeId,
      email: customerEmail,
      name: session.customer_details?.name,
      address: session.customer_details?.address || null,
    }])
    .select('id')
    .single()

  // 2. Extract product data from Stripe metadata (CRITICAL STEP)
  const products = []

  for (const item of lineItems.data) {
    const stripeProduct = item.price?.product
    let supabaseProductId = null
    let variantId = null

    if (typeof stripeProduct === 'object' && stripeProduct.metadata) {
      // Extract Supabase product ID from Stripe metadata
      if (stripeProduct.metadata.supabase_product_id) {
        supabaseProductId = stripeProduct.metadata.supabase_product_id
      } else if (stripeProduct.metadata.product_id) {
        supabaseProductId = stripeProduct.metadata.product_id
      }

      // Extract variant ID if present
      if (stripeProduct.metadata.variant_id) {
        variantId = stripeProduct.metadata.variant_id
      }
    }

    if (!supabaseProductId) {
      throw new Error(`Missing supabase_product_id in Stripe product metadata`)
    }

    products.push({
      product_id: supabaseProductId,
      variant_id: variantId,
      quantity: item.quantity || 1,
      price: item.amount_total ? item.amount_total / 100 : 0,
      stripe_price_id: item.price?.id,
    })
  }

  // 3. Insert order (PixeoCommerce format)
  const { data: orderData } = await supabase
    .from('orders')
    .insert([{
      store_id: storeId,
      customer_id: customerData.id,
      status: 'paid',
      total: session.amount_total ? session.amount_total / 100 : 0,
      stripe_session_id: session.id,
      products: products, // Array of ordered products
    }])
    .select('id')
    .single()

  // 4. Update inventory
  for (const item of products) {
    if (item.variant_id) {
      // Handle variant product stock
      const { data: product } = await supabase
        .from('products')
        .select('variants')
        .eq('id', item.product_id)
        .single()

      if (product) {
        const updatedVariants = product.variants.map((variant: any) => {
          if (variant.id === item.variant_id) {
            return { ...variant, stock: Math.max(0, (variant.stock || 0) - item.quantity) }
          }
          return variant
        })

        await supabase
          .from('products')
          .update({ variants: updatedVariants })
          .eq('id', item.product_id)
      }
    } else {
      // Handle simple product stock
      const { data: currentProduct } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single()

      if (currentProduct) {
        const newStock = Math.max(0, (currentProduct.stock || 0) - item.quantity)
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.product_id)
      }
    }
  }
}
```

#### 2. Stripe Product Metadata Requirements

**🚨 CRITICAL:** Every Stripe product MUST have this metadata:

```javascript
// In Stripe Dashboard → Products → [Product] → Metadata
{
  "supabase_product_id": "uuid-from-products-table", // REQUIRED
  "variant_id": "variant-uuid" // Only for variant products
}
```

**Without this metadata, the webhook CANNOT:**
- Find the product in your database
- Create order records
- Update inventory

#### 3. Webhook Configuration Steps

**Step 1: Create Webhook in Stripe Dashboard**
1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **"Add endpoint"**
3. Set URL: `https://your-domain.com/api/stripe/webhook`
4. Select events: `checkout.session.completed`
5. **Copy the Signing Secret** (starts with `whsec_`)

**Step 2: Add Environment Variable**
```bash
# Add to .env.local
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret_here
```

**Step 3: Test Webhook (Local Development)**
```bash
# Install Stripe CLI
npm install -g stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

#### 4. Critical Setup Checklist

**Environment Variables:**
- [ ] `STRIPE_WEBHOOK_SECRET` configured
- [ ] `STRIPE_SECRET_KEY` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured

**Stripe Configuration:**
- [ ] Webhook endpoint created with correct URL
- [ ] `checkout.session.completed` event enabled
- [ ] All products have `supabase_product_id` in metadata
- [ ] Variant products have `variant_id` in metadata

**Database Setup:**
- [ ] `orders` table exists with `products` JSONB field
- [ ] `customers` table exists with `address` JSONB field
- [ ] Row Level Security policies allow webhook writes

#### 5. Testing Webhook Integration

**Make a Test Purchase:**
1. Complete a checkout on your store
2. Check server logs for webhook processing
3. Verify order appears in database:
   ```sql
   SELECT * FROM orders WHERE store_id = 'your-store-id' ORDER BY created_at DESC LIMIT 1;
   ```
4. Confirm inventory decreased:
   ```sql
   SELECT id, name, stock FROM products WHERE store_id = 'your-store-id';
   ```

**Expected Log Output:**
```
🔔 Webhook received at: [timestamp]
✅ Webhook signature verified successfully
📦 Line items fetched: { itemCount: 1 }
🔍 Extracted metadata: { supabaseProductId: "uuid", variantId: null }
✅ Customer upserted: [customer-id]
📝 Order created successfully: [order-id]
📦 Updating inventory...
✅ Simple product stock updated successfully
```

#### 6. Common Webhook Issues

**"Orders not appearing in dashboard"**
- ❌ Missing `supabase_product_id` in Stripe metadata
- ❌ Wrong webhook endpoint URL
- ❌ Database permission issues

**"Inventory not updating"**
- ❌ Product IDs don't match between Stripe and database
- ❌ Webhook failing due to missing metadata
- ❌ Database update permissions

**"Webhook signature verification failed"**
- ❌ Missing or wrong `STRIPE_WEBHOOK_SECRET`
- ❌ Webhook secret doesn't match Stripe dashboard

---

## 🎟️ Discount System

### Complete Discount Code Implementation

The discount system integrates directly with Stripe coupons for seamless checkout experience.

#### 1. Database Setup

```sql
-- Create discounts table
CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  code VARCHAR(50) NOT NULL,
  stripe_coupon_id VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_discounts_store_code ON discounts(store_id, code);
CREATE INDEX idx_discounts_active ON discounts(active);
```

#### 2. Discount Validation API

**File:** `app/api/validate-discount/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { code, storeId } = await request.json()

    if (!code || !storeId) {
      return NextResponse.json(
        { valid: false, message: 'Code and store ID are required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Query the discounts table
    const { data: discount, error } = await supabase
      .from('discounts')
      .select('stripe_coupon_id, code')
      .eq('store_id', storeId)
      .eq('code', code)
      .eq('active', true)
      .single()

    if (error || !discount || !discount.stripe_coupon_id) {
      return NextResponse.json(
        { valid: false, message: 'Invalid or inactive discount code' },
        { status: 200 }
      )
    }

    return NextResponse.json({
      valid: true,
      code: discount.code,
      stripeCouponId: discount.stripe_coupon_id,
      message: 'Discount code applied successfully'
    })

  } catch (error) {
    console.error('Error validating discount code:', error)
    return NextResponse.json(
      { valid: false, message: 'Failed to validate discount code' },
      { status: 500 }
    )
  }
}
```

#### 3. Frontend Discount Implementation

**In `components/CartDrawer.tsx`:**

```typescript
const [discountCode, setDiscountCode] = useState('');
const [appliedDiscount, setAppliedDiscount] = useState<{code: string, amount: number} | null>(null);
const [discountError, setDiscountError] = useState('');

const handleApplyDiscount = async () => {
  if (!discountCode.trim()) return;
  
  setDiscountError('');
  
  try {
    const response = await fetch('/api/validate-discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        code: discountCode.trim(),
        storeId: process.env.NEXT_PUBLIC_STORE_ID 
      }),
    });

    const result = await response.json();
    
    if (response.ok && result.valid) {
      setAppliedDiscount({ 
        code: result.code, 
        amount: 10 // For display purposes - actual discount handled by Stripe
      });
      setDiscountCode('');
      setDiscountError('');
    } else {
      setDiscountError(result.message || 'Invalid discount code');
    }
  } catch (error) {
    console.error('Error validating discount:', error);
    setDiscountError('Failed to validate discount code');
  }
};
```

#### 4. Setup Steps

1. **Create Stripe Coupon:**
   - Go to Stripe Dashboard → Products → Coupons
   - Create coupon with ID: `SAVE10`
   - Set percentage: 10%

2. **Add to Database:**
```sql
INSERT INTO discounts (store_id, code, stripe_coupon_id, active) 
VALUES (
  'your-store-id',
  'SAVE10',
  'SAVE10', -- Must match Stripe coupon ID
  true
);
```

---

## 🖼️ Multi-Image Gallery

### Product Image Gallery Implementation

Support for up to 5 product images with thumbnail navigation.

#### 1. Database Structure

```sql
-- Products table with image_urls array
ALTER TABLE products ADD COLUMN image_urls TEXT[];

-- Example data
UPDATE products 
SET image_urls = ARRAY[
  '/product1-main.jpg',
  '/product1-side.jpg', 
  '/product1-back.jpg'
]
WHERE id = 'your-product-id';
```

#### 2. Frontend Implementation

**File:** `components/ProductPage.tsx`

```typescript
// Get all available images (up to 5)
const getImages = () => {
  const images: string[] = [];
  
  // Add single image_url if it exists
  if (product.image_url) {
    images.push(product.image_url);
  }
  
  // Add images from image_urls array
  const imageUrls = (product as any).image_urls;
  if (imageUrls && Array.isArray(imageUrls)) {
    // Filter out duplicates
    const additionalImages = product.image_url 
      ? imageUrls.filter(url => url !== product.image_url)
      : imageUrls;
    images.push(...additionalImages);
  }
  
  // Return up to 5 images
  return images.slice(0, 5);
};

const images = getImages();
const [selectedImageIndex, setSelectedImageIndex] = useState(0);
const currentImage = images[selectedImageIndex] || null;

// In your JSX:
return (
  <div className="space-y-4">
    {/* Main Image */}
    <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-white relative">
      {currentImage ? (
        <Image
          src={currentImage}
          alt={`${product.name} - Image ${selectedImageIndex + 1}`}
          fill
          className="object-contain object-center"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-gray-200">
          <p className="text-gray-500">No image available</p>
        </div>
      )}
      
      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
          {selectedImageIndex + 1} / {images.length}
        </div>
      )}
    </div>

    {/* Thumbnail Navigation */}
    {images.length > 1 && (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedImageIndex(index)}
            className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
              selectedImageIndex === index
                ? 'border-black shadow-md'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className="relative w-full h-full">
              <Image
                src={image}
                alt={`${product.name} thumbnail ${index + 1}`}
                fill
                className="object-cover object-center"
                sizes="80px"
              />
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
);
```

---

## 🧩 Core Components

### 1. Store Context Setup
```typescript
// contexts/StoreContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Store {
  id: string
  name: string
  currency: string
  subdomain: string
  branding: any
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store | null>(null)

  useEffect(() => {
    const fetchStore = async () => {
      const storeId = process.env.NEXT_PUBLIC_STORE_ID
      if (!storeId) return

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single()

      if (data) setStore(data)
    }

    fetchStore()
  }, [])

  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
```

### 2. Cart Context
```typescript
// contexts/CartContext.tsx
import { createContext, useContext, useReducer } from 'react'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  variant?: any
}

const CartContext = createContext<{
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
} | null>(null)

// Implementation details...
```

### 3. Currency Utilities
```typescript
// lib/utils.ts
export const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  // Add more currencies as needed
}

export function getCurrencySymbol(currency: string): string {
  return currencySymbols[currency.toUpperCase()] || '$'
}

export function formatPrice(price: number, currency: string = 'gbp'): string {
  const symbol = getCurrencySymbol(currency)
  const numericPrice = parseFloat(String(price || 0))
  return `${symbol}${numericPrice.toFixed(2)}`
}

export function formatPriceRange(minPrice: number, maxPrice: number, currency: string): string {
  if (minPrice === maxPrice) {
    return formatPrice(minPrice, currency)
  }
  return `${formatPrice(minPrice, currency)} - ${formatPrice(maxPrice, currency)}`
}
```

---

## 🔌 API Integration

### 1. Product Checkout API
```typescript
// app/api/create-product-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { productId, quantity = 1, variantIndex } = await request.json()
    
    // Fetch product and store details
    const { data: product } = await supabase
      .from('products')
      .select(`
        *,
        stores!inner(
          id,
          stripe_account_id,
          currency
        )
      `)
      .eq('id', productId)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Determine price ID based on variant
    let priceId = product.connected_stripe_price_id
    if (product.variants && product.variants.length > 0) {
      const variant = product.variants[variantIndex]
      const connectedProducts = product.connected_stripe_products || []
      priceId = connectedProducts[variantIndex]?.price_id || priceId
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: quantity,
      }],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/products/${productId}`,
      customer_email: request.headers.get('x-customer-email'),
      metadata: {
        product_id: productId,
        store_id: product.stores.id,
        variant_index: variantIndex?.toString() || '0',
      },
    }, {
      stripeAccount: product.stores.stripe_account_id,
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
```

### 2. Stripe Webhook Handler
```typescript
// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const connectedAccountId = event.account

    try {
      // Fetch session line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        stripeAccount: connectedAccountId,
      })

      // Process order
      await processOrder(session, lineItems, connectedAccountId)
    } catch (error) {
      console.error('Webhook processing error:', error)
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}

async function processOrder(session: Stripe.Checkout.Session, lineItems: any, connectedAccountId: string) {
  // Implementation for order processing, customer creation, inventory updates
  // and email sending...
}
```

---

## 💳 Stripe Integration

### 1. Stripe Configuration
```typescript
// lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export function getStripeAccount(stripeAccountId?: string) {
  return stripeAccountId ? { stripeAccount: stripeAccountId } : {}
}
```

### 2. Checkout Session Creation
```typescript
// Example: Creating checkout for multiple items
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: cartItems.map(item => ({
    price: item.stripePriceId,
    quantity: item.quantity,
  })),
  mode: 'payment',
  success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/cart`,
  customer_email: customerEmail,
  metadata: {
    store_id: storeId,
    items: JSON.stringify(cartItems),
  },
}, getStripeAccount(connectedAccountId))
```

---

## 💱 Currency & Localization

### 1. Dynamic Currency Display
```typescript
// components/ProductCard.tsx
import { useStore } from '@/contexts/StoreContext'
import { formatPrice } from '@/lib/utils'

export function ProductCard({ product }: { product: any }) {
  const store = useStore()
  
  const getProductPrice = () => {
    if (product.variants && product.variants.length > 0) {
      const prices = product.variants.map((v: any) => v.price)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      return formatPriceRange(minPrice, maxPrice, store?.currency || 'gbp')
    }
    return formatPrice(product.price, store?.currency || 'gbp')
  }

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p className="price">{getProductPrice()}</p>
    </div>
  )
}
```

### 2. Currency Conversion in API
```typescript
// When creating Stripe prices, ensure currency matches store setting
const price = await stripe.prices.create({
  unit_amount: Math.round(price * 100), // Convert to cents
  currency: store.currency.toLowerCase(),
  product: productId,
}, getStripeAccount(connectedAccountId))
```

---

## 📦 Product Management

### 1. Product Display with Variants
```typescript
// app/products/[id]/page.tsx
export default function ProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<any>(null)
  const [selectedVariant, setSelectedVariant] = useState(0)
  const store = useStore()

  const handleBuyNow = async () => {
    try {
      const response = await fetch('/api/create-product-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: params.id,
          quantity: 1,
          variantIndex: selectedVariant,
        }),
      })

      const { sessionId, error } = await response.json()
      
      if (error) throw new Error(error)
      
      // Redirect to Stripe checkout
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      await stripe?.redirectToCheckout({ sessionId })
    } catch (error) {
      console.error('Checkout error:', error)
    }
  }

  return (
    <div className="product-detail">
      <div className="product-images">
        {/* Image gallery */}
      </div>
      <div className="product-info">
        <h1>{product?.name}</h1>
        <p className="price">
          {product?.variants && product.variants.length > 0
            ? formatPrice(product.variants[selectedVariant].price, store?.currency)
            : formatPrice(product?.price, store?.currency)
          }
        </p>
        
        {/* Variant selection */}
        {product?.variants && (
          <div className="variants">
            {product.variants.map((variant: any, index: number) => (
              <button
                key={index}
                onClick={() => setSelectedVariant(index)}
                className={selectedVariant === index ? 'selected' : ''}
              >
                {variant.name}
              </button>
            ))}
          </div>
        )}
        
        <button onClick={handleBuyNow}>Buy Now</button>
      </div>
    </div>
  )
}
```

### 2. Product Listing with Filters
```typescript
// app/shop-all/page.tsx
export default function ShopPage() {
  const [products, setProducts] = useState<any[]>([])
  const [filters, setFilters] = useState({
    category: '',
    priceRange: '',
    sortBy: 'newest',
  })
  const store = useStore()

  useEffect(() => {
    fetchProducts()
  }, [filters])

  const fetchProducts = async () => {
    let query = supabase
      .from('products')
      .select('*')
      .eq('store_id', process.env.NEXT_PUBLIC_STORE_ID)
      .eq('active', true)

    if (filters.category) {
      query = query.eq('category_id', filters.category)
    }

    const { data } = await query
    setProducts(data || [])
  }

  return (
    <div className="shop-page">
      <div className="filters">
        {/* Filter components */}
      </div>
      <div className="products-grid">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
```

---

## 🛒 Order Processing

### 1. Webhook Order Processing
```typescript
// Complete webhook processing function
async function processOrder(session: Stripe.Checkout.Session, lineItems: any, connectedAccountId: string) {
  const storeId = session.metadata?.store_id
  const customerEmail = session.customer_details?.email

  // 1. Create or get customer
  let { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('store_id', storeId)
    .eq('email', customerEmail)
    .single()

  if (!customer) {
    const { data: newCustomer } = await supabase
      .from('customers')
      .insert([{
        store_id: storeId,
        email: customerEmail,
        name: session.customer_details?.name,
      }])
      .select()
      .single()
    customer = newCustomer
  }

  // 2. Create order
  const { data: order } = await supabase
    .from('orders')
    .insert([{
      store_id: storeId,
      customer_id: customer.id,
      stripe_session_id: session.id,
      status: 'paid',
      total_amount: session.amount_total! / 100,
      currency: session.currency,
      shipping_address: session.customer_details?.address,
      items: lineItems.data,
    }])
    .select()
    .single()

  // 3. Update inventory
  for (const item of lineItems.data) {
    const product = await supabase
      .from('products')
      .select('*')
      .eq('stripe_product_id', item.price.product)
      .single()

    if (product.data) {
      await supabase
        .from('products')
        .update({ stock: product.data.stock - item.quantity })
        .eq('id', product.data.id)
    }
  }

  // 4. Send confirmation email
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-order-confirmation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId: order.id,
      storeId,
      customerEmail,
    }),
  })
}
```

---

## � Product Variations System

### Overview

The PixeoCommerce store implements a flexible product variation system that integrates Supabase for data storage with Stripe for payment processing. This system supports both simple products and complex products with multiple variants (size, color, style, etc.).

#### Key Features
- **Flexible Variant Storage**: JSON-based variant storage in Supabase
- **Dual Stripe Integration**: Support for both connected accounts and platform pricing
- **Dynamic Stock Management**: Real-time stock updates at variant level
- **Image Handling**: Combined product and variant image management
- **Price Range Display**: Automatic price range calculation for variant products

### Database Architecture

#### Products Table Variations Structure

The `products` table in Supabase contains the following variant-related fields:

| Field | Type | Description |
|-------|------|-------------|
| `variants` | JSON | Array of variant objects |
| `connected_stripe_products` | JSON | Stripe products for connected accounts |
| `stripe_products` | JSON | Stripe products for platform |
| `connected_stripe_price_id` | TEXT | Main Stripe price ID (connected) |
| `stripe_price_id` | TEXT | Main Stripe price ID (platform) |

#### Variant Object Schema

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

#### Stripe Integration Schema

For Stripe pricing, variants are stored in separate arrays:

**Connected Stripe Products:**
```json
[
  {
    "variant_id": "variant_123",
    "connected_stripe_price_id": "price_abc123"
  }
]
```

**Platform Stripe Products:**
```json
[
  {
    "variant_id": "variant_123",
    "stripe_price_id": "price_xyz789"
  }
]
```

### Fetching Variations

#### 1. Product Detail Page Implementation

**File**: `app/products/[id]/page.tsx`

**Initial Product Fetch:**
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

**Variant Selection Logic:**
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

**Image Handling:**
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

#### 2. Product Listing Implementation

**File**: `app/shop-all/page.tsx`

**Products Fetch:**
```typescript
// Fetch all active products for the store
const { data, error } = await supabase
  .from("products")
  .select("*")
  .eq("store_id", process.env.NEXT_PUBLIC_STORE_ID)
  .eq("active", true)
  .order('created_at', { ascending: false });
```

**Price Calculation for Listings:**
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

**Stock Calculation for Listings:**
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

**Image Handling for Listings:**
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

### Checkout Process with Variations

#### 1. Creating Checkout Session

**File**: `app/api/create-product-checkout/route.ts`

**Item Payload Structure:**
```typescript
// Build item payload for checkout
const itemPayload = {
  product_id: product.id,
  quantity: quantity,
  // Only include variant_id if variant is selected
  ...(selectedVariant && { variant_id: selectedVariant.id })
};
```

**Variant Price Resolution:**
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

#### 2. Stripe Session Creation
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

### Stock Management

#### Order Processing and Stock Updates

**File**: `app/api/stripe/webhook/route.ts`

**Variant Identification in Webhook:**
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

**Stock Decrement Logic:**
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

### Best Practices for Variations

#### Performance Optimization
1. **Indexing**: Create indexes on `store_id` and `active` fields
2. **Caching**: Implement Redis caching for frequently accessed products
3. **Image Optimization**: Use Next.js Image component with proper sizing
4. **Pagination**: Implement pagination for large product catalogs

#### Error Handling
1. **Graceful Degradation**: Handle missing variant data
2. **Stock Validation**: Validate stock before checkout
3. **Webhook Retry**: Implement idempotency for webhook processing

#### Security Considerations
1. **Input Validation**: Validate all variant data inputs
2. **Price Verification**: Verify prices with Stripe before checkout
3. **Stock Race Conditions**: Handle concurrent stock updates

#### Data Consistency
1. **Atomic Updates**: Use database transactions for stock updates
2. **Webhook Idempotency**: Prevent duplicate order processing
3. **Backup Strategy**: Regular backups of product and variant data

---

## �📧 Email System

## 📧 Email System

### Order Confirmation Email Implementation

After successful order processing, the system automatically sends order confirmation emails to customers. This is implemented in the Stripe webhook handler and provides comprehensive order details including variant information.

#### Email Trigger Process

The email sending is triggered after the `checkout.session.completed` webhook event is processed:

**File**: `app/api/stripe/webhook/route.ts`

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

  if (orderError) {
    console.error('Error fetching complete order:', orderError);
    throw orderError;
  }

  console.log('✅ Complete order fetched successfully:', completeOrder.id);
} catch (emailError) {
  console.error('Error in email sending process:', emailError);
  // Don't fail the webhook if email fails
}
```

#### Email Data Preparation

The system prepares comprehensive order data for the email, including variant information:

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

Add these to your `package.json`:
```json
{
  "dependencies": {
    "resend": "^4.7.0",
    "@react-email/render": "^0.0.12"
  }
}
```

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

#### Variant Display in Emails

When displaying order items in emails, the system:

1. **Shows Product Name**: Base product information
2. **Includes Variant Details**: If variant was selected, shows variant name and attributes
3. **Displays Correct Price**: Uses the variant-specific price that was actually charged
4. **Shows Product Images**: Combines base product and variant images
5. **Includes Quantity**: Number of specific variant items ordered

This ensures customers receive clear, detailed information about exactly what they purchased, including any specific variants they selected.

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

#### Setup Requirements

**Environment Variables:**
```bash
# Add to .env.local
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Supabase Edge Function:**
The email system requires a deployed Supabase Edge Function at `/functions/v1/send-order-confirmation`. This function should:

1. Receive the order payload
2. Format the email template with order details
3. Include variant information when applicable
4. Send via Resend API
5. Return success/error status

### Email Template Structure

```html
<!-- Email template includes: -->
- Store branding and logo
- Order summary with products
- Product images and variants
- Variant details (size, color, etc.)
- Pricing with correct currency
- Shipping information
- Customer details
- Call-to-action buttons
```

---

## 🚀 Deployment

### 1. Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
```

### 2. Environment Variables Setup
```bash
# In Vercel dashboard, set these variables:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_STORE_ID=your_store_uuid
RESEND_API_KEY=your_resend_key
```

### 3. Domain Configuration
```bash
# Add custom domain in Vercel
vercel domains add your-store.com

# Update DNS records as instructed
```

---

## ✅ Testing Checklist

### Pre-Deployment Testing
- [ ] **Database Connection**: Verify Supabase connection
- [ ] **Stripe Integration**: Test checkout flow
- [ ] **Product Display**: Check variants and pricing
- [ ] **Currency Display**: Verify correct symbols
- [ ] **Cart Functionality**: Add/remove items
- [ ] **Checkout Process**: Complete purchase flow
- [ ] **Webhook Processing**: Verify order creation
- [ ] **Email Sending**: Test order confirmations
- [ ] **Responsive Design**: Mobile/desktop testing
- [ ] **Performance**: Page load times

### Post-Deployment Testing
- [ ] **Live Checkout**: Test with real Stripe account
- [ ] **Webhook Endpoints**: Verify Stripe webhook delivery
- [ ] **Email Delivery**: Check inbox for confirmations
- [ ] **Database Updates**: Verify order/customer creation
- [ ] **Inventory Updates**: Check stock reduction
- [ ] **Error Handling**: Test edge cases

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Product not found" Error
```bash
# Check:
- NEXT_PUBLIC_STORE_ID is set correctly
- Product exists in database
- Product is active
- Stripe price IDs are valid
```

#### 2. Currency Mismatch
```bash
# Verify:
- Store currency setting in database
- Stripe prices created with correct currency
- Frontend currency display logic
```

#### 3. Webhook Failures
```bash
# Debug:
- Check webhook endpoint URL in Stripe dashboard
- Verify webhook secret
- Check Supabase function logs
- Ensure proper CORS headers
```

#### 4. Email Not Sending
```bash
# Troubleshoot:
- Verify RESEND_API_KEY is set
- Check Supabase function deployment
- Review function logs for errors
- Test email template rendering
```

### Debug Commands
```bash
# Check Supabase connection
supabase status

# View function logs
supabase functions logs send-order-confirmation

# Test webhook locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Verify environment variables
echo $NEXT_PUBLIC_STORE_ID
```

---

## 📚 Additional Resources

### Documentation Links
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Vercel Deployment Guide](https://vercel.com/docs)

### Code Templates
- [Product Card Component](./components/ProductCard.tsx)
- [Checkout API Route](./app/api/create-product-checkout/route.ts)
- [Webhook Handler](./app/api/stripe/webhook/route.ts)
- [Email Function](./supabase/functions/send-order-confirmation/index.ts)

### Best Practices
1. **Always validate input data** in API routes
2. **Handle errors gracefully** with proper user feedback
3. **Use TypeScript** for better type safety
4. **Implement proper loading states** for better UX
5. **Test thoroughly** before deployment
6. **Monitor logs** for debugging issues
7. **Keep dependencies updated** for security

---

## 🎉 Success Metrics

### Performance Targets
- **Page Load Time**: < 3 seconds
- **Checkout Completion**: > 95% success rate
- **Email Delivery**: > 99% delivery rate
- **Mobile Responsiveness**: 100% compatibility

### Quality Assurance
- **Cross-browser Testing**: Chrome, Firefox, Safari, Edge
- **Mobile Testing**: iOS Safari, Android Chrome
- **Accessibility**: WCAG 2.1 AA compliance
- **SEO Optimization**: Meta tags, structured data

---

## 📞 Support

For technical support or questions:
- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check this guide first
- **Community**: Join our developer community
- **Email**: developer-support@pixeocommerce.com

---

## 🐛 Troubleshooting & Debug Guide

### Common Checkout Issues and Solutions

Based on real-world implementation experience, here are the most common issues and their fixes:

#### 1. "Failed to create checkout session" Error

**Cause:** Incorrect price ID priority or missing environment variables

**Solution A - Price ID Priority Issue (MOST COMMON):**
This happens when the checkout API has the wrong price resolution order. The API should prioritize `connected_stripe_price_id` first, then fall back to `stripe_price_id`.

**✅ CORRECT Priority Order in `/api/create-cart-checkout/route.ts`:**
```typescript
// Use main product price if no variant price found - Following documented priority order
if (!priceId) {
  // Priority 1: connected_stripe_price_id (Connected Account) - recommended
  if (product.connected_stripe_price_id) {
    priceId = product.connected_stripe_price_id;
    console.log('✅ Using connected product price:', priceId);
  }
  // Priority 2: stripe_price_id (Platform Account) - fallback
  else if (product.stripe_price_id) {
    priceId = product.stripe_price_id;
    console.log('✅ Using platform product price:', priceId);
  }
}
```

**❌ WRONG Priority Order (causes errors):**
```typescript
// DON'T DO THIS - Wrong priority order
if (product.stripe_price_id) {
  priceId = product.stripe_price_id;  // Platform first - WRONG
} else if (product.connected_stripe_price_id) {
  priceId = product.connected_stripe_price_id;  // Connected second - WRONG
}
```

**Solution B - Missing Price IDs:**
```sql
-- Check if products have required price IDs
SELECT id, name, stripe_price_id, connected_stripe_price_id 
FROM products 
WHERE store_id = 'your-store-id';

-- Add missing CONNECTED price IDs (priority 1)
UPDATE products 
SET connected_stripe_price_id = 'price_your_connected_stripe_price_id'
WHERE id = 'product-id' AND connected_stripe_price_id IS NULL;

-- Add platform price IDs as fallback (optional)
UPDATE products 
SET stripe_price_id = 'price_your_platform_stripe_price_id'
WHERE id = 'product-id' AND stripe_price_id IS NULL;
```

**Solution C - Environment Variables:**
```bash
# Ensure these are set in .env.local
STRIPE_SECRET_KEY=sk_test_your_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
NEXT_PUBLIC_STORE_ID=your_store_uuid
```

#### 2. "Store is not connected to Stripe" Error

**Cause:** Missing or invalid `stripe_account_id` in stores table

**Solution:**
```sql
-- Check store configuration
SELECT id, name, stripe_account_id, currency 
FROM stores 
WHERE id = 'your-store-id';

-- IMPORTANT: For PixeoCommerce platform accounts (DEFAULT), set stripe_account_id to NULL
UPDATE stores 
SET stripe_account_id = NULL 
WHERE id = 'your-store-id';

-- Only set a value if you're specifically using Stripe Connect (rare)
```

**Note:** 99% of PixeoCommerce stores should have `stripe_account_id = NULL` to use platform accounts.

#### 3. Discount Codes Not Working

**Cause:** Missing discounts table or invalid Stripe coupon IDs

**Solutions:**
1. **Create discounts table** (see Discount System section)
2. **Create Stripe coupon** in Stripe Dashboard
3. **Link them properly:**
```sql
INSERT INTO discounts (store_id, code, stripe_coupon_id, active) 
VALUES ('your-store-id', 'SAVE10', 'SAVE10', true);
```

#### 4. Images Not Displaying

**Cause:** Missing Next.js Image optimization or incorrect paths

**Solutions:**
1. **Use Next.js Image component:**
```typescript
import Image from 'next/image';

<Image 
  src="/your-image.jpg" 
  alt="Product" 
  width={400} 
  height={400} 
/>
```

2. **Add image domains to next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['your-domain.com', 'supabase-storage.com'],
  },
}

module.exports = nextConfig
```

#### 5. Environment Variables Not Loading

**Cause:** Incorrect `.env.local` setup or missing variables

**Solution:**
1. **Create `.env.local`** (not `.env`)
2. **Restart dev server** after changes
3. **Verify variables:**
```bash
# Check in browser console
console.log('Store ID:', process.env.NEXT_PUBLIC_STORE_ID);
```

### Debug Workflow

When checkout fails, follow this systematic approach:

1. **Check Browser Console** for frontend errors
2. **Check Terminal Logs** for server-side errors  
3. **Verify Database Records:**
   ```sql
   -- Essential checks
   SELECT * FROM stores WHERE id = 'your-store-id';
   SELECT id, name, stripe_price_id FROM products WHERE store_id = 'your-store-id';
   SELECT * FROM shipping_methods WHERE store_id = 'your-store-id';
   ```
4. **Test API Directly:**
   ```bash
   curl -X POST http://localhost:3000/api/create-cart-checkout \
     -H "Content-Type: application/json" \
     -d '{
       "items": [{"product_id": "test-id", "quantity": 1}],
       "storeId": "your-store-id",
       "storeName": "Test Store"
     }'
   ```

### Production Checklist

Before deploying a new PixeoCommerce store:

#### Database Setup ✅
- [ ] All required tables created
- [ ] Store record exists with correct configuration
- [ ] Products have valid Stripe price IDs
- [ ] Shipping methods configured (or graceful defaults)
- [ ] Discount codes linked to Stripe coupons

#### Environment Variables ✅
- [ ] `.env.local` configured correctly
- [ ] `NEXT_PUBLIC_STORE_ID` matches database
- [ ] Stripe keys (test vs production)
- [ ] Supabase URL and keys valid

#### Functionality Tests ✅
- [ ] Product display works
- [ ] Add to cart functions
- [ ] Checkout process completes
- [ ] Discount codes apply
- [ ] Image gallery navigates
- [ ] Email confirmations send

#### Error Handling ✅
- [ ] Graceful fallbacks for missing data
- [ ] Clear error messages for users
- [ ] Comprehensive logging for debugging
- [ ] Database connection error handling

### Common Error Messages Reference

| Error | Cause | Fix |
|-------|-------|-----|
| "Price not found for item" | Missing stripe_price_id | Add Stripe price ID to product |
| "Store not found" | Invalid NEXT_PUBLIC_STORE_ID | Check environment variable |
| "Invalid discount code" | Missing discounts table/record | Create discount record |
| "Failed to fetch shipping methods" | Missing table | Create shipping_methods table |
| Image loading errors | Missing Next.js Image config | Add domains to next.config.js |
| "Stripe configuration error" | Wrong API keys | Check Stripe environment |

---

## 🎯 Critical Fix Summary

**BREAKING CHANGE ALERT:** The original documentation had incorrect assumptions about PixeoCommerce store configurations. Here's what was corrected:

### ❌ Original (Incorrect) Understanding:
- PixeoCommerce stores use Platform accounts (`stripe_account_id = NULL`)
- Priority: `stripe_price_id` first, `connected_stripe_price_id` second
- Checkout sessions created without `stripeAccount` parameter

### ✅ Corrected Understanding:
- **PixeoCommerce stores use Connected accounts** (`stripe_account_id = 'acct_...'`)
- **Priority: `connected_stripe_price_id` FIRST, `stripe_price_id` fallback**
- **Checkout sessions MUST include `stripeAccount: store.stripe_account_id`**

### 🔧 The Critical Fix:

```typescript
// ✅ CORRECT price resolution order
if (!priceId) {
  // Priority 1: Connected account price (MOST COMMON)
  if (product.connected_stripe_price_id) {
    priceId = product.connected_stripe_price_id;
  }
  // Priority 2: Platform price (FALLBACK)
  else if (product.stripe_price_id) {
    priceId = product.stripe_price_id;
  }
}

// ✅ CORRECT session creation
const session = await stripe.checkout.sessions.create(sessionConfig, {
  stripeAccount: store.stripe_account_id, // CRITICAL: Connected account context
});
```

### 📋 Implementation Checklist for New Stores:

1. **✅ Set up Connected Account in database:**
   ```sql
   UPDATE stores SET stripe_account_id = 'acct_your_connected_id' WHERE id = 'store-id';
   ```

2. **✅ Use `connected_stripe_price_id` for products:**
   ```sql
   UPDATE products SET connected_stripe_price_id = 'price_connected_123' WHERE store_id = 'store-id';
   ```

3. **✅ Implement correct price priority in checkout API** (see corrected implementation above)

4. **✅ Test checkout flow** with debug logging enabled

This fix resolves the "Failed to create checkout session" error that many stores experience.

---

**Happy Building! 🚀**

This comprehensive guide ensures that every PixeoCommerce storefront built will work instantly with all integrations functioning seamlessly. Follow each section carefully and use the troubleshooting guide when issues arise. 