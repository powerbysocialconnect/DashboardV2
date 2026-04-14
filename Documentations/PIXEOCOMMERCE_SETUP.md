# 🚀 PixeoCommerce Integration Setup Guide

Your LDN Shades Core store has been successfully integrated with PixeoCommerce! This guide will help you complete the setup and start selling.

## ✅ What's Been Implemented

### 🏗️ Core Infrastructure
- ✅ **Supabase Integration** - Database client configured for PixeoCommerce
- ✅ **Stripe Integration** - Complete checkout and webhook system
- ✅ **Store Context** - Dynamic store configuration from database
- ✅ **Cart System** - Advanced cart with variant support
- ✅ **Product Management** - Full product fetching and display system
- ✅ **Order Processing** - Automated order creation and inventory updates
- ✅ **Email System** - Order confirmation email integration
- ✅ **Currency Support** - Dynamic currency display and formatting

### 🎨 Updated Components
- ✅ **ProductCard** - Now displays PixeoCommerce products with variants, pricing, and badges
- ✅ **ProductPage** - Full product detail page with Stripe checkout integration
- ✅ **CartDrawer** - Modern cart with PixeoCommerce data structure
- ✅ **Header** - Dynamic store branding and cart management
- ✅ **Success Page** - Professional order confirmation page

### 🔌 API Routes
- ✅ **Product Checkout** - `/api/create-product-checkout`
- ✅ **Cart Checkout** - `/api/create-cart-checkout`
- ✅ **Stripe Webhook** - `/api/stripe/webhook`
- ✅ **Shipping Methods** - `/api/shipping-methods`

## 🔧 Required Setup Steps

### 1. Environment Variables

Copy the example environment file and configure your credentials:

```bash
cp env.example .env.local
```

**Required Variables:**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Store Configuration
NEXT_PUBLIC_STORE_ID=your_store_uuid_from_pixeocommerce
NEXT_PUBLIC_STORE_SUBDOMAIN=your_store_subdomain

# Email Configuration (Optional)
RESEND_API_KEY=your_resend_api_key
```

### 2. Supabase Database Setup

Ensure your Supabase database has the PixeoCommerce schema:

```sql
-- Stores table
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

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  sku TEXT,
  category_id UUID,
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

-- Orders table
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

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Stripe Configuration

1. **Connect Account Setup**: Ensure your store has a Stripe Connect account configured in PixeoCommerce
2. **Webhook Configuration**: Add webhook endpoint `https://yourdomain.com/api/stripe/webhook`
3. **Required Events**: 
   - `checkout.session.completed`
   - `payment_intent.succeeded`

### 4. Product Setup

Add products through the PixeoCommerce dashboard ensuring:
- ✅ Products have valid Stripe price IDs
- ✅ Product images are accessible URLs
- ✅ Stock quantities are set
- ✅ Variants (if any) have individual price IDs

## 🚀 Deployment Instructions

### Vercel Deployment (Recommended)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
vercel --prod
```

3. **Set Environment Variables** in Vercel Dashboard:
   - Add all variables from `.env.local`
   - Ensure webhook URL is set correctly

### Custom Domain Setup

1. Add your domain in Vercel
2. Update DNS records as instructed
3. Update Stripe webhook URLs to use your custom domain

## 🧪 Testing Checklist

### Pre-Launch Testing
- [ ] **Store Loading**: Verify store data loads correctly
- [ ] **Product Display**: Check products show with correct pricing and currency
- [ ] **Product Variants**: Test variant selection and pricing
- [ ] **Add to Cart**: Verify cart functionality
- [ ] **Cart Management**: Test quantity updates and item removal
- [ ] **Checkout Flow**: Complete test purchase with Stripe test cards
- [ ] **Order Processing**: Verify orders are created in database
- [ ] **Email Confirmation**: Check order confirmation emails
- [ ] **Inventory Updates**: Verify stock decreases after purchase
- [ ] **Success Page**: Test order success flow
- [ ] **Mobile Responsiveness**: Test on mobile devices

### Test Cards (Stripe Test Mode)
```
Successful payment: 4242 4242 4242 4242
Declined payment: 4000 0000 0000 0002
```

## 🔍 Troubleshooting

### Common Issues

**1. "Store not found" Error**
- Verify `NEXT_PUBLIC_STORE_ID` matches your PixeoCommerce store ID
- Check Supabase connection
- Ensure store is active in database

**2. "Product not found" Error**
- Check product exists in Supabase
- Verify product is active (`active = true`)
- Check store_id matches

**3. Stripe Checkout Fails**
- Verify Stripe keys are correct
- Check connected account is set up
- Ensure price IDs exist in Stripe

**4. Webhook Errors**
- Verify webhook URL is correct
- Check webhook secret matches
- Review webhook logs in Stripe dashboard

**5. Images Not Loading**
- Check image URLs are accessible
- Verify Next.js image domains configuration
- Ensure images are HTTPS

### Debug Commands

```bash
# Check environment variables
echo $NEXT_PUBLIC_STORE_ID

# Test Supabase connection
npm run dev
# Check browser console for errors

# View webhook logs (if using Stripe CLI)
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 📊 Performance Optimization

### Recommended Settings
- Enable image optimization in Next.js
- Use Vercel's Edge Network for global performance
- Implement product image caching
- Consider adding product search functionality

### Analytics Integration
Consider adding:
- Google Analytics for traffic tracking
- Stripe Analytics for sales insights
- Conversion tracking for checkout optimization

## 🚨 Security Best Practices

### Environment Variables
- ✅ Never commit `.env.local` to git
- ✅ Use different Stripe keys for test/live modes
- ✅ Rotate API keys periodically
- ✅ Use Supabase RLS (Row Level Security) policies

### Webhook Security
- ✅ Always verify webhook signatures
- ✅ Use HTTPS for webhook endpoints
- ✅ Implement proper error handling

## 📈 Going Live

### Pre-Launch Checklist
- [ ] Switch to Stripe live mode
- [ ] Update all environment variables to production values
- [ ] Test with real payment methods
- [ ] Set up monitoring and alerts
- [ ] Create backup procedures
- [ ] Document customer support processes

### Post-Launch Monitoring
- Monitor webhook delivery success rates
- Track order completion rates
- Monitor site performance and uptime
- Review customer feedback and issues

## 🆘 Support

### Development Support
- **Documentation**: Refer to this guide and the PixeoCommerce docs
- **GitHub Issues**: Report bugs in your repository
- **Stripe Documentation**: https://stripe.com/docs

### Business Support
- **PixeoCommerce Dashboard**: Manage products, orders, and analytics
- **Stripe Dashboard**: Monitor payments and disputes
- **Vercel Dashboard**: Monitor deployments and performance

---

## 🎉 Congratulations!

Your LDN Shades Core store is now fully integrated with PixeoCommerce! You have:

✅ **Complete E-commerce Functionality**
✅ **Professional Payment Processing** 
✅ **Automated Order Management**
✅ **Scalable Architecture**
✅ **Modern User Experience**

**Next Steps:**
1. Complete the environment setup
2. Add your products through PixeoCommerce
3. Test the entire flow
4. Deploy to production
5. Start selling! 🚀

Your store is now ready to provide a world-class e-commerce experience to your customers.
