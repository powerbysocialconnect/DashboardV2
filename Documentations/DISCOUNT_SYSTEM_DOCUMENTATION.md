# Aura Ecommerce Discount System Documentation

## Overview

This document provides a comprehensive guide to the discount system implementation in the Aura Ecommerce project, designed to be replicated across all Pixeocommerce websites.

## Architecture Overview

The discount system consists of four main components:

1. **Database Layer**: Supabase table storing discount codes and Stripe coupon IDs
2. **Frontend Components**: User interfaces for entering discount codes
3. **API Layer**: Validation and application of discounts during checkout
4. **Stripe Integration**: Coupon application in Stripe checkout sessions

## System Components

### 1. Database Schema

#### Discounts Table (Supabase)
```sql
-- Table: discounts
CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  code VARCHAR(50) NOT NULL,
  stripe_coupon_id VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_discounts_store_code ON discounts(store_id, code);
CREATE INDEX idx_discounts_active ON discounts(active);
```

#### Required Fields:
- `store_id`: Links discount to specific store
- `code`: User-facing discount code (e.g., "SAVE20")
- `stripe_coupon_id`: Corresponding Stripe coupon ID
- `active`: Boolean flag to enable/disable discount

### 2. Frontend Implementation

#### Component Locations:
- **Checkout Page**: `app/checkout/page.tsx` (lines 87-96)
- **Product Detail Page**: `app/products/[id]/page.tsx` (lines 327-335)

#### Checkout Page Implementation:
```tsx
// State management
const [discountCode, setDiscountCode] = useState("");
const [discountStatus, setDiscountStatus] = useState("");
const [discountDetails, setDiscountDetails] = useState<any>(null);
const [validatingDiscount, setValidatingDiscount] = useState(false);

// UI Component
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
```

#### Product Page Implementation:
```tsx
// State for discount code
const [discountCode, setDiscountCode] = useState("");

// UI in product details
<div className="mb-4">
  <label className="block mb-2">Discount Code</label>
  <input
    type="text"
    value={discountCode}
    onChange={e => setDiscountCode(e.target.value)}
    placeholder="Enter code"
    className="w-full border px-4 py-2"
  />
</div>
```

### 3. API Implementation

#### Endpoint: `/api/create-product-checkout`

**Location**: `app/api/create-product-checkout/route.ts`

**Key Implementation** (lines 133-147):
```typescript
let couponId = undefined;
if (discountCode) {
  // Look up the discount in the database
  const { data: discount, error: discountError } = await supabase
    .from('discounts')
    .select('stripe_coupon_id')
    .eq('store_id', storeId)
    .eq('code', discountCode)
    .eq('active', true)
    .single();
    
  if (discountError || !discount || !discount.stripe_coupon_id) {
    return NextResponse.json({ error: 'Invalid or inactive discount code' }, { status: 400 });
  }
  couponId = discount.stripe_coupon_id;
}
```

**Validation Logic**:
1. Checks if discount code is provided
2. Queries Supabase for matching active discount
3. Validates store_id matches current store
4. Returns error if discount is invalid/inactive
5. Extracts Stripe coupon ID for checkout session

### 4. Stripe Integration

#### Checkout Session Creation (lines 234-262):
```typescript
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
  // CRITICAL: Discount application
  ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
}, {
  stripeAccount: store.stripe_account_id,
});
```

**Key Points**:
- Discount applied conditionally using spread operator
- Coupon ID passed to Stripe's `discounts` array
- Discount code stored in session metadata for tracking

## Implementation Flow

### User Journey:
1. **User enters discount code** on checkout or product page
2. **Code is passed to API** during checkout initiation
3. **API validates code** against Supabase database
4. **Stripe coupon is applied** if valid
5. **User sees discounted price** in Stripe checkout

### Technical Flow:
```
Frontend Input → API Validation → Database Lookup → Stripe Application → Checkout
```

## Setup Instructions for New Pixeocommerce Sites

### Step 1: Database Setup
```sql
-- Create discounts table in Supabase
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

### Step 2: Frontend Components

#### Add to Checkout Page:
```tsx
// State
const [discountCode, setDiscountCode] = useState("");

// UI Component (add before order summary)
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

// Include in checkout payload
const payload = {
  items: cartItems,
  storeId: process.env.NEXT_PUBLIC_STORE_ID,
  storeName: "Your Store Name",
  discountCode, // Add this line
};
```

#### Add to Product Page:
```tsx
// State
const [discountCode, setDiscountCode] = useState("");

// UI Component (add before Buy Now button)
<div className="mb-4">
  <label className="block mb-2">Discount Code</label>
  <input
    type="text"
    value={discountCode}
    onChange={e => setDiscountCode(e.target.value)}
    placeholder="Enter code"
    className="w-full border px-4 py-2"
  />
</div>

// Include in Buy Now payload
body: JSON.stringify({
  items: [itemPayload],
  storeId: storeId,
  storeName: "Your Store",
  discountCode: discountCode, // Add this line
})
```

### Step 3: API Implementation

#### Create/Update Checkout Endpoint:
```typescript
// Add to request parsing
const { items, storeId, storeName, discountCode } = await request.json();

// Add discount validation logic
let couponId = undefined;
if (discountCode) {
  const { data: discount, error: discountError } = await supabase
    .from('discounts')
    .select('stripe_coupon_id')
    .eq('store_id', storeId)
    .eq('code', discountCode)
    .eq('active', true)
    .single();
    
  if (discountError || !discount || !discount.stripe_coupon_id) {
    return NextResponse.json({ error: 'Invalid or inactive discount code' }, { status: 400 });
  }
  couponId = discount.stripe_coupon_id;
}

// Add to Stripe session creation
const session = await stripe.checkout.sessions.create({
  // ... other properties
  ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
  metadata: {
    // ... other metadata
    discount_code: discountCode || '',
  },
});
```

### Step 4: Stripe Setup

#### Create Coupons in Stripe Dashboard:
1. Go to Stripe Dashboard → Products → Coupons
2. Create coupon (e.g., 20% off, $10 off)
3. Copy coupon ID (starts with `coupon_`)
4. Add to Supabase discounts table

#### Example Stripe Coupon Creation via API:
```typescript
// Optional: Create coupons programmatically
const coupon = await stripe.coupons.create({
  percent_off: 20,
  duration: 'once',
  id: 'SAVE20', // Optional custom ID
});
```

### Step 5: Environment Variables
Ensure these are set:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STORE_ID=your_store_id
```

## Sample Data

### Supabase Discounts Table:
```sql
INSERT INTO discounts (store_id, code, stripe_coupon_id, active) VALUES 
('your-store-id', 'SAVE20', 'coupon_1234567890', true),
('your-store-id', 'WELCOME10', 'coupon_0987654321', true),
('your-store-id', 'EXPIRED', 'coupon_old123', false);
```

## Error Handling

### Common Error Messages:
- `"Invalid or inactive discount code"` - Code doesn't exist or is deactivated
- `"Stripe configuration error"` - Missing Stripe keys
- `"Store ID is required"` - Missing store ID

### Frontend Error Display:
```tsx
{error && <div className="text-red-600">{error}</div>}
```

## Testing Checklist

### Manual Testing:
- [ ] Valid discount code applies correctly
- [ ] Invalid discount code shows error
- [ ] Inactive discount code shows error
- [ ] Discount appears in Stripe checkout
- [ ] Checkout completes successfully
- [ ] Order metadata includes discount code

### Test Cases:
1. **Valid Code**: Enter valid discount code → Should apply discount
2. **Invalid Code**: Enter invalid code → Should show error
3. **Inactive Code**: Enter deactivated code → Should show error
4. **Empty Code**: Leave empty → Should proceed without discount
5. **Case Sensitivity**: Test if codes are case-sensitive

## Maintenance

### Managing Discounts:
1. **Add New Discount**: Create Stripe coupon → Add to Supabase table
2. **Deactivate Discount**: Set `active = false` in Supabase
3. **Update Discount**: Modify Stripe coupon and/or Supabase record

### Monitoring:
- Track discount usage via Stripe dashboard
- Monitor discount code queries in Supabase
- Check checkout session metadata for discount tracking

## Security Considerations

### Best Practices:
- Validate discount codes server-side only
- Use environment variables for sensitive keys
- Implement rate limiting on discount validation
- Log discount usage for audit trails

### Database Security:
- Use RLS (Row Level Security) in Supabase
- Restrict access to discounts table
- Validate store_id in all queries

## Advanced Features

### Potential Enhancements:
- **Expiration Dates**: Add `expires_at` field
- **Usage Limits**: Track usage count
- **User Restrictions**: Limit to specific users
- **Minimum Order**: Add minimum order requirements
- **Category Restrictions**: Limit to specific products

### Example Enhanced Schema:
```sql
ALTER TABLE discounts ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE discounts ADD COLUMN max_uses INTEGER;
ALTER TABLE discounts ADD COLUMN current_uses INTEGER DEFAULT 0;
ALTER TABLE discounts ADD COLUMN minimum_order_amount DECIMAL(10,2);
```

## Troubleshooting

### Common Issues:
1. **Discount not applying**: Check Stripe coupon ID matches
2. **"Invalid discount"**: Verify store_id and active status
3. **Checkout fails**: Ensure all environment variables are set
4. **CORS errors**: Verify API endpoint configuration

### Debug Steps:
1. Check browser console for API errors
2. Verify Supabase query results
3. Test Stripe coupon in dashboard
4. Validate environment variables

---

This documentation provides a complete guide for implementing the discount system across all Pixeocommerce websites. Follow the step-by-step instructions for consistent implementation.
