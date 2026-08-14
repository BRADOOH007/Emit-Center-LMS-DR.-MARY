'use client';

import { useEffect, useState } from 'react';

const SAFETY_TIMEOUT_MS = 4000;

export function SplashScreen() {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Safety net: never allow the splash to block the UI indefinitely.
    const timer = setTimeout(() => setFading(true), SAFETY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={`fixed inset-0 z-[90] flex animate-fade-in flex-col items-center justify-center gap-5 bg-base transition-opacity duration-300 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/roundlogo%20emit.png"
        alt="EMIT Center"
        width={88}
        height={88}
        className="animate-logo-bounce rounded-full drop-shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
      />
      <div className="flex flex-col items-center gap-1.5">
        <span className="font-display text-base font-semibold tracking-tight text-text-primary">EMIT Center</span>
        <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-600 dark:text-gold-400">
          Loading
          <span className="ml-1 inline-flex items-center gap-[3px]" aria-hidden="true">
            <span className="h-[3px] w-[3px] animate-pulse rounded-full bg-current" style={{ animationDelay: '0ms' }} />
            <span className="h-[3px] w-[3px] animate-pulse rounded-full bg-current" style={{ animationDelay: '150ms' }} />
            <span className="h-[3px] w-[3px] animate-pulse rounded-full bg-current" style={{ animationDelay: '300ms' }} />
          </span>
        </span>
      </div>
    </div>
  );
}
