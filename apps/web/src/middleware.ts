import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authMiddleware } from '@/middlewares/auth.middleware';

export function middleware(request: NextRequest) {
  const redirect = authMiddleware(request);
  if (redirect) return redirect;

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
