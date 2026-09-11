import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    const expectedPassword = process.env.ADMIN_PASSWORD || 'adminthreads2026';

    if (!password || password.trim() !== expectedPassword.trim()) {
      return NextResponse.json(
        { success: false, error: 'Kata sandi tidak valid. Silakan coba lagi.' },
        { status: 401 }
      );
    }

    const token = await createSessionToken();
    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil.',
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
