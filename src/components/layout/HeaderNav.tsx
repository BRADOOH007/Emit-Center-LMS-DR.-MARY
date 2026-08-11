'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, Moon, Sun } from 'lucide-react';
import { MAIN_NAV } from '@/config/nav';
import { useSession, useTheme } from '@/components/providers/AppProviders';
import { ProfileDropdown } from '@/components/layout/ProfileDropdown';
import { cn } from '@/lib/utils';

export function HeaderNav({ onOpenDrawer, onSignOut }: { onOpenDrawer: () => void; onSignOut?: () => void }) {
  const pathname = usePathname();
  const { user } = useSession();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base-elevated/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 md:gap-4 lg:px-6">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open navigation menu"
          className="btn btn-ghost btn-md !px-2 lg:hidden"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>

        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/brand/emit-logo.png"
            alt="EMIT Center logo"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
          <span className="hidden flex-col sm:flex">
            <span className="font-display text-base font-bold leading-tight tracking-tight text-text-primary">
              EMIT Center
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-600 dark:text-gold-400">
              Learning Portal
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="ml-2 hidden flex-1 lg:block">
          <ul className="flex items-center gap-0.5">
            {MAIN_NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-btn px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-line-soft hover:text-text-primary',
                      active && 'bg-gold-500/10 font-semibold text-gold-700 dark:text-gold-300',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2 lg:flex-none">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="btn btn-ghost btn-md !px-2"
          >
            {theme === 'dark' ? (
              <Sun aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Moon aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
          <ProfileDropdown user={user} onSignOut={onSignOut} />
        </div>
      </div>
    </header>
  );
}
