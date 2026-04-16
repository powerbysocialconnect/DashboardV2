export interface PlanDefinition {
  name: string;
  displayName: string;
  maxProducts: number;
  maxOrdersPerMonth: number | null;
  maxStorageMb: number;
  features: {
    customDomain: boolean;
    themeCustomization: boolean;
    premiumThemes: boolean;
    prioritySupport: boolean;
    analytics: boolean;
    discountCodes: boolean;
    multipleImages: boolean;
    blogSupport?: boolean;
    customDesign?: boolean;
  };
  priceMonthly: number;
  priceYearly: number;
  trialDays: number;
  /** Percentage fee taken from each sale (0 = no fee) */
  transactionFeePercent: number;
  isOneTime?: boolean;
}

export const PLANS: Record<string, PlanDefinition> = {
  launch: {
    name: "launch",
    displayName: "🚀 Launch Store",
    maxProducts: 25, 
    maxOrdersPerMonth: null,
    maxStorageMb: 2000,
    features: {
      customDomain: false,
      themeCustomization: false,
      premiumThemes: false,
      prioritySupport: false,
      analytics: false,
      discountCodes: true,
      multipleImages: true,
    },
    priceMonthly: 1, // One-time £1 represented here
    priceYearly: 1,
    trialDays: 0,
    transactionFeePercent: 0,
    isOneTime: true,
  },
  starter: {
    name: "starter",
    displayName: "🌱 Starter Store",
    maxProducts: 50,
    maxOrdersPerMonth: null,
    maxStorageMb: 5000,
    features: {
      customDomain: false,
      themeCustomization: true,
      premiumThemes: false,
      prioritySupport: false,
      analytics: false,
      discountCodes: true,
      multipleImages: true,
    },
    priceMonthly: 10,
    priceYearly: 100,
    trialDays: 14,
    transactionFeePercent: 0,
  },
  premium: {
    name: "premium",
    displayName: "💎 Premium Store",
    maxProducts: 100,
    maxOrdersPerMonth: null,
    maxStorageMb: 10000,
    features: {
      customDomain: true,
      themeCustomization: true,
      premiumThemes: true,
      prioritySupport: false,
      analytics: true,
      discountCodes: true,
      multipleImages: true,
    },
    priceMonthly: 14.99,
    priceYearly: 149.9,
    trialDays: 14,
    transactionFeePercent: 0,
  },
  maintenance: {
    name: "maintenance",
    displayName: "🔧 Store Maintenance",
    maxProducts: -1,
    maxOrdersPerMonth: null,
    maxStorageMb: 50000,
    features: {
      customDomain: true,
      themeCustomization: true,
      premiumThemes: true,
      prioritySupport: true,
      analytics: true,
      discountCodes: true,
      multipleImages: true,
    },
    priceMonthly: 35,
    priceYearly: 350,
    trialDays: 0,
    transactionFeePercent: 0,
  },
  pro: {
    name: "pro",
    displayName: "🏆 Pro Store",
    maxProducts: -1,
    maxOrdersPerMonth: null,
    maxStorageMb: 100000,
    features: {
      customDomain: true,
      themeCustomization: true,
      premiumThemes: true,
      prioritySupport: true,
      analytics: true,
      discountCodes: true,
      multipleImages: true,
      blogSupport: true,
    },
    priceMonthly: 40,
    priceYearly: 400,
    trialDays: 14,
    transactionFeePercent: 0,
  },
  custom: {
    name: "custom",
    displayName: "✨ Custom Store",
    maxProducts: -1,
    maxOrdersPerMonth: null,
    maxStorageMb: 500000,
    features: {
      customDomain: true,
      themeCustomization: true,
      premiumThemes: true,
      prioritySupport: true,
      analytics: true,
      discountCodes: true,
      multipleImages: true,
      blogSupport: true,
      customDesign: true,
    },
    priceMonthly: 200,
    priceYearly: 2000,
    trialDays: 0,
    transactionFeePercent: 0,
  },
};

export function getPlan(planName: string | null | undefined): PlanDefinition {
  if (!planName) return PLANS.starter;
  
  const normalized = planName.toLowerCase();
  
  if (normalized.includes("launch")) return PLANS.launch;
  if (normalized.includes("starter")) return PLANS.starter;
  if (normalized.includes("premium")) return PLANS.premium;
  if (normalized.includes("maintenance")) return PLANS.maintenance;
  if (normalized.includes("pro")) return PLANS.pro;
  if (normalized.includes("custom")) return PLANS.custom;
  
  return PLANS[normalized] || PLANS.starter;
}

export function getTrialDaysRemaining(
  trialEndsAt: string | null | undefined
): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function isTrialActive(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) > new Date();
}

export function isTrialExpiringSoon(
  trialEndsAt: string | null | undefined,
  daysThreshold = 3
): boolean {
  const remaining = getTrialDaysRemaining(trialEndsAt);
  if (remaining === null) return false;
  return remaining > 0 && remaining <= daysThreshold;
}
