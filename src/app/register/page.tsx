'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Eye, EyeOff, Loader2, MailCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent / Guardian' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'US Eastern (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PST/PDT)' },
  { value: 'Europe/London', label: 'UK (GMT/BST)' },
  { value: 'Europe/Paris', label: 'EU Central (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'EU Central (CET/CEST)' },
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [timeZone, setTimeZone] = useState('America/New_York');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState('');

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          role,
          timeZone,
          locale: 'en-US',
          currency: 'USD',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        if (json.data?.verifyUrl) setVerifyUrl(json.data.verifyUrl);
      } else {
        setError(json.error ?? 'Registration failed. Please try again.');
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
            Create your account
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Join EMIT Center Learning Portal
          </p>
        </div>

        <form onSubmit={handleRegister} className="panel space-y-5">
          {success && (
            <div className="space-y-4 rounded-xl bg-green-500/10 p-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-600 dark:text-green-400">
                <MailCheck aria-hidden="true" className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-text-primary">Account created successfully</p>
              <p className="text-xs text-text-muted">
                Please verify your email to activate your account.
              </p>
              {verifyUrl && (
                <a
                  href={verifyUrl}
                  className="block break-all rounded-lg border border-line bg-base-50 px-3 py-2 text-xs font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400"
                >
                  {verifyUrl}
                </a>
              )}
              <Link
                href="/login"
                className="mt-1 inline-flex items-center justify-center gap-1 text-xs font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400"
              >
                Go to sign in
                <ArrowRight aria-hidden="true" className="h-3 w-3" />
              </Link>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="fullName" className="label">Full name</label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="input !py-2.5"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="label">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input !py-2.5"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="label">Password</label>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="role" className="label">Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input !py-2.5"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="timezone" className="label">Time zone</label>
              <select
                id="timezone"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="input !py-2.5"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {!success && (
            <Button type="submit" variant="gold" size="lg" fullWidth disabled={loading}>
              {loading ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus aria-hidden="true" className="h-4 w-4" />
                  Create Account
                </>
              )}
            </Button>
          )}

          <div className="text-center">
            <p className="text-xs text-text-muted">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400">
                Sign in
              </Link>
            </p>
          </div>
        </form>

        <p className="text-center text-xs text-text-muted">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link href="/privacy" className="font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
