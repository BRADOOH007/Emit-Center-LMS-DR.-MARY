'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@/types';
import { AppProviders } from '@/components/providers/AppProviders';
import { AITutorProvider } from '@/components/ai/ai-tutor-provider';
import { ReturnToPortalBar } from '@/components/layout/ReturnToPortalBar';
import { HeaderNav } from '@/components/layout/HeaderNav';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { Sidebar } from '@/components/layout/Sidebar';

const SIDEBAR_STORAGE_KEY = 'emit-sidebar-collapsed';

export function AppLayout({ user, children }: { user: User; children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === '1') {
      setSidebarCollapsed(true);
    }
  }, []);

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleOpenDrawer = useCallback(() => setMobileDrawerOpen(true), []);

  const handleCloseDrawer = useCallback(() => setMobileDrawerOpen(false), []);

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const handleSignOut = useCallback(() => {
    window.location.assign('/api/auth/signout');
  }, []);

  return (
    <AppProviders user={user}>
      <AITutorProvider>
        <div className="min-h-screen bg-base">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>

          <ReturnToPortalBar />

          <HeaderNav onOpenDrawer={handleOpenDrawer} onSignOut={handleSignOut} />

          <MobileDrawer
            open={mobileDrawerOpen}
            role={user.activeRole}
            user={user}
            onClose={handleCloseDrawer}
            onSignOut={handleSignOut}
          />

          <div className="flex">
            <Sidebar
              role={user.activeRole}
              collapsed={sidebarCollapsed}
              onToggleCollapse={handleToggleCollapse}
            />

            <main id="main-content" className="min-w-0 flex-1 overflow-x-hidden">
              <div className="mx-auto max-w-[1400px] p-4 md:p-6 lg:p-8">{children}</div>
            </main>
          </div>
        </div>
      </AITutorProvider>
    </AppProviders>
  );
}
