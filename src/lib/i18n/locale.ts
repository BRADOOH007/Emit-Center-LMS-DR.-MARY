import type { LocaleConfig, SupportedCurrency, SupportedLocale, SupportedTimeZone } from '@/types';

export const LOCALE_OPTIONS: LocaleConfig[] = [
  {
    locale: 'en-US',
    timeZone: 'America/New_York',
    currency: 'USD',
    regionLabel: 'United States',
    timeZoneLabel: 'US Eastern (EST/EDT)',
    currencyLabel: 'US Dollar ($)',
  },
  {
    locale: 'en-US',
    timeZone: 'America/Los_Angeles',
    currency: 'USD',
    regionLabel: 'United States (Pacific)',
    timeZoneLabel: 'US Pacific (PST/PDT)',
    currencyLabel: 'US Dollar ($)',
  },
  {
    locale: 'en-GB',
    timeZone: 'Europe/London',
    currency: 'GBP',
    regionLabel: 'United Kingdom',
    timeZoneLabel: 'UK (GMT/BST)',
    currencyLabel: 'British Pound (£)',
  },
  {
    locale: 'fr-FR',
    timeZone: 'Europe/Paris',
    currency: 'EUR',
    regionLabel: 'France',
    timeZoneLabel: 'EU Central (CET/CEST)',
    currencyLabel: 'Euro (€)',
  },
  {
    locale: 'de-DE',
    timeZone: 'Europe/Berlin',
    currency: 'EUR',
    regionLabel: 'Germany',
    timeZoneLabel: 'EU Central (CET/CEST)',
    currencyLabel: 'Euro (€)',
  },
  {
    locale: 'es-ES',
    timeZone: 'Europe/Paris',
    currency: 'EUR',
    regionLabel: 'Spain',
    timeZoneLabel: 'EU Central (CET/CEST)',
    currencyLabel: 'Euro (€)',
  },
];

export const DEFAULT_LOCALE: LocaleConfig = LOCALE_OPTIONS[0];

export const TIME_ZONES: SupportedTimeZone[] = [
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
];

export const CURRENCIES: SupportedCurrency[] = ['USD', 'GBP', 'EUR'];

export function isSupportedTimeZone(value: string): value is SupportedTimeZone {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return TIME_ZONES.includes(value as SupportedTimeZone);
  } catch {
    return false;
  }
}

export function findLocaleOption(predicate: {
  locale?: SupportedLocale;
  timeZone?: SupportedTimeZone;
  currency?: SupportedCurrency;
}): LocaleConfig {
  return (
    LOCALE_OPTIONS.find(
      (option) =>
        (predicate.locale === undefined || option.locale === predicate.locale) &&
        (predicate.timeZone === undefined || option.timeZone === predicate.timeZone) &&
        (predicate.currency === undefined || option.currency === predicate.currency),
    ) ?? DEFAULT_LOCALE
  );
}
