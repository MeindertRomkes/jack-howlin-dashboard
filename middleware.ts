import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')
  const { pathname } = request.nextUrl

  // Unconditionally allow verification files, public assets & public routes
  if (
    pathname.includes('tiktok') ||
    pathname.endsWith('.txt') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.png') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/studio/callback') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // In local development, allow access seamlessly
  if (process.env.NODE_ENV === 'development' || request.nextUrl.hostname === 'localhost') {
    return NextResponse.next()
  }

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
}
