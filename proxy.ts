import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('fittrack-token')?.value;
  const isAuthenticated = token ? verifyToken(token) !== null : false;

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/signup');

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isAuthPage && request.nextUrl.pathname !== '/') {
    // Allow API routes and static files
    if (
      request.nextUrl.pathname.startsWith('/api') ||
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.includes('.')
    ) {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
