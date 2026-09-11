import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/auth/session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Always allow static files, Next.js internal files, and public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/avatar.jpg') ||
    pathname.includes('.') // Any static asset e.g. .png, .jpg, .svg, .css, .js
  ) {
    return NextResponse.next();
  }

  // 2. Allow public endpoints
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/products/ingest' || // Protected via x-api-key for Chrome Extension
    pathname === '/api/media-stock/export' || // Protected via x-api-key for Chrome Extension Video Export
    pathname.startsWith('/api/cron') // Protected via CRON_SECRET / Bearer token
  ) {
    // If authenticated user tries to visit /login, redirect to /dashboard
    if (pathname === '/login') {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      const isValid = await verifySessionToken(token);
      if (isValid) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Check Session Authentication for all protected dashboard & API routes
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionToken(token);

  if (!isAuthenticated) {
    // API routes return 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Sesi berakhir atau belum login. Akses ditolak.' },
        { status: 401 }
      );
    }

    // Web pages redirect to /login
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
