export type SupportedLocale = 'en-US' | 'en-GB' | 'fr-FR' | 'de-DE' | 'es-ES';

export type SupportedTimeZone =
  | 'America/New_York'
  | 'America/Los_Angeles'
  | 'Europe/London'
  | 'Europe/Paris'
  | 'Europe/Berlin';

export type SupportedCurrency = 'USD' | 'GBP' | 'EUR';

export interface LocaleConfig {
  locale: SupportedLocale;
  timeZone: SupportedTimeZone;
  currency: SupportedCurrency;
  regionLabel: string;
  timeZoneLabel: string;
  currencyLabel: string;
}
