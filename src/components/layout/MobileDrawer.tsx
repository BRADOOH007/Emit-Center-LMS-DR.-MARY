'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { LogOut, X } from 'lucide-react';
import type { Role, User } from '@/types';
import { MAIN_NAV, SIDEBAR_NAV } from '@/config/nav';
import { ROLE_META } from '@/config/roles';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { UserAvatar } from '@/components/ui/UserAvatar';

export function MobileDrawer({
  open,
  role,
  user,
  onClose,
  onSignOut,
}: {
  open: boolean;
  role: Role;
  user: User;
  onClose: () => void;
  onSignOut?: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sections = SIDEBAR_NAV[role];

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Primary navigation"
        className="absolute inset-y-0 left-0 flex w-[19rem] max-w-[85vw] animate-drawer-in flex-col bg-base-elevated shadow-pop"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/emit-logo.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <div>
              <p className="font-display text-sm font-semibold leading-tight text-text-primary">EMIT Center</p>
              <p className="text-[11px] font-medium uppercase tracking-widest text-gold-600 dark:text-gold-400">
                Learning Portal
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="btn btn-ghost btn-sm"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-6">
          <div className="flex items-center gap-3 border-b border-line px-1 py-4">
            <UserAvatar name={user.name} src={user.avatarUrl} size="md" online />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">{user.name}</p>
              <Badge variant={user.activeRole === 'student' ? 'success' : 'gold'} className="mt-0.5">
                {ROLE_META[role].label}
              </Badge>
            </div>
          </div>

          <p className="nav-section">Portal</p>
          <ul className="space-y-0.5">
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={onClose} className="nav-link">
                  {item.icon && <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />}
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {sections.map((section) => (
            <div key={section.title}>
              <p className="nav-section">{section.title}</p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} onClick={onClose} className="nav-link">
                      {item.icon && <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />}
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={onSignOut}
            className="btn btn-outline btn-md w-full"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export function isActivePath(href: string, pathname: string, exact = false): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({
  href,
  pathname,
  exact,
  className,
  children,
  onNavigate,
}: {
  href: string;
  pathname: string;
  exact?: boolean;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const active = isActivePath(href, pathname, exact);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn('nav-link', active && 'nav-link-active', className)}
    >
      {children}
    </Link>
  );
}
