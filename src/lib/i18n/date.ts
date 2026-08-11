import type { SupportedLocale, SupportedTimeZone } from '@/types';

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

const DEFAULT_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
};

const DEFAULT_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short',
};

export function toIsoUtc(date: Date): string {
  return date.toISOString();
}

export function fromUtc(isoUtc: string): Date {
  return new Date(isoUtc);
}

export function formatDate(
  isoUtc: string,
  timeZone: SupportedTimeZone,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(fromUtc(isoUtc));
}

export function formatTime(
  isoUtc: string,
  timeZone: SupportedTimeZone,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = DEFAULT_TIME_OPTIONS,
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(fromUtc(isoUtc));
}

export function formatDateTime(
  isoUtc: string,
  timeZone: SupportedTimeZone,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATETIME_OPTIONS,
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(fromUtc(isoUtc));
}

export function formatTimezoneOffset(timeZone: SupportedTimeZone, isoUtc: string): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  });
  return dtf.format(fromUtc(isoUtc)).split(', ').pop() ?? '';
}

export function isUtcIsoString(value: string): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value);
}
