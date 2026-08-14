'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, MailX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/ui/LogoMark';

function VerifyEmailFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const json = await res.json();
        if (!cancelled) {
          if (json.success) {
            setStatus('success');
          } else {
            setStatus('error');
            setMessage(json.error ?? 'Unable to verify email.');
          }
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage('Network error. Please try again.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="panel flex items-center justify-center py-10">
        <LogoMark size={56} showLabel={false} />
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="panel space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
          <BadgeCheck aria-hidden="true" className="h-6 w-6" />
        </div>
        <h2 className="font-display text-lg font-bold text-text-primary">Email verified</h2>
        <p className="text-sm text-text-muted">
          Your email has been confirmed. You can now sign in to your dashboard.
        </p>
        <Button variant="gold" size="lg" fullWidth onClick={() => router.push('/login')}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="panel space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
        <MailX aria-hidden="true" className="h-6 w-6" />
      </div>
      <h2 className="font-display text-lg font-bold text-text-primary">Verification failed</h2>
      <p className="text-sm text-text-muted">{message}</p>
      <Button variant="gold" size="lg" fullWidth onClick={() => router.push('/login')}>
        Go to sign in
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-base-surface shadow-card">
            <Image
              src="/brand/emit-logo.png"
              alt="EMIT Center"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
            Email verification
          </h1>
          <p className="mt-1 text-sm text-text-muted">Confirming your account</p>
        </div>

        <Suspense fallback={null}>
          <VerifyEmailFlow />
        </Suspense>

        <p className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400"
          >
            <ArrowLeft aria-hidden="true" className="h-3 w-3" />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
