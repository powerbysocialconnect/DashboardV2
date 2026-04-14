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
  };
  priceMonthly: number;
  priceYearly: number;
  trialDays: number;
  /** Percentage fee taken from each sale (0 = no fee) */
  transactionFeePercent: number;
}

export const PLANS: Record<string, PlanDefinition> = {
  pixeowelcome: {
    name: "pixeowelcome",
    displayName: "PixeoWelcome",
    maxProducts: 50,
    maxOrdersPerMonth: 500,
    maxStorageMb: 1000,
    features: {
      customDomain: false,
      themeCustomization: true,
      premiumThemes: false,
      prioritySupport: false,
      analytics: true,
      discountCodes: true,
      multipleImages: true,
    },
    priceMonthly: 0,
    priceYearly: 0,
    trialDays: 0,
    transactionFeePercent: 2.5,
  },
  "🌱 starter store": {
    name: "🌱 Starter Store",
    displayName: "🌱 Starter Store",
    maxProducts: 100,
    maxOrdersPerMonth: 100,
    maxStorageMb: 500,
    features: {
      customDomain: false,
      themeCustomization: true,
      premiumThemes: false,
      prioritySupport: false,
      analytics: false,
      discountCodes: true,
      multipleImages: true,
    },
    priceMonthly: 19,
    priceYearly: 190,
    trialDays: 14,
    transactionFeePercent: 0,
  },
  "starter store": {
    name: "Starter Store",
    displayName: "Starter Store",
    maxProducts: 100,
    maxOrdersPerMonth: 100,
    maxStorageMb: 500,
    features: {
      customDomain: false,
      themeCustomization: true,
      premiumThemes: false,
      prioritySupport: false,
      analytics: false,
      discountCodes: true,
      multipleImages: true,
    },
    priceMonthly: 19,
    priceYearly: 190,
    trialDays: 14,
    transactionFeePercent: 0,
  },
  "💎 premium store": {
    name: "💎 Premium Store",
    displayName: "💎 Premium Store",
    maxProducts: 250,
    maxOrdersPerMonth: 1000,
    maxStorageMb: 5000,
    features: {
      customDomain: true,
      themeCustomization: true,
      premiumThemes: true,
      prioritySupport: false,
      analytics: true,
      discountCodes: true,
      multipleImages: true,
    },
    priceMonthly: 49,
    priceYearly: 490,
    trialDays: 14,
    transactionFeePercent: 0,
  },
  "premium store": {
    name: "Premium Store",
    displayName: "Premium Store",
    maxProducts: 250,
    maxOrdersPerMonth: 1000,
    maxStorageMb: 5000,
    features: {
      customDomain: true,
      themeCustomization: true,
      premiumThemes: true,
      prioritySupport: false,
      analytics: true,
      discountCodes: true,
      multipleImages: true,
    },
    priceMonthly: 49,
    priceYearly: 490,
    trialDays: 14,
    transactionFeePercent: 0,
  },
  "🔧 store maintenance": {
    name: "🔧 Store Maintenance",
    displayName: "🔧 Store Maintenance",
    maxProducts: 500,
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
    priceMonthly: 79,
    priceYearly: 790,
    trialDays: 0,
    transactionFeePercent: 0,
  },
  "store maintenance": {
    name: "Store Maintenance",
    displayName: "Store Maintenance",
    maxProducts: 500,
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
    priceMonthly: 79,
    priceYearly: 790,
    trialDays: 0,
    transactionFeePercent: 0,
  },
};

export function getPlan(planName: string | null | undefined): PlanDefinition {
  if (!planName) return PLANS.starter;
  return PLANS[planName.toLowerCase()] || PLANS.starter;
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

