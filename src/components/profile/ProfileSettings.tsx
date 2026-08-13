'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Camera, Check, Loader2, Trash2 } from 'lucide-react';
import type { User, SupportedLocale, SupportedTimeZone, SupportedCurrency } from '@/types';
import { ROLE_META } from '@/config/roles';
import { CURRENCIES, LOCALE_OPTIONS, TIME_ZONES } from '@/lib/i18n/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';

const ROLE_BADGE_VARIANT: Record<User['activeRole'], 'gold' | 'brown' | 'neutral' | 'success'> = {
  super_admin: 'gold',
  administrator: 'brown',
  instructor: 'neutral',
  student: 'success',
  parent: 'neutral',
};

function downscaleImage(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export function ProfileSettings({ user }: { user: User }) {
  const [name, setName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [locale, setLocale] = useState<SupportedLocale>(user.locale);
  const [timeZone, setTimeZone] = useState<SupportedTimeZone>(user.timeZone);
  const [currency, setCurrency] = useState<SupportedCurrency>(user.currency);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user.avatarUrl);
  const [avatarDraft, setAvatarDraft] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dirty =
    name !== user.fullName ||
    phone !== (user.phone ?? '') ||
    locale !== user.locale ||
    timeZone !== user.timeZone ||
    currency !== user.currency ||
    avatarDraft !== undefined;

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await downscaleImage(file);
      setAvatarDraft(dataUrl);
      setError('');
    } catch {
      setError('Could not read that image. Please try another file.');
    }
  };

  const clearDraft = () => {
    setAvatarDraft(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name,
          phone,
          ...(avatarDraft !== undefined ? { avatarUrl: avatarDraft } : {}),
          locale,
          timeZone,
          currency,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Failed to save changes');
        return;
      }
      setAvatarUrl(avatarDraft ?? user.avatarUrl);
      setAvatarDraft(undefined);
      setSaved(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const previewSrc = avatarDraft ?? avatarUrl ?? user.avatarUrl;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="panel p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <UserAvatar name={name} src={previewSrc} size="lg" online />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change profile picture"
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 text-white shadow-card transition-colors hover:bg-gold-600"
              >
                <Camera aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={handleAvatarChange}
            />

            {avatarDraft !== undefined && (
              <div className="mt-3 flex items-center gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={clearDraft}>
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  Revert
                </Button>
                {error && <span className="text-xs font-medium text-red-600 dark:text-red-400">{error}</span>}
              </div>
            )}

            <h2 className="font-display mt-4 text-lg font-semibold text-text-primary">{name}</h2>
            <p className="text-sm text-text-muted">{user.email}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {user.roles.map((role) => (
                <Badge key={role} variant={ROLE_BADGE_VARIANT[role]}>
                  {ROLE_META[role].label}
                </Badge>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="panel p-6">
          <h2 className="font-display text-base font-semibold text-text-primary">Account details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Your full name"
              />
            </label>
            <label className="block">
              <span className="label">Phone (optional)</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="+1 555 000 0000"
              />
            </label>
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="font-display text-base font-semibold text-text-primary">Preferences</h2>
          <p className="mt-1 text-sm text-text-muted">Saved to your account and applied across the portal.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="label">Language</span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as SupportedLocale)}
                className="input"
              >
                {Array.from(new Set(LOCALE_OPTIONS.map((o) => o.locale))).map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Time zone</span>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value as SupportedTimeZone)}
                className="input"
              >
                {TIME_ZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                className="input"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="flex items-center gap-3">
          <Button type="button" variant="gold" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </Button>
          {saved && (
            <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400')}>
              <Check aria-hidden="true" className="h-4 w-4" />
              Saved
            </span>
          )}
          {error && <span className="text-sm font-medium text-red-600 dark:text-red-400">{error}</span>}
        </section>
      </div>
    </div>
  );
}