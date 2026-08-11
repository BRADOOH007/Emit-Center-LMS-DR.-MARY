'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Role } from '@/types';
import { SIDEBAR_NAV } from '@/config/nav';
import { cn } from '@/lib/utils';

export function Sidebar({
  role,
  collapsed,
  onToggleCollapse,
}: {
  role: Role;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const sections = SIDEBAR_NAV[role];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      className={cn(
        'scrollbar-thin sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col overflow-y-auto border-r border-line bg-base-surface px-3 py-4 transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
      aria-label="Dashboard navigation"
    >
      <nav className="flex-1">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && <p className="nav-section">{section.title}</p>}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, item.exact);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn('nav-link', active && 'nav-link-active', collapsed && 'justify-center px-0')}
                    >
                      {Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />}
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && <span className="badge badge-gold px-2 py-0.5">{item.badge}</span>}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn('mt-4 border-t border-line pt-4', collapsed && 'flex justify-center border-t-0 pt-2')}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="btn btn-ghost btn-md"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronsRight aria-hidden="true" className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
