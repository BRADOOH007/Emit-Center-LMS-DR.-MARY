'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe, LogOut, Moon, Sun, UserRound, Clock, CircleDollarSign } from 'lucide-react';
import type { Role, User, SupportedLocale, SupportedTimeZone, SupportedCurrency } from '@/types';
import { ROLE_META } from '@/config/roles';
import { CURRENCIES, LOCALE_OPTIONS, TIME_ZONES } from '@/lib/i18n/locale';
import { cn } from '@/lib/utils';
import { useLocale, useTheme } from '@/components/providers/AppProviders';
import { Badge } from '@/components/ui/Badge';
import { UserAvatar } from '@/components/ui/UserAvatar';

const ROLE_BADGE_VARIANT: Record<Role, 'gold' | 'brown' | 'neutral' | 'success'> = {
  super_admin: 'gold',
  administrator: 'brown',
  instructor: 'neutral',
  student: 'success',
  parent: 'neutral',
};

export function ProfileDropdown({ user, onSignOut }: { user: User; onSignOut?: () => void }) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<Role | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useTheme();
  const {
    locale,
    timeZone,
    currency,
    setLocale,
    setTimeZone,
    setCurrency,
  } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSignOut = () => {
    setOpen(false);
    onSignOut?.();
  };

  const handleSwitchRole = async (role: Role) => {
    if (role === user.activeRole || switching) return;
    setSwitching(role);
    try {
      const res = await fetch('/api/auth/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) return;
      setOpen(false);
      router.push(json.data.home);
    } finally {
      setSwitching(null);
    }
  };

  const persistPreference = (patch: {
    locale?: SupportedLocale;
    timeZone?: SupportedTimeZone;
    currency?: SupportedCurrency;
  }) => {
    fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => undefined);
  };

  const activeRoleMeta = ROLE_META[user.activeRole];

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="profile-menu"
        className="btn btn-ghost btn-md gap-2.5 !px-1.5"
      >
        <UserAvatar name={user.name} src={user.avatarUrl} size="md" />
        <span className="hidden text-left sm:block">
          <span className="block max-w-[10rem] truncate text-sm font-semibold leading-tight text-text-primary">
            {user.name}
          </span>
          <span className="block text-[11px] font-medium leading-tight text-gold-600 dark:text-gold-400">
            {activeRoleMeta.label}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn('hidden h-4 w-4 text-text-muted transition-transform sm:block', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          id="profile-menu"
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-full z-50 mt-2 w-[20rem] origin-top-right animate-scale-in rounded-panel border border-line bg-base-elevated shadow-pop"
        >
          <div className="border-b border-line p-4">
            <div className="flex items-center gap-3">
              <UserAvatar name={user.name} src={user.avatarUrl} size="lg" online />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">{user.name}</p>
                <p className="truncate text-xs text-text-muted">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={ROLE_BADGE_VARIANT[user.activeRole]} dot>
                {activeRoleMeta.label}
              </Badge>
              <span className="text-[11px] text-text-muted">{activeRoleMeta.description}</span>
            </div>
          </div>

          {user.roles.length > 1 && (
            <div className="border-b border-line p-2">
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted/70">
                Switch role
              </p>
              <ul className="space-y-0.5">
                {user.roles.map((role) => (
                  <li key={role}>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={role === user.activeRole}
                      disabled={switching !== null}
                      onClick={() => handleSwitchRole(role)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-line-soft',
                        role === user.activeRole
                          ? 'font-semibold text-gold-700 dark:text-gold-300'
                          : 'text-text-muted',
                      )}
                    >
                      <UserRound aria-hidden="true" className="h-4 w-4" />
                      <span className="flex-1">{ROLE_META[role].label}</span>
                      {switching === role && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gold-600 border-t-transparent" />
                      )}
                      {role === user.activeRole && <Check aria-hidden="true" className="h-4 w-4" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-b border-line p-2">
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted/70">
              Preferences
            </p>
            <div className="space-y-2 p-2">
              <label className="block">
                <span className="label sr-only">Language</span>
                <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                  <Globe aria-hidden="true" className="h-3.5 w-3.5" /> Language
                </span>
                <select
                  value={locale}
                  onChange={(event) => {
                    const next = event.target.value as User['locale'];
                    setLocale(next);
                    persistPreference({ locale: next });
                  }}
                  className="input !py-1.5"
                >
                  {LOCALE_OPTIONS.map((option) => (
                    <option key={option.locale} value={option.locale}>
                      {option.locale}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                  <Clock aria-hidden="true" className="h-3.5 w-3.5" /> Time zone
                </span>
                <select
                  value={timeZone}
                  onChange={(event) => {
                    const next = event.target.value as User['timeZone'];
                    setTimeZone(next);
                    persistPreference({ timeZone: next });
                  }}
                  className="input !py-1.5"
                >
                  {TIME_ZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                  <CircleDollarSign aria-hidden="true" className="h-3.5 w-3.5" /> Currency
                </span>
                <select
                  value={currency}
                  onChange={(event) => {
                    const next = event.target.value as User['currency'];
                    setCurrency(next);
                    persistPreference({ currency: next });
                  }}
                  className="input !py-1.5"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="space-y-0.5 p-2">
            <button
              type="button"
              role="menuitem"
              onClick={toggleTheme}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-line-soft hover:text-text-primary"
            >
              {theme === 'dark' ? (
                <Sun aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Moon aria-hidden="true" className="h-4 w-4" />
              )}
              {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            </button>
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-line-soft hover:text-text-primary"
            >
              <UserRound aria-hidden="true" className="h-4 w-4" />
              My account
            </Link>
          </div>

          <div className="border-t border-line p-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
