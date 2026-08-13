'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertTriangle aria-hidden="true" className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="font-display text-2xl font-bold text-text-primary">This page hit a snag</h1>
        <p className="mt-2 text-sm text-text-muted">
          Something went wrong while loading this page. Please try again.
        </p>
        <button type="button" onClick={reset} className="btn btn-gold btn-md mt-6">
          Try again
        </button>
      </div>
    </div>
  );
}
