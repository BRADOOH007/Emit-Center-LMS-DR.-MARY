import type { SupportedCurrency, SupportedLocale } from '@/types';

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
};

export function currencySymbol(currency: SupportedCurrency): string {
  return CURRENCY_SYMBOLS[currency];
}

export function formatCurrency(
  amount: number,
  currency: SupportedCurrency,
  locale: SupportedLocale,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    ...options,
  }).format(amount);
}

export function formatCurrencyParts(
  amount: number,
  currency: SupportedCurrency,
  locale: SupportedLocale,
): { symbol: string; value: string } {
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).formatToParts(amount);

  const symbol = parts.find((part) => part.type === 'currency')?.value ?? CURRENCY_SYMBOLS[currency];
  const value = parts
    .filter((part) => part.type !== 'currency')
    .map((part) => part.value)
    .join('');

  return { symbol, value };
}
