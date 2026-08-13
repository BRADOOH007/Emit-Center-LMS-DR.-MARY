export const PAYMENT_CONFIG_KEY = 'payment_config';

export interface PaymentConfig {
  stripePublishableKey: string;
  stripeSecretKeyConfigured: boolean;
  baseCurrency: string;
  demoMode: boolean;
  promoCodes: Record<string, { discountPercent: number; maxUses: number }>;
}
