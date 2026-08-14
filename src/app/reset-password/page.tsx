'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/ui/LogoMark';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError('This reset link is invalid. Please request a new one.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (json.success) {
        setDone(true);
      } else {
        setError(json.error ?? 'Unable to reset password. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="panel space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
          <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
        </div>
        <p className="text-sm text-text-primary">
          Your password has been reset. You can now sign in with your new password.
        </p>
        <Button variant="gold" size="lg" fullWidth onClick={() => router.push('/login')}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="panel space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="password" className="label">
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="input !py-2.5 !pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-text-muted hover:text-text-primary"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Eye aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-text-muted">
          Must be at least 8 characters with uppercase, lowercase, and a number.
        </p>
      </div>

      {!token && (
        <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
          Missing reset token. Use the link from your email or request a new one.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <Button type="submit" variant="gold" size="lg" fullWidth disabled={loading || !token}>
        {loading ? (
          <>
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Resetting...
          </>
        ) : (
          <>
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            Set new password
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
  );
}

export default function ResetPasswordPage() {
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
            Set a new password
          </h1>
          <p className="mt-1 text-sm text-text-muted">Choose a strong, unique password</p>
        </div>

        <Suspense
          fallback={
            <div className="panel flex items-center justify-center py-10">
              <LogoMark size={56} showLabel={false} />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
