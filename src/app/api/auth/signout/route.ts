import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies } from '@/lib/auth';

export async function GET(request: NextRequest) {
  await clearSessionCookies();
  return NextResponse.redirect(new URL('/login', request.url));
}

export async function POST(request: NextRequest) {
  await clearSessionCookies();
  return NextResponse.redirect(new URL('/login', request.url));
}