# Pixeocommerce Checkout Debug Guide

## Common "Proceed to Checkout" Error Sources

Based on the analysis of the checkout system, here are the most common causes of checkout failures and how to debug them:

---

## 1. Environment Variables Issues

### ❌ Missing or Incorrect Environment Variables

**Check these variables in your other store:**

```bash
# Required Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
NEXT_PUBLIC_STORE_ID=your_store_uuid
```

**Debug Steps:**
```bash
# Check if variables are loaded
console.log('Store ID:', process.env.NEXT_PUBLIC_STORE_ID);
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

**Common Issues:**
- `NEXT_PUBLIC_STORE_ID` not matching actual store ID in database
- Wrong Stripe keys (test vs live)
- Missing Supabase service role key

---

## 2. Store Configuration Issues

### ❌ Store Not Found or Missing Stripe Account

**Error:** `"Store ID is required"` or `"Store is not connected to Stripe"`

**Check your `stores` table:**
```sql
SELECT id, name, stripe_account_id, currency, is_disabled 
FROM stores 
WHERE id = 'your-store-id';
```

**Required Fields:**
- `stripe_account_id` must be present and valid
- `is_disabled` should be `false` or `NULL`
- `currency` should be valid (defaults to 'gbp')

**Debug API Call:**
```javascript
// Test store lookup
const response = await fetch('/api/create-product-checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [{product_id: 'test', quantity: 1}],
    storeId: process.env.NEXT_PUBLIC_STORE_ID,
    storeName: "Test Store"
  })
});
console.log(await response.json());
```

---

## 3. Product and Pricing Issues

### ❌ Missing Stripe Price IDs

**Error:** `"Price not found for item"`

**Check your `products` table:**
```sql
SELECT 
  id, 
  name, 
  stripe_price_id, 
  connected_stripe_price_id, 
  stripe_products, 
  connected_stripe_products 
FROM products 
WHERE store_id = 'your-store-id';
```

**Required for Checkout:**
- At least one of: `stripe_price_id` OR `connected_stripe_price_id`
- For variants: valid entries in `stripe_products` OR `connected_stripe_products`

**Priority Order (per the code):**
1. `connected_stripe_price_id` (connected account)
2. `stripe_price_id` (platform account)
3. Variant-specific prices in JSON arrays

**Debug Product Pricing:**
```javascript
// Check specific product
const { data: product } = await supabase
  .from('products')
  .select('*')
  .eq('id', 'your-product-id')
  .single();

console.log('Product pricing:', {
  stripe_price_id: product.stripe_price_id,
  connected_stripe_price_id: product.connected_stripe_price_id,
  has_variants: !!product.variants,
  stripe_products: product.stripe_products,
  connected_stripe_products: product.connected_stripe_products
});
```

---

## 4. Shipping Methods Issues

### ❌ Shipping Methods Query Failure

**Error:** `"Failed to fetch shipping methods"`

**Check your `shipping_methods` table:**
```sql
SELECT * FROM shipping_methods 
WHERE store_id = 'your-store-id' 
AND active = true 
ORDER BY sort_order ASC;
```

**Required Fields:**
- `store_id` matches your store
- `active = true`
- `name` is not null
- `rate` is a valid number

**If No Shipping Methods:**
The system provides a default free shipping option, but you should have at least one:

```sql
INSERT INTO shipping_methods (store_id, name, rate, active, sort_order)
VALUES ('your-store-id', 'Standard Shipping', 10.00, true, 1);
```

---

## 5. Cart Items Validation Issues

### ❌ Invalid Cart Item Format

**Error:** `"Invalid item format"` or `"Invalid quantity"`

**Check Cart Item Structure:**
```javascript
// Valid cart item format
const validItem = {
  product_id: "uuid-string",  // REQUIRED
  quantity: 1,                // REQUIRED: positive number
  variant_id: "uuid-string",  // OPTIONAL: for variants
  // Other fields like name, price are for display only
};

// Invalid examples
const invalid1 = { quantity: 1 };           // Missing product_id
const invalid2 = { product_id: "123" };     // Missing quantity
const invalid3 = { product_id: "123", quantity: 0 };    // Invalid quantity
const invalid4 = { product_id: "123", quantity: "1" };  // Wrong type
```

**Debug Cart Items:**
```javascript
console.log('Cart items validation:');
cartItems.forEach((item, index) => {
  console.log(`Item ${index}:`, {
    has_product_id: !!item.product_id,
    product_id: item.product_id,
    quantity: item.quantity,
    quantity_type: typeof item.quantity,
    is_valid_quantity: typeof item.quantity === 'number' && item.quantity > 0
  });
});
```

---

## 6. Database Connection Issues

### ❌ Supabase Connection Failures

**Check Supabase Configuration:**
```javascript
// Test Supabase connection
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test query
const { data, error } = await supabase
  .from('stores')
  .select('*')
  .limit(1);

console.log('Supabase test:', { data, error });
```

**Common Issues:**
- Wrong Supabase URL
- Invalid service role key
- RLS policies blocking access
- Network connectivity issues

---

## 7. Frontend Error Handling Issues

### ❌ Frontend Not Showing Detailed Errors

**Improve Error Display in Checkout:**
```javascript
// In your checkout page
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");
  
  try {
    const payload = {
      items: cartItems,
      storeId: process.env.NEXT_PUBLIC_STORE_ID,
      storeName: "Your Store",
      discountCode,
    };
    
    console.log('Checkout payload:', payload); // DEBUG
    
    const res = await fetch("/api/create-product-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    const data = await res.json();
    console.log('Checkout response:', data); // DEBUG
    
    if (!res.ok || !data.url) {
      // Show detailed error
      const errorMsg = data.error || "Failed to start checkout";
      const details = data.details ? ` (${data.details})` : '';
      throw new Error(errorMsg + details);
    }
    
    window.location.href = data.url;
  } catch (err) {
    console.error('Checkout error:', err); // DEBUG
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## Step-by-Step Debugging Process

### 1. Check Browser Console
```javascript
// Add to your checkout page
console.log('Environment check:', {
  storeId: process.env.NEXT_PUBLIC_STORE_ID,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  cartItems: cartItems,
  cartItemsCount: cartItems.length
});
```

### 2. Test API Endpoint Directly
```bash
# Use curl or Postman
curl -X POST http://localhost:3000/api/create-product-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"product_id": "test-id", "quantity": 1}],
    "storeId": "your-store-id",
    "storeName": "Test Store"
  }'
```

### 3. Check Database Records
```sql
-- Check store exists
SELECT * FROM stores WHERE id = 'your-store-id';

-- Check products exist
SELECT id, name, stripe_price_id, connected_stripe_price_id 
FROM products 
WHERE store_id = 'your-store-id';

-- Check shipping methods
SELECT * FROM shipping_methods 
WHERE store_id = 'your-store-id' AND active = true;
```

### 4. Test Stripe Connection
```javascript
// In your API route or separate test
import { stripe } from '@/lib/stripe';

try {
  const account = await stripe.accounts.retrieve('acct_connected_account_id');
  console.log('Stripe account status:', account.charges_enabled);
} catch (error) {
  console.error('Stripe connection error:', error);
}
```

---

## Quick Fix Checklist

### Environment Variables ✅
- [ ] `NEXT_PUBLIC_STORE_ID` matches database store ID
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is correct
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is valid
- [ ] `STRIPE_SECRET_KEY` is correct (test/live)

### Database Records ✅
- [ ] Store exists in `stores` table
- [ ] Store has valid `stripe_account_id`
- [ ] Products have valid price IDs
- [ ] At least one active shipping method exists

### Cart Data ✅
- [ ] Cart items have `product_id` and `quantity`
- [ ] All quantities are positive numbers
- [ ] Product IDs exist in database

### API Response ✅
- [ ] API returns proper error messages
- [ ] Console shows detailed debugging info
- [ ] Network tab shows actual request/response

---

## Common Error Messages and Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Store ID is required" | Missing/null storeId | Check `NEXT_PUBLIC_STORE_ID` |
| "Store is not connected to Stripe" | Missing `stripe_account_id` | Add Stripe Connect account to store |
| "No items provided" | Empty cart | Ensure cart has items |
| "Invalid item format" | Missing product_id/quantity | Fix cart item structure |
| "Price not found for item" | Missing Stripe prices | Add `stripe_price_id` to products |
| "Failed to fetch shipping methods" | Database error | Check shipping_methods table |
| "Stripe configuration error" | Missing Stripe key | Check `STRIPE_SECRET_KEY` |

---

## Testing Script

Create this test file to debug your checkout:

```javascript
// test-checkout.js
async function testCheckout() {
  console.log('Testing checkout system...');
  
  // 1. Test environment
  console.log('Environment:', {
    storeId: process.env.NEXT_PUBLIC_STORE_ID,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY
  });
  
  // 2. Test store lookup
  try {
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('id', process.env.NEXT_PUBLIC_STORE_ID)
      .single();
    console.log('Store found:', !!store, store);
  } catch (error) {
    console.error('Store lookup failed:', error);
  }
  
  // 3. Test products
  try {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, stripe_price_id, connected_stripe_price_id')
      .eq('store_id', process.env.NEXT_PUBLIC_STORE_ID)
      .limit(5);
    console.log('Products found:', products?.length, products);
  } catch (error) {
    console.error('Products lookup failed:', error);
  }
  
  // 4. Test shipping methods
  try {
    const { data: shipping } = await supabase
      .from('shipping_methods')
      .select('*')
      .eq('store_id', process.env.NEXT_PUBLIC_STORE_ID)
      .eq('active', true);
    console.log('Shipping methods found:', shipping?.length, shipping);
  } catch (error) {
    console.error('Shipping lookup failed:', error);
  }
}

// Run the test
testCheckout();
```

Run this script in your browser console or as a separate API endpoint to diagnose issues quickly.

---

This debugging guide should help you identify and fix the checkout issues on your other store. Start with the environment variables and work through each section systematically.
