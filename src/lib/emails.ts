import { sendEmail } from '@/lib/delivery';

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
}

const BRAND = 'EMIT Center';
const FROM_DEFAULT = process.env.MAIL_FROM ?? 'EMIT Center <no-reply@emitcenter.com>';

function layout(title: string, bodyHtml: string): string {
  return `
  <div style="background:#f6f4ef;padding:24px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e6ddc8;border-radius:12px;overflow:hidden;">
      <div style="background:#1f1a12;padding:20px 28px;text-align:center;">
        <div style="font-size:18px;font-weight:700;color:#e7b84a;letter-spacing:1px;">${BRAND}</div>
        <div style="font-size:11px;color:#b7ad97;letter-spacing:2px;margin-top:2px;">FOUNDATION &middot; LEARNING PORTAL</div>
      </div>
      <div style="padding:28px;">
        <div style="font-size:20px;font-weight:700;color:#1f1a12;margin-bottom:12px;">${title}</div>
        <div style="font-size:14px;color:#3c3426;line-height:1.6;">${bodyHtml}</div>
      </div>
      <div style="background:#fbf7ee;padding:16px 28px;text-align:center;font-size:12px;color:#8a7e66;">
        &copy; EMIT Center Foundation &middot; <a href="${appUrl()}" style="color:#b8860b;text-decoration:none;">${appUrl()}</a>
      </div>
    </div>
  </div>`;
}

export async function sendVerifyEmail(email: string, fullName: string, url: string): Promise<void> {
  const html = layout(
    'Confirm your email',
    `<p>Hi <strong>${fullName}</strong>,</p>
     <p>Welcome to ${BRAND}. Please confirm your email address to activate your account.</p>
     <p style="text-align:center;margin:24px 0;">
       <a href="${url}" style="background:#b8860b;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Confirm email</a>
     </p>
     <p style="color:#8a7e66;font-size:12px;">If the button doesn't work, copy this link:<br/><a href="${url}" style="color:#b8860b;">${url}</a></p>
     <p style="color:#8a7e66;font-size:12px;">This link expires in 24 hours.</p>`,
  );
  await sendEmail({ to: email, subject: `Confirm your email — ${BRAND}`, html, text: `Confirm your email: ${url}` });
}

export async function sendPasswordResetEmail(email: string, fullName: string, url: string): Promise<void> {
  const html = layout(
    'Reset your password',
    `<p>Hi <strong>${fullName}</strong>,</p>
     <p>We received a request to reset your ${BRAND} password. Click below to choose a new one.</p>
     <p style="text-align:center;margin:24px 0;">
       <a href="${url}" style="background:#b8860b;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Reset password</a>
     </p>
     <p style="color:#8a7e66;font-size:12px;">If you didn't request this, you can ignore this email. This link expires in 1 hour.</p>`,
  );
  await sendEmail({ to: email, subject: `Reset your password — ${BRAND}`, html, text: `Reset your password: ${url}` });
}

export async function sendWelcomeCredentialsEmail(
  email: string,
  fullName: string,
  opts: { username?: string; password: string; roleLabel: string },
): Promise<void> {
  const html = layout(
    `Your ${BRAND} account`,
    `<p>Hi <strong>${fullName}</strong>,</p>
     <p>An <strong>${opts.roleLabel}</strong> account has been created for you on ${BRAND}. Sign in here:</p>
     <p style="text-align:center;margin:24px 0;">
       <a href="${appUrl()}/login" style="background:#b8860b;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Sign in</a>
     </p>
     <table style="width:100%;font-size:14px;border-collapse:collapse;">
       <tr><td style="padding:6px 0;color:#8a7e66;">Email</td><td style="padding:6px 0;font-weight:600;text-align:right;">${email}</td></tr>
       ${opts.username ? `<tr><td style="padding:6px 0;color:#8a7e66;">Username</td><td style="padding:6px 0;font-weight:600;text-align:right;">${opts.username}</td></tr>` : ''}
       <tr><td style="padding:6px 0;color:#8a7e66;">Temporary password</td><td style="padding:6px 0;font-weight:600;text-align:right;font-family:monospace;">${opts.password}</td></tr>
     </table>
     <p style="color:#8a7e66;font-size:12px;margin-top:8px;">Please sign in and change your password after your first login. If you are a parent or guardian, you can link the email of the student you support to view their progress.</p>`,
  );
  await sendEmail({
    to: email,
    subject: `Your ${BRAND} account is ready`,
    html,
    text: `Sign in at ${appUrl()}/login with email ${email}${opts.username ? ` (username ${opts.username})` : ''} and temporary password ${opts.password}.`,
  });
}

export async function sendCertificateEmail(
  email: string,
  studentName: string,
  courseTitle: string,
  verifyUrl: string,
  hash: string,
): Promise<void> {
  const html = layout(
    `Certificate of Completion — ${courseTitle}`,
    `<p>Congratulations, <strong>${studentName}</strong>!</p>
     <p>You have earned a <strong>Certificate of Completion</strong> for:</p>
     <p style="font-size:18px;color:#1f1a12;font-weight:700;">${courseTitle}</p>
     <p style="text-align:center;margin:24px 0;">
       <a href="${verifyUrl}" style="background:#b8860b;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">View &amp; verify certificate</a>
     </p>
     <p style="color:#8a7e66;font-size:12px;">Verification code: <span style="font-family:monospace;">${hash}</span></p>`,
  );
  await sendEmail({
    to: email,
    subject: `Your ${BRAND} Certificate — ${courseTitle}`,
    html,
    text: `Congratulations ${studentName}! View & verify your certificate: ${verifyUrl} (code ${hash})`,
  });
}