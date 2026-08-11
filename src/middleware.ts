import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROLE_META, ROLES } from '@/config/roles';
import type { Role } from '@/types';

const ROLE_ROUTE_PREFIXES: Record<Role, string[]> = {
  super_admin: ['/dashboard/admin', '/admin'],
  administrator: ['/dashboard/admin'],
  instructor: ['/dashboard/instructor', '/instructor'],
  student: ['/dashboard/student'],
  parent: ['/dashboard/parent'],
};

const SUPER_ADMIN_ONLY_PREFIXES = ['/dashboard/admin/permissions', '/dashboard/admin/users'];

function readRole(request: NextRequest): Role {
  const raw = request.cookies.get('emit_role')?.value;
  return (ROLES as string[]).includes(raw ?? '') ? (raw as Role) : 'student';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    const role = readRole(request);
    return NextResponse.redirect(new URL(ROLE_META[role].home, request.url));
  }

  const role = readRole(request);
  const allowed = ROLE_ROUTE_PREFIXES[role];
  const isAllowed = allowed.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!isAllowed) {
    return NextResponse.redirect(new URL(ROLE_META[role].home, request.url));
  }

  if (role !== 'super_admin' && SUPER_ADMIN_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.redirect(new URL(ROLE_META[role].home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/instructor/:path*'],
};
