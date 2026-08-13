'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-base px-4">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
              <AlertTriangle aria-hidden="true" className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-text-primary">Something went wrong</h1>
            <p className="mt-2 text-sm text-text-muted">
              An unexpected error occurred. Please try again — if the problem persists, contact EMIT Center support.
            </p>
            <button type="button" onClick={reset} className="btn btn-gold btn-md mt-6">
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
