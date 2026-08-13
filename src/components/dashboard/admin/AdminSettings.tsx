'use client';

import { useEffect, useState } from 'react';
import { Bell, CreditCard, Globe, HardDrive, Loader2, Palette, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel } from '@/components/dashboard/primitives';
import { useTheme } from '@/components/providers/AppProviders';
import type { PaymentConfig } from '@/lib/payment-config';

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

const EMPTY_PAYMENT: PaymentConfig = {
  stripePublishableKey: '',
  stripeSecretKeyConfigured: false,
  baseCurrency: 'USD',
  demoMode: true,
  promoCodes: {},
};

export function AdminSettings() {
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState(DEFAULT_FORM);
  const [emailToggles, setEmailToggles] = useState(DEFAULT_EMAIL_TOGGLES);
  const [payment, setPayment] = useState<PaymentConfig>(EMPTY_PAYMENT);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newPromo, setNewPromo] = useState({ code: '', discountPercent: 20, maxUses: 10 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' });
        const json = await res.json();
        if (json.success) {
          setPayment({
            ...EMPTY_PAYMENT,
            ...json.data,
          });
        }
      } catch {
        setError('Failed to load payment settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: keyof typeof emailToggles) =>
    setEmailToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const addPromo = () => {
    if (!newPromo.code.trim()) return;
    setPayment((prev) => ({
      ...prev,
      promoCodes: {
        ...prev.promoCodes,
        [newPromo.code.toUpperCase().trim()]: { discountPercent: newPromo.discountPercent, maxUses: newPromo.maxUses },
      },
    }));
    setNewPromo({ code: '', discountPercent: 20, maxUses: 10 });
  };

  const removePromo = (code: string) => {
    setPayment((prev) => {
      const next = { ...prev.promoCodes };
      delete next[code];
      return { ...prev, promoCodes: next };
    });
  };

  const handleSave = async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripePublishableKey: payment.stripePublishableKey,
          stripeSecretKey: newSecretKey,
          baseCurrency: payment.baseCurrency,
          demoMode: payment.demoMode,
          promoCodes: payment.promoCodes,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? 'Failed to save settings.');
        return;
      }
      setPayment({ ...json.data, stripeSecretKeyConfigured: json.data.stripeSecretKeyConfigured || Boolean(newSecretKey) });
      setNewSecretKey('');
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Network error while saving settings.');
    }
  };

  useEffect(() => {
    if (form.maintenanceMode === 'on') {
      document.documentElement.style.setProperty('--emit-maintenance', 'on');
    } else {
      document.documentElement.style.removeProperty('--emit-maintenance');
    }
  }, [form.maintenanceMode]);

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin · Settings"
        title="Platform Settings"
        subtitle="Branding, locale, email preferences, maintenance mode and payment gateway configuration."
        actions={
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
          </Button>
        }
      />

      {saved && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Settings saved successfully.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
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

        <SectionPanel title="Payments & Stripe" icon={CreditCard}>
          <div className="space-y-4">
            <div className="rounded-lg border border-gold-500/25 bg-gold-500/5 px-3 py-2.5 text-xs text-text-muted">
              <span className="flex items-center gap-1.5 font-medium text-gold-700 dark:text-gold-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Configured by administrator / super admin
              </span>
              Stripe keys are used only on the server. The secret key is never returned to the browser.
            </div>

            <div>
              <label className="label" htmlFor="stripePublishableKey">Stripe publishable key (pk_...)</label>
              <input
                id="stripePublishableKey"
                className="input font-mono text-xs"
                placeholder="pk_test_..."
                value={payment.stripePublishableKey}
                onChange={(e) => setPayment((prev) => ({ ...prev, stripePublishableKey: e.target.value }))}
              />
            </div>

            <div>
              <label className="label" htmlFor="stripeSecretKey">Stripe secret key (sk_test_...)</label>
              <input
                id="stripeSecretKey"
                type="password"
                className="input font-mono text-xs"
                placeholder={payment.stripeSecretKeyConfigured ? '•••••••••••• (configured — leave blank to keep)' : 'sk_test_...'}
                value={newSecretKey}
                onChange={(e) => setNewSecretKey(e.target.value)}
              />
              <p className="mt-1 text-xs text-text-muted">
                {payment.stripeSecretKeyConfigured ? 'A secret key is currently configured.' : 'No secret key configured — demo mode is active.'}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="paymentCurrency">Checkout currency</label>
                <select
                  id="paymentCurrency"
                  className="input"
                  value={payment.baseCurrency}
                  onChange={(e) => setPayment((prev) => ({ ...prev, baseCurrency: e.target.value }))}
                >
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="demoMode">Payment mode</label>
                <select
                  id="demoMode"
                  className="input"
                  value={payment.demoMode ? 'demo' : 'live'}
                  onChange={(e) => setPayment((prev) => ({ ...prev, demoMode: e.target.value === 'demo' }))}
                >
                  <option value="demo">Demo (sandbox, no charge)</option>
                  <option value="live">Live (real Stripe charges)</option>
                </select>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Promo Codes" icon={Globe}>
          <div className="space-y-3">
            {Object.entries(payment.promoCodes ?? {}).map(([code, promo]) => (
              <div key={code} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <div>
                  <span className="font-mono font-semibold text-text-primary">{code}</span>
                  <span className="ml-2 text-xs text-text-muted">
                    {promo.discountPercent}% off · {promo.maxUses} max uses
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removePromo(code)}
                  className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Remove
                </button>
              </div>
            ))}

            <div className="space-y-2 rounded-lg border border-line bg-line-soft/40 p-3">
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="input font-mono text-xs"
                  placeholder="CODE"
                  value={newPromo.code}
                  onChange={(e) => setNewPromo((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                />
                <input
                  className="input text-xs"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="% off"
                  value={newPromo.discountPercent}
                  onChange={(e) => setNewPromo((prev) => ({ ...prev, discountPercent: Number(e.target.value) }))}
                />
                <input
                  className="input text-xs"
                  type="number"
                  min={1}
                  placeholder="Max uses"
                  value={newPromo.maxUses}
                  onChange={(e) => setNewPromo((prev) => ({ ...prev, maxUses: Number(e.target.value) }))}
                />
              </div>
              <Button variant="outline" size="sm" onClick={addPromo}>
                Add promo code
              </Button>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Email Notifications" icon={Bell}>
          <div className="space-y-3">
            {(Object.keys(emailToggles) as (keyof typeof emailToggles)[]).map((key) => (
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
              New enrollments will be billed through the configured Stripe account.
            </div>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
