'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, CreditCard, Download, Globe, HardDrive, Loader2, Mail, Palette, Plug, RotateCcw, Save, ShieldCheck, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel } from '@/components/dashboard/primitives';
import { useSession, useTheme } from '@/components/providers/AppProviders';
import { useToast } from '@/components/ui/toast';
import type { PaymentConfig } from '@/lib/payment-config';

interface DeliveryConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpFrom: string;
  smtpConfigured: boolean;
  resendApiKey: string;
  sendgridApiKey: string;
  twilioAccountSid: string;
  twilioFrom: string;
  twilioConfigured: boolean;
}

interface IntegrationConfig {
  googleWorkspaceEnabled: boolean;
  googleClientId: string;
  microsoftEnabled: boolean;
  microsoftClientId: string;
  microsoftTenantId: string;
  ssoEnabled: boolean;
  ssoProvider: string;
  ssoIssuerUrl: string;
  zoomEnabled: boolean;
  zoomClientId: string;
}

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
  const { user } = useSession();
  const toast = useToast();
  const isSuperAdmin = user.roles.includes('super_admin');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState(DEFAULT_FORM);
  const [emailToggles, setEmailToggles] = useState(DEFAULT_EMAIL_TOGGLES);
  const [payment, setPayment] = useState<PaymentConfig>(EMPTY_PAYMENT);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newPromo, setNewPromo] = useState({ code: '', discountPercent: 20, maxUses: 10 });
  const [loading, setLoading] = useState(true);

  const [delivery, setDelivery] = useState<DeliveryConfig>({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpFrom: '',
    smtpConfigured: false,
    resendApiKey: '',
    sendgridApiKey: '',
    twilioAccountSid: '',
    twilioFrom: '',
    twilioConfigured: false,
  });
  const [deliverySaved, setDeliverySaved] = useState(false);
  const [deliverySaving, setDeliverySaving] = useState(false);

  const [integrations, setIntegrations] = useState<IntegrationConfig>({
    googleWorkspaceEnabled: false,
    googleClientId: '',
    microsoftEnabled: false,
    microsoftClientId: '',
    microsoftTenantId: 'common',
    ssoEnabled: false,
    ssoProvider: 'oidc',
    ssoIssuerUrl: '',
    zoomEnabled: false,
    zoomClientId: '',
  });
  const [integrationsSaved, setIntegrationsSaved] = useState(false);
  const [integrationsSaving, setIntegrationsSaving] = useState(false);

  const [sisMsg, setSisMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [sisImporting, setSisImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleResetFigures = async () => {
    if (resetConfirm !== 'RESET') return;
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Failed to reset figures', json.error);
        return;
      }
      toast.success('Platform figures reset', 'Enrollments, revenue, grades, attendance and certificates were cleared.');
      setResetConfirm('');
    } catch {
      toast.error('Network error', 'Please try again.');
    } finally {
      setResetting(false);
    }
  };

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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/delivery-settings', { cache: 'no-store' });
        const json = await res.json();
        if (json.success && json.data) {
          setDelivery((prev) => ({ ...prev, ...json.data }));
        }
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  const saveDelivery = async () => {
    setDeliverySaving(true);
    try {
      const res = await fetch('/api/admin/delivery-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(delivery),
      });
      const json = await res.json();
      if (json.success) {
        setDeliverySaved(true);
        window.setTimeout(() => setDeliverySaved(false), 2000);
      } else {
        setError(json.error ?? 'Failed to save delivery settings.');
      }
    } catch {
      setError('Network error while saving delivery settings.');
    } finally {
      setDeliverySaving(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/integrations', { cache: 'no-store' });
        const json = await res.json();
        if (json.success && json.data) {
          setIntegrations((prev) => ({ ...prev, ...json.data }));
        }
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  const saveIntegrations = async () => {
    setIntegrationsSaving(true);
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(integrations),
      });
      const json = await res.json();
      if (json.success) {
        setIntegrationsSaved(true);
        window.setTimeout(() => setIntegrationsSaved(false), 2000);
      } else {
        setError(json.error ?? 'Failed to save integrations.');
      }
    } catch {
      setError('Network error while saving integrations.');
    } finally {
      setIntegrationsSaving(false);
    }
  };

  const exportSis = () => {
    window.location.href = '/api/admin/sis?role=student';
  };

  const importSis = async (file: File) => {
    setSisImporting(true);
    setSisMsg(null);
    try {
      const text = await file.text();
      const res = await fetch('/api/admin/sis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text, role: 'student' }),
      });
      const json = await res.json();
      if (json.success) {
        setSisMsg({ tone: 'success', text: `Imported ${json.data.created} student(s), skipped ${json.data.skipped}.` });
      } else {
        setSisMsg({ tone: 'error', text: json.error ?? 'Import failed.' });
      }
    } catch {
      setSisMsg({ tone: 'error', text: 'Failed to read CSV file.' });
    } finally {
      setSisImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

        <SectionPanel title="Email & SMS Delivery" icon={Mail}>
          <div className="space-y-4">
            <div className="rounded-lg border border-gold-500/25 bg-gold-500/5 px-3 py-2.5 text-xs text-text-muted">
              <span className="flex items-center gap-1.5 font-medium text-gold-700 dark:text-gold-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Provider credentials
              </span>
              Configure SMTP, Resend, SendGrid (email) or Twilio (SMS). If no provider is configured, deliveries are logged for demo mode.
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="smtpHost">SMTP host</label>
                <input id="smtpHost" className="input font-mono text-xs" placeholder="smtp.example.com" value={delivery.smtpHost} onChange={(e) => setDelivery((p) => ({ ...p, smtpHost: e.target.value }))} />
              </div>
              <div>
                <label className="label" htmlFor="smtpPort">SMTP port</label>
                <input id="smtpPort" type="number" className="input" value={delivery.smtpPort} onChange={(e) => setDelivery((p) => ({ ...p, smtpPort: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label" htmlFor="smtpUser">SMTP username</label>
                <input id="smtpUser" className="input" value={delivery.smtpUser} onChange={(e) => setDelivery((p) => ({ ...p, smtpUser: e.target.value }))} />
              </div>
              <div>
                <label className="label" htmlFor="smtpFrom">From address</label>
                <input id="smtpFrom" className="input" value={delivery.smtpFrom} onChange={(e) => setDelivery((p) => ({ ...p, smtpFrom: e.target.value }))} placeholder="no-reply@emitcenter.com" />
              </div>
              <div>
                <label className="label" htmlFor="resendKey">Resend API key</label>
                <input id="resendKey" type="password" className="input font-mono text-xs" value={delivery.resendApiKey} onChange={(e) => setDelivery((p) => ({ ...p, resendApiKey: e.target.value }))} placeholder="re_..." />
              </div>
              <div>
                <label className="label" htmlFor="sendgridKey">SendGrid API key</label>
                <input id="sendgridKey" type="password" className="input font-mono text-xs" value={delivery.sendgridApiKey} onChange={(e) => setDelivery((p) => ({ ...p, sendgridApiKey: e.target.value }))} placeholder="SG.xxx" />
              </div>
              <div>
                <label className="label" htmlFor="twilioSid">Twilio Account SID</label>
                <input id="twilioSid" className="input font-mono text-xs" value={delivery.twilioAccountSid} onChange={(e) => setDelivery((p) => ({ ...p, twilioAccountSid: e.target.value }))} placeholder="AC..." />
              </div>
              <div>
                <label className="label" htmlFor="twilioFrom">Twilio from number</label>
                <input id="twilioFrom" className="input font-mono text-xs" value={delivery.twilioFrom} onChange={(e) => setDelivery((p) => ({ ...p, twilioFrom: e.target.value }))} placeholder="+15551234567" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="gold" size="sm" onClick={saveDelivery} disabled={deliverySaving}>
                {deliverySaving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
                Save Delivery Settings
              </Button>
              {deliverySaved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</span>}
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Integrations & SSO" icon={Plug}>
          <div className="space-y-4">
            <div className="space-y-3">
              <IntegrationToggle label="Google Workspace" checked={integrations.googleWorkspaceEnabled} onChange={(v) => setIntegrations((p) => ({ ...p, googleWorkspaceEnabled: v }))} />
              {integrations.googleWorkspaceEnabled && (
                <input className="input font-mono text-xs" placeholder="Google OAuth Client ID" value={integrations.googleClientId} onChange={(e) => setIntegrations((p) => ({ ...p, googleClientId: e.target.value }))} />
              )}
              <IntegrationToggle label="Microsoft 365" checked={integrations.microsoftEnabled} onChange={(v) => setIntegrations((p) => ({ ...p, microsoftEnabled: v }))} />
              {integrations.microsoftEnabled && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="input font-mono text-xs" placeholder="Microsoft Client ID" value={integrations.microsoftClientId} onChange={(e) => setIntegrations((p) => ({ ...p, microsoftClientId: e.target.value }))} />
                  <input className="input font-mono text-xs" placeholder="Tenant ID (or 'common')" value={integrations.microsoftTenantId} onChange={(e) => setIntegrations((p) => ({ ...p, microsoftTenantId: e.target.value }))} />
                </div>
              )}
              <IntegrationToggle label="Single Sign-On (SSO / OIDC)" checked={integrations.ssoEnabled} onChange={(v) => setIntegrations((p) => ({ ...p, ssoEnabled: v }))} />
              {integrations.ssoEnabled && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="input font-mono text-xs" placeholder="Issuer URL" value={integrations.ssoIssuerUrl} onChange={(e) => setIntegrations((p) => ({ ...p, ssoIssuerUrl: e.target.value }))} />
                  <select className="input" value={integrations.ssoProvider} onChange={(e) => setIntegrations((p) => ({ ...p, ssoProvider: e.target.value }))}>
                    <option value="oidc">OpenID Connect (OIDC)</option>
                    <option value="saml">SAML 2.0</option>
                    <option value="azure">Microsoft Entra ID</option>
                    <option value="google">Google Workspace</option>
                  </select>
                </div>
              )}
              <IntegrationToggle label="Zoom (live sessions)" checked={integrations.zoomEnabled} onChange={(v) => setIntegrations((p) => ({ ...p, zoomEnabled: v }))} />
              {integrations.zoomEnabled && (
                <input className="input font-mono text-xs" placeholder="Zoom Client ID" value={integrations.zoomClientId} onChange={(e) => setIntegrations((p) => ({ ...p, zoomClientId: e.target.value }))} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="gold" size="sm" onClick={saveIntegrations} disabled={integrationsSaving}>
                {integrationsSaving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
                Save Integrations
              </Button>
              {integrationsSaved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</span>}
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="SIS Import / Export" icon={Upload}>
          <div className="space-y-4">
            <div className="rounded-lg border border-gold-500/25 bg-gold-500/5 px-3 py-2.5 text-xs text-text-muted">
              Bulk-manage student records by exporting the roster to CSV or importing from your Student Information System. Imported students are created with a temporary password.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportSis}>
                <Download aria-hidden="true" className="h-4 w-4" /> Export Students CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={sisImporting}>
                {sisImporting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Upload aria-hidden="true" className="h-4 w-4" />}
                Import Students CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importSis(file);
                }}
              />
            </div>
            {sisMsg && (
              <p className={`text-sm ${sisMsg.tone === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {sisMsg.text}
              </p>
            )}
            <p className="text-xs text-text-muted">CSV columns: <span className="font-mono">fullName, email, phone, timezone, locale</span></p>
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

      {isSuperAdmin && (
        <SectionPanel title="Danger Zone" icon={AlertTriangle}>
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Reset all figures & revenue</p>
                  <p className="mt-1 text-sm text-text-muted">
                    This permanently clears all enrollments, payments/revenue, certificates, quiz attempts, submissions,
                    gradebook entries, attendance records and resets course enrollment counts. User accounts and courses
                    are kept. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  className="input max-w-xs font-mono text-sm"
                  placeholder='Type "RESET" to confirm'
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                />
                <Button variant="danger" onClick={handleResetFigures} disabled={resetting || resetConfirm !== 'RESET'}>
                  {resetting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RotateCcw aria-hidden="true" className="h-4 w-4" />}
                  {resetting ? 'Resetting…' : 'Reset All Figures'}
                </Button>
              </div>
            </div>
          </div>
        </SectionPanel>
      )}
    </div>
  );
}

function IntegrationToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-line px-3 py-2.5 text-sm">
      <span className="text-text-primary">{label}</span>
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
        style={{ backgroundColor: checked ? 'rgb(var(--gold-500))' : 'rgb(var(--line))' }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(1rem)' : 'translateX(0.125rem)' }}
        />
      </span>
    </label>
  );
}
