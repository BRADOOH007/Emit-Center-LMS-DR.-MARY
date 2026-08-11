'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Globe, HardDrive, Palette, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel } from '@/components/dashboard/primitives';
import { useTheme } from '@/components/providers/AppProviders';

const STORAGE_KEY = 'emit-platform-settings';

const DEFAULT_FORM = {
  platformName: 'EMIT Center LMS',
  supportEmail: 'support@emitcenter.com',
  baseCurrency: 'usd',
  defaultTimezone: 'America/New_York',
  maintenanceMode: 'off',
  emailNotifications: 'yes',
  paymentGateway: 'stripe',
};

const DEFAULT_EMAIL_TOGGLES = {
  enrollmentReceipts: true,
  paymentReceipts: true,
  classReminders: true,
  gradePublished: true,
  weeklyDigest: false,
};

export function AdminSettings() {
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [emailToggles, setEmailToggles] = useState(DEFAULT_EMAIL_TOGGLES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as { form?: typeof DEFAULT_FORM; emailToggles?: typeof DEFAULT_EMAIL_TOGGLES };
        if (stored.form) setForm({ ...DEFAULT_FORM, ...stored.form });
        if (stored.emailToggles) setEmailToggles({ ...DEFAULT_EMAIL_TOGGLES, ...stored.emailToggles });
      }
    } catch {
      /* ignore corrupted storage */
    }
    setHydrated(true);
  }, []);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, emailToggles }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const toggleToggles = useMemo(() => emailToggles, [emailToggles]);

  const toggle = (key: keyof typeof emailToggles) =>
    setEmailToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (hydrated && form.maintenanceMode === 'on') {
      document.documentElement.style.setProperty('--emit-maintenance', 'on');
    } else if (hydrated) {
      document.documentElement.style.removeProperty('--emit-maintenance');
    }
  }, [form.maintenanceMode, hydrated]);

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin · Settings"
        title="Platform Settings"
        subtitle="Branding, locale, email preferences, maintenance mode and payment gateway configuration."
        actions={<Button onClick={handleSave}><Save className="h-4 w-4" /> Save Changes</Button>}
      />

      {saved && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Settings saved successfully.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionPanel title="General" icon={HardDrive}>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="platformName">Platform name</label>
              <input id="platformName" className="input" value={form.platformName} onChange={(e) => update('platformName', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="supportEmail">Support email</label>
              <input id="supportEmail" type="email" className="input" value={form.supportEmail} onChange={(e) => update('supportEmail', e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="baseCurrency">Base currency</label>
                <select id="baseCurrency" className="input" value={form.baseCurrency} onChange={(e) => update('baseCurrency', e.target.value)}>
                  <option value="usd">USD — US Dollar</option>
                  <option value="gbp">GBP — British Pound</option>
                  <option value="eur">EUR — Euro</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="defaultTimezone">Default timezone</label>
                <select id="defaultTimezone" className="input" value={form.defaultTimezone} onChange={(e) => update('defaultTimezone', e.target.value)}>
                  <option value="America/New_York">New York (GMT-5)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Berlin">Berlin (GMT+1)</option>
                  <option value="Europe/Paris">Paris (GMT+1)</option>
                </select>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Appearance" icon={Palette}>
          <p className="mb-3 text-sm text-text-muted">Select the default theme enforced across the portal.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['light', 'dark'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  theme === mode
                    ? 'border-gold-600 bg-gold-500/10 text-gold-700 dark:text-gold-300'
                    : 'border-line text-text-primary hover:bg-line-soft'
                }`}
              >
                {mode === 'light' ? 'Light mode' : 'Dark mode'}
                {theme === mode && <span aria-hidden="true" className="text-gold-600">●</span>}
              </button>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel title="Email Notifications" icon={Bell}>
          <div className="space-y-3">
            {(Object.keys(toggleToggles) as (keyof typeof emailToggles)[]).map((key) => (
              <label key={key} className="flex cursor-pointer items-center justify-between rounded-lg border border-line px-3 py-2.5 text-sm">
                <span className="text-text-primary capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span
                  role="switch"
                  aria-checked={emailToggles[key]}
                  onClick={() => toggle(key)}
                  className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
                  style={{ backgroundColor: emailToggles[key] ? 'rgb(var(--gold-500))' : undefined }}
                >
                  <span
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                    style={emailToggles[key] ? { transform: 'translateX(1rem)' } : { transform: 'translateX(0.125rem)' }}
                  />
                </span>
              </label>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel title="Subscription Defaults" icon={Globe}>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="paymentGateway">Payment gateway</label>
              <select id="paymentGateway" className="input" value={form.paymentGateway} onChange={(e) => update('paymentGateway', e.target.value)}>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="manual">Manual (offline)</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="maintenanceMode">Maintenance mode</label>
              <select id="maintenanceMode" className="input" value={form.maintenanceMode} onChange={(e) => update('maintenanceMode', e.target.value)}>
                <option value="off">Off — portal online</option>
                <option value="readonly">Read-only</option>
                <option value="on">On — full maintenance</option>
              </select>
            </div>
            <div className="rounded-lg border border-gold-500/25 bg-gold-500/5 px-3 py-2.5 text-xs text-text-muted">
              <span className="flex items-center gap-1.5 font-medium text-gold-700 dark:text-gold-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Default gateway
              </span>
              New enrollments will be billed through Stripe Checkout.
            </div>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}