export type StoreStatus =
  | "draft"
  | "vision_submitted"
  | "building"
  | "review_ready"
  | "live"
  | "maintenance"
  | "disabled";

export type ProvisioningJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type VisionFormStatus =
  | "new"
  | "assigned"
  | "building"
  | "ready_for_review"
  | "launched"
  | "archived";

export type DomainVerificationStatus = "pending" | "verified" | "failed";
export type SSLStatus = "pending" | "active" | "failed";
export type ThemeCode = "starter" | "premium" | "pro" | "maintenance" | "store" | "core";

export type FulfillmentStatus =
  | "unfulfilled"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type RefundStatus = "none" | "partial" | "full";

export type StoreEventSource = "stripe" | "system" | "admin" | "dashboard";

export type StoreEventType =
  | "checkout.session.completed"
  | "payment.succeeded"
  | "payment.failed"
  | "order.created"
  | "order.paid"
  | "order.refunded"
  | "order.fulfillment_updated"
  | "order.shipped"
  | "order.delivered"
  | "subscription.updated"
  | "subscription.cancelled"
  | "discount.applied";

export type HomepageSectionType =
  | "hero"
  | "featured_products"
  | "category_grid"
  | "image_with_text"
  | "testimonials"
  | "newsletter"
  | "rich_text";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  subscription_status: string | null;
  subscription_plan: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  subdomain: string;
  description: string | null;
  logo_url: string | null;
  template_id: string | null;
  branding: Record<string, unknown> | null;
  currency: string;
  is_disabled: boolean;
  stripe_account_id: string | null;
  stripe_connected: boolean;
  // New additive columns
  status: StoreStatus;
  trial_ends_at: string | null;
  launched_at: string | null;
  published_at: string | null;
  template_source: string | null;
  social_links: Record<string, string> | null;
  footer_headline: string | null;
  footer_description: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreThemeConfig {
  id: string;
  store_id: string;
  theme_code: ThemeCode;
  theme_settings: ThemeSettings;
  homepage_layout: HomepageSection[];
  custom_css: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThemeSettings {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  headingFont: string;
  bodyFont: string;
  buttonStyle: "rounded" | "square" | "pill";
  logoAlignment: "left" | "center" | "right";
}

export interface HomepageSection {
  type: HomepageSectionType;
  variant?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  limit?: number;
  category_id?: string;
  items?: Record<string, unknown>[];
}

export interface StoreStatusHistory {
  id: string;
  store_id: string;
  status: string;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface StoreOnboardingTask {
  id: string;
  store_id: string;
  task_key: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreDomain {
  id: string;
  store_id: string;
  domain: string;
  is_primary: boolean;
  verification_status: DomainVerificationStatus;
  ssl_status: SSLStatus;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  image_urls: string[];
  category_id: string | null;
  variants: ProductVariant[] | null;
  stock: number;
  active: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  /** Flat variant fields used by the dashboard and storefront */
  id?: string;
  name: string;
  price?: number;
  stock?: number;
  /** Legacy options-style fields */
  options?: string[];
  prices?: Record<string, number>;
}

export interface Order {
  id: string;
  store_id: string;
  customer_id: string | null;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping_cost: number;
  discount_amount: number;
  currency: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  notes: string | null;
  // Fulfillment fields (additive — null/default for old rows)
  fulfillment_status: FulfillmentStatus;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_carrier: string | null;
  fulfilled_at: string | null;
  delivered_at: string | null;
  fulfillment_notes: string | null;
  // Refund fields (additive — null for old rows)
  refund_status: RefundStatus | null;
  refunded_amount: number | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant_selections: Record<string, string> | null;
}

export interface Customer {
  id: string;
  store_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface VisionForm {
  id: string;
  user_id: string;
  brand_name: string;
  subdomain: string | null;
  brand_style: string | null;
  website_category: string | null;
  business_category: string | null;
  business_description: string | null;
  website_details: string | null;
  logo_url: string | null;
  social_links: Record<string, string> | null;
  inspiration_urls: string[] | null;
  plan: string | null;
  status: VisionFormStatus;
  assigned_to: string | null;
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  image_urls: string[] | null;
  category_id: string | null;
  preview_url: string | null;
  config: Record<string, unknown> | null;
  required_subscription_plans: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HeadlessTemplate {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
  theme_code: string;
  version: string | null;
  repository_url: string | null;
  is_system: boolean;
  bundle_url: string | null;
  style_url: string | null;
  category: string | null;
  config: Record<string, unknown> | null;
  config_schema: Record<string, unknown> | null;
  documentation_url: string | null;
  required_plans: string[] | null;
  is_active: boolean;
  current_version_id?: string | null;
  package_status?: string | null;
  source_type?: string | null;
  package_manifest?: Record<string, unknown> | null;
  blueprint?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  store_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface Discount {
  id: string;
  store_id: string;
  code: string;
  description: string | null;
  type: "percentage" | "fixed";
  value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  uses_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  stripe_coupon_id: string | null;
  created_at: string;
}

export interface ShippingMethod {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number;
  estimated_delivery: string | null;
  sort_order: number;
  min_order_amount: number | null;
  is_active: boolean;
  created_at: string;
}

export interface StoreProvisioningJob {
  id: string;
  store_id: string;
  job_type: string | null;
  status: ProvisioningJobStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  error_message: string | null;
  attempts: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreAdminAction {
  id: string;
  store_id: string;
  action: string;
  details: Record<string, unknown> | null;
  performed_by: string;
  created_at: string;
}

export interface StoreBillingSettings {
  id: string;
  store_id: string;
  stripe_subscription_id: string | null;
  plan_name: string | null;
  billing_status: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_frequency: string | null;
  subscription_current_period_end: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanLimit {
  id: string;
  plan_name: string;
  max_products: number;
  max_orders_per_month: number | null;
  max_storage_mb: number | null;
  features: Record<string, boolean>;
  created_at: string;
}

export interface StoreEvent {
  id: string;
  store_id: string;
  order_id: string | null;
  customer_id: string | null;
  source: StoreEventSource;
  event_type: StoreEventType;
  event_status: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export type PageType = "standard" | "contact" | "faq" | "custom";

export type PageSectionType =
  | "hero"
  | "text"
  | "image_text"
  | "faq_accordion"
  | "contact_form"
  | "cta_banner"
  | "testimonials"
  | "spacer";

export interface PageSection {
  id: string;
  type: PageSectionType;
  // Hero
  heading?: string;
  subheading?: string;
  button_text?: string;
  button_url?: string;
  background_image_url?: string;
  // Text
  content?: string;
  // Image + Text
  image_url?: string;
  image_alt?: string;
  image_position?: "left" | "right";
  // FAQ Accordion
  items?: { question: string; answer: string }[];
  // Contact Form
  email?: string;
  phone?: string;
  address?: string;
  form_heading?: string;
  // CTA Banner
  cta_heading?: string;
  cta_description?: string;
  cta_button_text?: string;
  cta_button_url?: string;
  cta_background_color?: string;
  // Testimonials
  testimonials?: { name: string; role?: string; quote: string; avatar_url?: string }[];
  // Spacer
  height?: number;
}

export interface StorePage {
  id: string;
  store_id: string;
  title: string;
  slug: string;
  page_type: PageType;
  content_json: PageSection[];
  is_published: boolean;
  show_in_header: boolean;
  show_in_footer: boolean;
  nav_order: number;
  footer_order: number;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreSectionOverride {
  id: string;
  store_id: string;
  theme_code: string;
  section_type: string;
  section_index: number;
  section_instance_id: string | null;
  overrides: Record<string, unknown>;
  is_enabled: boolean;
  sort_order: number | null;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

// Joined types used in UI
export interface StoreWithOwner extends Store {
  owner?: Profile;
}

export interface StoreWithConfig extends Store {
  theme_config?: StoreThemeConfig | null;
  onboarding_tasks?: StoreOnboardingTask[];
  domains?: StoreDomain[];
}

export interface OrderWithCustomer extends Order {
  customer?: Customer | null;
  items?: OrderItem[];
}

export interface VisionFormWithProfile extends VisionForm {
  profile?: Profile;
  assignee?: Profile | null;
}
