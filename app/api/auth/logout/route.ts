import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Berhasil keluar.' });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

export async function GET(req: NextRequest) {
  const loginUrl = new URL('/login', req.url);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
