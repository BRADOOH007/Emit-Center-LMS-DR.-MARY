import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders } from '@/lib/edge-security';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Middleware must never authorize by role: the emit_role cookie is client-visible
  // and mutable, and middleware cannot reach the database on the edge runtime.
  // It only performs two cheap gatekeeping jobs:
  //   1. Redirect unauthenticated requests to /login (defense-in-depth; server layouts
  //      re-verify the session from the database on every request).
  //   2. Apply hardened security headers.
  const hasValidSession = Boolean(request.cookies.get('emit_session')?.value);
  if (!hasValidSession) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return applySecurityHeaders(NextResponse.redirect(login));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/instructor/:path*'],
};