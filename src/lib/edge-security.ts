import { NextResponse } from 'next/server';

// Edge-runtime-safe security headers. Kept free of Prisma and other Node-only
// dependencies so the middleware bundle stays small and edge-compatible.
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