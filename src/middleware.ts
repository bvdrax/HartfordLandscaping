import { NextRequest, NextResponse } from 'next/server'
const SESSION_COOKIE = 'hartford-session'
const PUBLIC_PATHS = ['/login', '/portal', '/api/auth', '/api/webhooks']
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()
  if (!request.cookies.has(SESSION_COOKIE)) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-.*|manifest.json|icons/).*)',] }
