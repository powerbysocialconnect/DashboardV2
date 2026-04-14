# PixeoCommerce Categories System Documentation

## Overview

The PixeoCommerce platform implements a standardized category system that organizes products for better user experience and navigation. This documentation covers the complete PixeoCommerce category standard that can be reused across all stores built on the platform.

## PixeoCommerce Platform Context

**Platform**: PixeoCommerce (pixeocommerce.com)  
**Store Type**: Multi-tenant ecommerce platform  
**Architecture**: Next.js + Supabase + Stripe  
**Domain Structure**: `[store-name].pixeocommerce.com`

## Category Structure

### 1. Featured Categories (Static Navigation)

**Location**: `app/components/FeaturedCategories.tsx`

The main navigation categories are defined as a static array in the `FeaturedCategories` component:

```typescript
const categories = [
  {
    name: "Essentials",
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1005&q=80",
    href: "/apparel/essentials",
  },
  {
    name: "Outerwear",
    image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1026&q=80",
    href: "/apparel/outerwear",
  },
  {
    name: "Accessories",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=987&q=80",
    href: "/accessories",
  },
  {
    name: "New Arrivals",
    image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1026&q=80",
    href: "/new-arrivals",
  },
]
```

**Properties**:
- `name`: Display name of the category
- `image`: Unsplash image URL for category representation
- `href`: Navigation link for the category

**Display**: Categories are rendered in a responsive grid (1 column on mobile, 2 on tablet, 4 on desktop) with hover effects and category labels.

### 2. Dynamic Categories (Database-Driven)

**Location**: `app/shop-all/page.tsx`

Categories are dynamically extracted from the products database and used for filtering:

```typescript
// Extract unique categories from products
const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
```

**Data Source**: Categories are pulled from the `products` table in Supabase, specifically from the `category` field.

**Usage**: Dynamic categories are used in the shop-all page filters to allow users to filter products by category.

## PixeoCommerce Database Schema

### Core Tables Structure

#### 1. Stores Table
```sql
stores {
  id: uuid (primary key)
  name: string
  description: string | null
  currency: string
  contact_email: string | null
  timezone: string
  language: string
  stripe_account_id: string | null
  is_disabled: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

#### 2. Products Table
```sql
products {
  id: uuid (primary key)
  store_id: uuid (foreign key to stores.id)
  name: string
  description: text
  price: decimal
  category: string
  brand: string
  condition: string
  sku: string
  stock: integer
  active: boolean
  image_urls: string[]
  stripe_product_id: string | null
  stripe_price_id: string | null
  created_at: timestamp
  updated_at: timestamp
}
```

#### 3. Product Variants Table
```sql
product_variants {
  id: uuid (primary key)
  product_id: uuid (foreign key to products.id)
  name: string
  price: decimal
  stock: integer
  attributes: jsonb
  image_urls: string[]
  stripe_price_id: string | null
  created_at: timestamp
  updated_at: timestamp
}
```

### Category Implementation Details

#### Category Field Structure
- **Field Type**: `string` in products table
- **Content**: Human-readable category names
- **Examples**: "Essentials", "Outerwear", "Accessories", "New Arrivals"
- **Filtering**: Case-sensitive exact matching

#### Brand Field Structure
- **Field Type**: `string` in products table
- **Content**: Brand names for products
- **Filtering**: Case-sensitive exact matching

#### Condition Field Structure
- **Field Type**: `string` in products table
- **Content**: Product condition (e.g., "new", "used", "refurbished")
- **Filtering**: Case-sensitive exact matching

## Category Filtering System

### Filter Implementation

**Location**: `app/shop-all/page.tsx`

```typescript
const [filters, setFilters] = useState<Record<string, any[]>>({
  category: [],
  brand: [],
  condition: [],
  priceRange: [0, 500],
})

const handleFilterChange = (type: string, value: string) => {
  setFilters((prev) => ({
    ...prev,
    [type]: prev[type].includes(value) 
      ? prev[type].filter((item: any) => item !== value) 
      : [...prev[type], value],
  }))
}

const filteredProducts = products.filter((product: any) => {
  // Category filter
  if (filters.category.length > 0 && !filters.category.includes(product.category)) 
    return false
  
  // Brand filter
  if (filters.brand.length > 0 && !filters.brand.includes(product.brand)) 
    return false
  
  // Condition filter
  if (filters.condition.length > 0 && !filters.condition.includes(product.condition)) 
    return false
  
  // Price range filter
  let productPrice = product.price || 0
  if (product.variants && product.variants.length > 0) {
    productPrice = Math.min(...product.variants.map((v: any) => v.price || 0))
  }
  
  if (productPrice < filters.priceRange[0] || productPrice > filters.priceRange[1]) 
    return false
  
  return true
})
```

### Filter Types

1. **Category**: Product category grouping
2. **Brand**: Product brand filtering
3. **Condition**: Product condition (new, used, etc.)
4. **Price Range**: Price-based filtering with min/max values

## PixeoCommerce Category Display Components

### 1. Featured Categories Grid
- **Component**: `FeaturedCategories`
- **Layout**: Responsive grid with hover effects
- **Images**: High-quality Unsplash images
- **Navigation**: Direct links to category pages
- **Responsive**: 1 column (mobile) → 2 columns (tablet) → 4 columns (desktop)

### 2. Shop All Filters
- **Component**: `ShopAllPage` sidebar filters
- **Mobile**: Collapsible filter overlay
- **Desktop**: Sticky sidebar with checkboxes
- **Real-time**: Filters update product display immediately
- **State Management**: React useState for filter persistence

### 3. Product Detail Categories
- **Component**: `ProductDetailPage`
- **Display**: Category shown in product details section
- **Breadcrumb**: Category included in navigation breadcrumb
- **Variant Support**: Category information for product variants

## PixeoCommerce URL Structure

### Standard Route Patterns

```
/ - Home page with featured categories
/shop-all - All products with category filtering
/products/[id] - Individual product with category info
/apparel/essentials - Category-specific pages (planned)
/apparel/outerwear - Category-specific pages (planned)
/accessories - Category-specific pages (planned)
/new-arrivals - New arrivals collection
/cart - Shopping cart
/checkout - Checkout process
```

### Breadcrumb Navigation

Product pages include category-based breadcrumbs:

```typescript
<nav className="mb-8 text-sm text-charcoal/60">
  <Link href="/" className="hover:text-charcoal">Home</Link>
  <span className="mx-2">/</span>
  <Link href="/shop-all" className="hover:text-charcoal">Shop All</Link>
  <span className="mx-2">/</span>
  <span>{product.name}</span>
</nav>
```

## PixeoCommerce Category Management

### Adding New Categories

To add a new category in any PixeoCommerce store:

1. **Update FeaturedCategories.tsx**:
   ```typescript
   const categories = [
     // ... existing categories
     {
       name: "New Category",
       image: "https://images.unsplash.com/...",
       href: "/new-category",
     }
   ]
   ```

2. **Database**: Ensure products have the new category value in the `category` field

3. **Routing**: Create corresponding page routes if needed

4. **Store Configuration**: Update store-specific category settings

### Category Images

- **Source**: Unsplash (high-quality, free stock photos)
- **Format**: Optimized URLs with query parameters
- **Fallback**: `/placeholder.svg` for missing images
- **Responsive**: Images scale appropriately across devices
- **Performance**: Next.js Image component optimization

## PixeoCommerce Technical Implementation

### State Management

Categories use React state for filtering across all stores:

```typescript
const [filters, setFilters] = useState<Record<string, any[]>>({
  category: [],
  brand: [],
  condition: [],
  priceRange: [0, 500],
})
```

### Store Context Integration

```typescript
const { store } = useStore()

// Store-specific configuration
const currency = store?.currency || 'gbp'
const storeId = process.env.NEXT_PUBLIC_STORE_ID
```

### Performance Considerations

- **Dynamic Loading**: Categories are extracted from products on-demand
- **Filtering**: Client-side filtering for immediate response
- **Image Optimization**: Next.js Image component for performance
- **Responsive Design**: Mobile-first approach with progressive enhancement
- **Database Indexing**: Optimized queries with store_id filtering

### Accessibility

- **Semantic HTML**: Proper heading hierarchy and navigation
- **Keyboard Navigation**: Filter checkboxes are keyboard accessible
- **Screen Readers**: Alt text for category images
- **Focus Management**: Proper focus states for interactive elements
- **ARIA Labels**: Appropriate accessibility attributes

## PixeoCommerce Multi-Store Architecture

### Store Isolation

- **Store ID**: Each store has unique `NEXT_PUBLIC_STORE_ID`
- **Database Filtering**: All queries filter by `store_id`
- **Domain Separation**: `[store-name].pixeocommerce.com`
- **Independent Data**: Categories, products, and settings per store

### Shared Components

- **Category System**: Standardized across all stores
- **Filter Logic**: Reusable filtering components
- **UI Components**: Consistent design system
- **Navigation**: Standardized routing patterns

## Future Enhancements

### Planned PixeoCommerce Features

1. **Category Pages**: Dedicated pages for each category
2. **Subcategories**: Hierarchical category structure
3. **Category Management**: Admin interface for category CRUD operations
4. **SEO Optimization**: Category-specific meta tags and descriptions
5. **Analytics**: Category performance tracking across stores
6. **Multi-language**: Internationalization support
7. **Category Templates**: Customizable category layouts

### Scalability Considerations

- **Database Indexing**: Index on category field for performance
- **Caching**: Category data caching for faster loading
- **CDN**: Image optimization and delivery
- **API Endpoints**: RESTful category management endpoints
- **Store Clustering**: Efficient multi-tenant architecture

## PixeoCommerce Best Practices

### Category Naming

- Use clear, descriptive names
- Maintain consistency across all stores
- Consider SEO implications
- Use proper capitalization
- Follow PixeoCommerce naming conventions

### Image Selection

- Choose high-quality, relevant images
- Maintain consistent aspect ratios
- Optimize for web delivery
- Provide meaningful alt text
- Use PixeoCommerce approved image sources

### User Experience

- Keep category count manageable (4-8 main categories)
- Ensure logical grouping
- Provide clear navigation paths
- Maintain visual consistency across stores
- Follow PixeoCommerce design guidelines

## Troubleshooting

### Common PixeoCommerce Issues

1. **Categories Not Displaying**: Check database connection and product data
2. **Filter Not Working**: Verify filter state management
3. **Images Not Loading**: Check image URLs and fallback handling
4. **Mobile Filter Issues**: Ensure responsive design implementation
5. **Store-Specific Issues**: Verify store_id configuration

### Debug Steps

1. Check browser console for errors
2. Verify Supabase connection
3. Confirm product data structure
4. Test filter functionality
5. Validate responsive behavior
6. Check store configuration
7. Verify domain settings

## PixeoCommerce Store Setup

### New Store Configuration

1. **Environment Variables**:
   ```bash
   NEXT_PUBLIC_STORE_ID=your-store-uuid
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
   ```

2. **Database Setup**:
   - Create store record in `stores` table
   - Configure store-specific settings
   - Set up Stripe account integration

3. **Category Configuration**:
   - Update `FeaturedCategories.tsx` with store-specific categories
   - Configure category images and navigation
   - Set up category-specific routing

### Store Migration

1. **Data Export**: Export existing category structure
2. **Category Mapping**: Map old categories to PixeoCommerce standard
3. **Data Import**: Import products with new category structure
4. **Testing**: Verify category functionality
5. **Go Live**: Activate new category system

## Conclusion

The PixeoCommerce category system provides a robust, standardized foundation for product organization and user navigation across all stores on the platform. The combination of static featured categories and dynamic database-driven filtering offers flexibility while maintaining performance and user experience.

The system is designed to be easily extensible and reusable, allowing for consistent implementation across multiple stores while supporting store-specific customization. This standardization ensures that all PixeoCommerce stores benefit from the same high-quality category management system.

### Key Benefits for PixeoCommerce Stores

- **Consistency**: Standardized category structure across all stores
- **Maintainability**: Centralized category management system
- **Performance**: Optimized filtering and display components
- **Scalability**: Multi-tenant architecture support
- **Reusability**: Components can be shared across stores
- **Customization**: Store-specific category configurations
