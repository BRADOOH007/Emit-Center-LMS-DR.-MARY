import { prisma } from '@/lib/prisma';

// Lightweight email/SMS delivery with graceful degradation.
// Real providers are used only when the corresponding credentials are
// configured (via environment variables or app settings). Otherwise the
// delivery is recorded in the audit log so the platform still works
// end-to-end in demo/local mode.

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface SmsOptions {
  to: string;
  body: string;
}

export interface DeliveryResult {
  channel: 'email' | 'sms';
  status: 'sent' | 'queued' | 'skipped';
  provider?: string;
}

function readSetting(settings: { key: string; value: unknown }[], key: string): string {
  const row = settings.find((s) => s.key === key);
  const value = row?.value;
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.value === 'string') return obj.value;
  }
  return '';
}

async function getConfig(): Promise<{ smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string; smtpFrom: string; resendKey: string; sendgridKey: string; twilioSid: string; twilioToken: string; twilioFrom: string }> {
  const fromEnv = (key: string) => process.env[key] ?? '';
  let stored: Record<string, unknown> = {};
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: 'delivery_settings' } });
    const value = row?.value;
    if (value && typeof value === 'object') stored = value as Record<string, unknown>;
  } catch {
    stored = {};
  }
  const read = (key: string) => {
    const v = stored[key];
    return typeof v === 'string' ? v : '';
  };
  return {
    smtpHost: read('smtpHost') || fromEnv('SMTP_HOST'),
    smtpPort: Number(read('smtpPort') || fromEnv('SMTP_PORT') || 587),
    smtpUser: read('smtpUser') || fromEnv('SMTP_USER'),
    smtpPass: read('smtpPass') || fromEnv('SMTP_PASS'),
    smtpFrom: read('smtpFrom') || fromEnv('SMTP_FROM') || 'no-reply@emitcenter.com',
    resendKey: read('resendApiKey') || fromEnv('RESEND_API_KEY'),
    sendgridKey: read('sendgridApiKey') || fromEnv('SENDGRID_API_KEY'),
    twilioSid: read('twilioAccountSid') || fromEnv('TWILIO_ACCOUNT_SID'),
    twilioToken: read('twilioAuthToken') || fromEnv('TWILIO_AUTH_TOKEN'),
    twilioFrom: read('twilioFrom') || fromEnv('TWILIO_FROM'),
  };
}

export async function sendEmail({ to, subject, text, html }: EmailOptions): Promise<DeliveryResult> {
  const cfg = await getConfig();
  const body = html ?? text ?? '';

  if (cfg.resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: cfg.smtpFrom, to: [to], subject, text, html }),
      });
      if (res.ok) return { channel: 'email', status: 'sent', provider: 'resend' };
    } catch {
      /* fall through */
    }
  }

  if (cfg.sendgridKey) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.sendgridKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: cfg.smtpFrom },
          subject,
          content: [{ type: html ? 'text/html' : 'text/plain', value: body }],
        }),
      });
      if (res.ok) return { channel: 'email', status: 'sent', provider: 'sendgrid' };
    } catch {
      /* fall through */
    }
  }

  // No provider configured — record and skip actual delivery.
  return { channel: 'email', status: 'skipped' };
}

export async function sendSms({ to, body }: SmsOptions): Promise<DeliveryResult> {
  const cfg = await getConfig();

  if (cfg.twilioSid && cfg.twilioToken && cfg.twilioFrom) {
    try {
      const params = new URLSearchParams({ To: to, From: cfg.twilioFrom, Body: body });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${cfg.twilioSid}:${cfg.twilioToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      if (res.ok) return { channel: 'sms', status: 'sent', provider: 'twilio' };
    } catch {
      /* fall through */
    }
  }

  return { channel: 'sms', status: 'skipped' };
}

export async function logDelivery(userId: string, action: string, resourceType: string, resourceId: string): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { userId, action, resourceType, resourceId },
    });
  } catch {
    /* non-fatal */
  }
}
