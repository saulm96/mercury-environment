import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/transactions', '/tools'];
const PUBLIC_ROUTES = ['/'];

export function authMiddleware(request: NextRequest): NextResponse | null {
  const token = request.cookies.get('token');
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isPublic && token) {
    return NextResponse.redirect(new URL('/transactions', request.url));
  }

  return null;
}
