import { prisma } from '@/lib/prisma';

// Lightweight email/SMS delivery with graceful degradation.
// Email is sent exclusively through Resend; SMS is sent through Twilio.
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

async function getConfig(): Promise<{
  resendKey: string;
  fromAddress: string;
  twilioSid: string;
  twilioToken: string;
  twilioFrom: string;
}> {
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
    resendKey: read('resendApiKey') || fromEnv('RESEND_API_KEY'),
    fromAddress: read('emailFrom') || fromEnv('EMAIL_FROM') || 'no-reply@emitcenter.com',
    twilioSid: read('twilioAccountSid') || fromEnv('TWILIO_ACCOUNT_SID'),
    twilioToken: read('twilioAuthToken') || fromEnv('TWILIO_AUTH_TOKEN'),
    twilioFrom: read('twilioFrom') || fromEnv('TWILIO_FROM'),
  };
}

export async function sendEmail({ to, subject, text, html }: EmailOptions): Promise<DeliveryResult> {
  const cfg = await getConfig();

  if (!cfg.resendKey) {
    // No provider configured — record and skip actual delivery.
    return { channel: 'email', status: 'skipped' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: cfg.fromAddress, to: [to], subject, text, html }),
    });
    if (res.ok) return { channel: 'email', status: 'sent', provider: 'resend' };
  } catch {
    /* fall through */
  }

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