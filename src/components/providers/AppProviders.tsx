'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  Permission,
  Session,
  SupportedCurrency,
  SupportedLocale,
  SupportedTimeZone,
} from '@/types';
import { DEFAULT_LOCALE, findLocaleOption } from '@/lib/i18n/locale';
import { formatCurrency } from '@/lib/i18n/currency';
import { formatDate, formatDateTime, formatTime, toIsoUtc } from '@/lib/i18n/date';
import { can, getRoleHome } from '@/lib/roles';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

interface SessionContextValue {
  user: Session['user'];
  can: (permission: Permission) => boolean;
  roleHome: (role?: Session['user']['activeRole']) => string;
}

interface LocaleContextValue {
  locale: SupportedLocale;
  timeZone: SupportedTimeZone;
  currency: SupportedCurrency;
  regionLabel: string;
  setLocale: (locale: SupportedLocale) => void;
  setTimeZone: (timeZone: SupportedTimeZone) => void;
  setCurrency: (currency: SupportedCurrency) => void;
  formatCurrency: (amount: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (isoUtc: string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (isoUtc: string, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (isoUtc: string, options?: Intl.DateTimeFormatOptions) => string;
  toIsoUtc: (date: Date) => string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const SessionContext = createContext<SessionContextValue | null>(null);
const LocaleContext = createContext<LocaleContextValue | null>(null);

const THEME_STORAGE_KEY = 'emit-theme';
const LOCALE_STORAGE_KEY = 'emit-locale';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function AppProviders({
  user,
  children,
}: {
  user: Session['user'];
  initialTheme?: Theme;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setThemeState(isDark ? 'dark' : 'light');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
  }, [theme, mounted]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(() => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')), []);

  const initialLocale = useMemo(
    () => ({
      locale: user.locale,
      timeZone: user.timeZone,
      currency: user.currency,
    }),
    [user.locale, user.timeZone, user.currency],
  );

  const [localeState, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Partial<typeof initialLocale>;
      setLocaleState({
        locale: parsed.locale ?? initialLocale.locale,
        timeZone: parsed.timeZone ?? initialLocale.timeZone,
        currency: parsed.currency ?? initialLocale.currency,
      });
    } catch {
      return;
    }
  }, [initialLocale]);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, JSON.stringify(localeState));
  }, [localeState]);

  const activeOption = useMemo(() => findLocaleOption(localeState), [localeState]);

  const setLocale = useCallback((locale: SupportedLocale) => {
    setLocaleState((prev) => ({ ...prev, locale }));
  }, []);

  const setTimeZone = useCallback((timeZone: SupportedTimeZone) => {
    setLocaleState((prev) => ({ ...prev, timeZone }));
  }, []);

  const setCurrency = useCallback((currency: SupportedCurrency) => {
    setLocaleState((prev) => ({ ...prev, currency }));
  }, []);

  const sessionValue = useMemo<SessionContextValue>(
    () => ({
      user,
      can: (permission) => can(user, permission),
      roleHome: (role) => getRoleHome(role ?? user.activeRole),
    }),
    [user],
  );

  const localeValue = useMemo<LocaleContextValue>(
    () => ({
      ...localeState,
      regionLabel: activeOption.regionLabel,
      setLocale,
      setTimeZone,
      setCurrency,
      formatCurrency: (amount, options) => formatCurrency(amount, localeState.currency, localeState.locale, options),
      formatDate: (isoUtc, options) => formatDate(isoUtc, localeState.timeZone, localeState.locale, options),
      formatTime: (isoUtc, options) => formatTime(isoUtc, localeState.timeZone, localeState.locale, options),
      formatDateTime: (isoUtc, options) => formatDateTime(isoUtc, localeState.timeZone, localeState.locale, options),
      toIsoUtc,
    }),
    [localeState, activeOption.regionLabel, setLocale, setTimeZone, setCurrency],
  );

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <SessionContext.Provider value={sessionValue}>
        <LocaleContext.Provider value={localeValue}>{children}</LocaleContext.Provider>
      </SessionContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within AppProviders');
  return value;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used within AppProviders');
  return value;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used within AppProviders');
  return value;
}

export { DEFAULT_LOCALE };
