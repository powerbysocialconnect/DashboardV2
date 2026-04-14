/**
 * PixeoCommerce V2 Theme SDK - Core Types
 */

export interface ThemeContract {
  id: string;
  name: string;
  version: string;
  settings: Record<string, any>;
}

export type SectionInputType = 
  | 'text' 
  | 'textarea' 
  | 'image' 
  | 'product' 
  | 'collection' 
  | 'color' 
  | 'select' 
  | 'checkbox' 
  | 'number' 
  | 'link';

export interface SectionInput {
  id: string;
  type: SectionInputType;
  label: string;
  default?: any;
  options?: { label: string; value: string }[];
}

export interface SectionSchema {
  name: string;
  settings: SectionInput[];
  blocks?: {
    name: string;
    type: string;
    limit?: number;
    settings: SectionInput[];
  }[];
  presets?: {
    name: string;
    settings: Record<string, any>;
  }[];
}

export interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  images: string[];
  variants: any[];
  stock: number;
}

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant_id?: string;
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}
