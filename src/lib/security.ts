import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { maybePurgeExpiredAuditLogs } from '@/lib/audit-retention';

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitKey(request: NextRequest | Request): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  const url = request instanceof NextRequest ? request.nextUrl.pathname : new URL(request.url).pathname;
  return `${ip}:${url}`;
}

export function isRateLimited(request: NextRequest | Request, max = MAX_REQUESTS, windowMs = WINDOW_MS): boolean {
  const key = rateLimitKey(request);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  if (bucket.count > max) return true;
  return false;
}

const MAX_LOGIN_PER_WINDOW = 10;

export function isLoginRateLimited(request: NextRequest | Request): boolean {
  return isRateLimited(request, MAX_LOGIN_PER_WINDOW, 5 * 60 * 1000);
}

const TRUSTED_SAME_SITE = ['self'];

export function csrfValid(request: NextRequest | Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    const host = request.headers.get('host');
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

export function withCsrfCheck(request: NextRequest | Request): boolean {
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  if (TRUSTED_SAME_SITE.includes('self')) return csrfValid(request);
  return true;
}

export function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://meet.jit.si https://zoom.us https://meet.google.com; connect-src 'self' https://api.stripe.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:",
  };
}

export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function clientIp(): string {
  const h = headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? '';
}

export async function writeAuditLog(params: {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const h = headers();
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress ?? clientIp() ?? undefined,
        userAgent: params.userAgent ?? h.get('user-agent')?.slice(0, 512) ?? undefined,
      },
    });
    maybePurgeExpiredAuditLogs();
  } catch {
    // Audit failures must never break the primary request.
  }
}

export function isAdminRole(roles: string[]): boolean {
  return roles.includes('super_admin') || roles.includes('administrator');
}
