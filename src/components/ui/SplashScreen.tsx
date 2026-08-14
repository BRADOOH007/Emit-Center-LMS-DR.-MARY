'use client';

import { useEffect, useState } from 'react';
import { LogoMark } from '@/components/ui/LogoMark';

// Longer than the logo-bounce period (~2.2s), so the logo bounce is clearly
// visible before the splash fades, while still never blocking the UI forever.
const SAFETY_TIMEOUT_MS = 6000;

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
      className={`fixed inset-0 z-[90] flex animate-fade-in flex-col items-center justify-center bg-base transition-opacity duration-[400ms] ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <LogoMark size={88} />
    </div>
  );
}