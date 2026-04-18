# PixeoCommerce Headless Framework Blueprint (V2.0)

This document is the official **Commerce Contract** for the PixeoCommerce Headless platform. It defines the technical standards for data fetching, variant resolution, and storefront behavior. Following these standards ensures that your storefront is performant, stable, and "buyable" by default.

---

## 1. HEADLESS SYSTEM OVERVIEW

PixeoCommerce Headless is a **Relational-First Commerce Engine**. It provides a "buyable-only" public contract, meaning the API automatically filters out inactive data and prunes unavailable options before they reach your storefront.

---

## 2. CORE PRINCIPLES

1.  **Relational Source of Truth**: All new storefronts must use the `product_option_groups` and `product_variants` arrays.
2.  **Buyable-Only Contract**: The API only returns `active` variants and sellable options.
3.  **Dead Option Pruning**: Unavailable or inactive combination paths are stripped at the API level.
4.  **Backend Normalization**: Complex commerce logic (Price ranges, Stock status) is performed server-side for performance.

---

## 3. REQUIRED STARTER ARCHITECTURE

```text
/lib/commerce
  productUtils.ts    <-- Uses product_option_groups & product_variants
  cartEngine.ts      <-- Matches via option_value_ids
/components/commerce
  VariantSelector.ts <-- Renders selectors from API objects
```

---

## 4. PRODUCT DATA CONTRACT (DETAIL PAGE)

The Product Detail API returns the full relational contract. **Do not use wildcard selects.**

### Mandatory Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique product ID. |
| `has_variants` | Boolean | `true` if 1+ **active** variants exist. |
| `in_stock` | Boolean | Mode-aware (Variant stock OR Base stock). |
| `price_min` | Number | Lowest active variant price. |
| `price_max` | Number | Highest active variant price. |
| `product_option_groups` | Array | Pruned list of available choices. |
| `product_variants` | Array | List of active, sellable SKUs. |

### [DEPRECATED] JSON Fields
The following fields are legacy and **should not be used** in new builds:
-   `colors`
-   `sizes`
-   `variants` (JSON column)

---

## 5. SIMPLE VS VARIANT MODE RESOLUTION

Your storefront must handle products based on the `has_variants` flag.

### Mode A: Simple Product (`has_variants: false`)
-   Selectors: **Hidden**.
-   Pricing: Use `price`.
-   Stock: Use `in_stock` (based on base product).
-   Buying: Add to cart directly using `productId`.

### Mode B: Variant Product (`has_variants: true`)
-   Selectors: **Visible** (Rendered from `product_option_groups`).
-   Pricing: Display `price_min` to `price_max` until a variant is selected.
-   Stock: Use `in_stock` (based on active variants).
-   Buying: Add to cart using `productId` + `variantId`.

---

## 6. VARIANT RESOLUTION LOGIC (FAST-MATCHING)

Every variant in the V2.0 contract includes a convenience array: `option_value_ids: string[]`.

### Selection Strategy
1.  Store user selection in a state: `{ [groupId]: valueId }`.
2.  Find the variant where its `option_value_ids` array **exactly contains all** selected `valueId`s.
3.  Update the UI (Price, SKU, Stock) using the matched variant.

```typescript
const selectedValueIds = Object.values(selections); // ['val_1', 'val_2']
const matchedVariant = product.product_variants.find(v => 
  selectedValueIds.every(id => v.option_value_ids.includes(id))
);
```

---

## 7. DEAD OPTION PRUNING

The PixeoCommerce backend automatically prunes "dead" option values.
*   If you have a "Red" shirt but all Red variants are **Inactive**, the "Red" choice will NOT appear in the `product_option_groups` payload.
*   This ensures the storefront only ever displays buyable paths, preventing "404 - Not Found" errors during selection.

---

## 8. PRODUCT LIST / CATEGORY RESPONSES

The Listing API is optimized for speed and returns a lightweight summary payload.

**Listing Fields included by default:**
-   `name`, `slug`, `price`, `compare_at_price`
-   `primary_image` (extracted from `image_urls[0]`)
-   `has_variants` (Active-only)
-   `in_stock` (Mode-aware)
-   `price_min`, `price_max`

---

## 9. EXAMPLE RESPONSE PAYLOAD (VARIANT PRODUCT)

```json
{
  "product": {
    "name": "NudeTone Performance Set",
    "has_variants": true,
    "in_stock": true,
    "price_min": 45.00,
    "price_max": 55.00,
    "product_option_groups": [
      {
        "name": "Size",
        "product_option_values": [
          { "id": "val_sm", "value": "Small" },
          { "id": "val_lg", "value": "Large" }
        ]
      }
    ],
    "product_variants": [
      {
        "id": "var_1",
        "price": 45.00,
        "stock": 10,
        "option_value_ids": ["val_sm"]
      }
    ]
  }
}
```

---

## 10. PLUG-AND-PLAY SUMMARY

By standardizing on this relational contract, any PixeoCommerce theme can reliably resolve variants, handle pricing fallbacks, and manage inventory without project-specific customization. AI tools and developers should target the **Relational Framework V2.0** for all new builds.
