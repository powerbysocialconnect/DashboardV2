/**
 * UTILITY: Localized Price Formatter
 * Automatically handles symbols ($ vs £ vs €) based on store currency code.
 */
export const formatPrice = (price: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
      minimumFractionDigits: 2
    }).format(price);
  } catch (e) {
    // Fallback if currency code is invalid
    return `${currency || '$'} ${price.toFixed(2)}`;
  }
};
