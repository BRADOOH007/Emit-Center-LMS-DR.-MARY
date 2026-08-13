'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, Moon, Sparkles, Sun } from 'lucide-react';
import { useSession, useTheme } from '@/components/providers/AppProviders';
import { ProfileDropdown } from '@/components/layout/ProfileDropdown';
import { useAITutor } from '@/components/ai/ai-tutor-provider';

export function HeaderNav({ onOpenDrawer, onSignOut }: { onOpenDrawer: () => void; onSignOut?: () => void }) {
  const { user } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { openAITutor } = useAITutor();

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

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => openAITutor()}
            aria-label="Open Emit Tutor Bot"
            title="Emit Tutor Bot"
            className="btn btn-gold btn-md !px-3"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            <span className="hidden md:inline">Emit Tutor</span>
          </button>
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
