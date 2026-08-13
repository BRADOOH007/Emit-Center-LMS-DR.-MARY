'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, MailCheck, MailQuestion } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setStatus('sent');
        if (json.data?.resetUrl) setResetUrl(json.data.resetUrl);
      } else {
        setStatus('error');
        setError(json.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  };

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
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Enter your account email and we&apos;ll send you a reset link
          </p>
        </div>

        {status === 'sent' ? (
          <div className="panel space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
              <MailCheck aria-hidden="true" className="h-6 w-6" />
            </div>
            <p className="text-sm text-text-primary">
              If an account exists for <span className="font-medium">{email}</span>, a password reset
              link has been sent.
            </p>
            {resetUrl && (
              <div className="rounded-lg border border-line bg-base-50 px-3 py-2 text-xs text-text-muted break-all">
                <span className="block font-medium text-text-primary">Development reset link</span>
                <a href={resetUrl} className="text-gold-600 hover:text-gold-700 dark:text-gold-400">
                  {resetUrl}
                </a>
              </div>
            )}
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400"
            >
              <ArrowLeft aria-hidden="true" className="h-3 w-3" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="panel space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@emitcenter.com"
                className="input !py-2.5"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" variant="gold" size="lg" fullWidth disabled={status === 'loading'}>
              {status === 'loading' ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                <>
                  <MailQuestion aria-hidden="true" className="h-4 w-4" />
                  Send reset link
                </>
              )}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-xs font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400"
              >
                <ArrowLeft aria-hidden="true" className="h-3 w-3" />
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
