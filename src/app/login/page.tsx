'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();
      if (json.success) {
        router.push('/dashboard');
      } else {
        setError(json.error ?? 'Invalid email or password');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
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
            EMIT Center
          </h1>
          <p className="mt-1 text-sm text-text-muted">Learning Portal — Sign in to your account</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="panel space-y-5"
        >
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="label mb-0">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" variant="gold" size="lg" fullWidth disabled={loading}>
            {loading ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn aria-hidden="true" className="h-4 w-4" />
                Sign in
              </>
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-text-muted">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400">
                Create one
              </Link>
            </p>
          </div>
        </form>

        <p className="text-center text-xs text-text-muted">
          Need help?{' '}
          <Link
            href="https://www.emitcenter.com/contact-us"
            className="inline-flex items-center gap-1 font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400"
          >
            Contact support
            <ArrowRight aria-hidden="true" className="h-3 w-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}
