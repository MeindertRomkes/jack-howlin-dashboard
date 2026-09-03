import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

const ALLOWED_EMAILS = [
  'romkesmeindert@gmail.com',
  'swd.neerlandia@gmail.com',
  'meindertneerlandia@gmail.com',
  'jackhowlin0@gmail.com',
  'bonkerstostis@gmail.com',
]

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json()
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })
    }

    // Verify the ID token with Firebase Admin
    const decoded = await adminAuth.verifyIdToken(idToken)

    // Allow authorized accounts
    const userEmail = (decoded.email || '').toLowerCase()
    const isAllowed = ALLOWED_EMAILS.some((email) => email.toLowerCase() === userEmail)

    if (!isAllowed) {
      return NextResponse.json(
        { error: `Unauthorized: ${userEmail} is not an authorized administrator.` },
        { status: 403 }
      )
    }

    // Set cookie '__session' (required by Firebase Hosting CDN to pass cookies through to Cloud Functions)
    const response = NextResponse.json({ success: true, email: decoded.email })
    const cookieOptions = {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax' as const,
    }

    response.cookies.set('__session', decoded.uid, cookieOptions)
    response.cookies.set('session', decoded.uid, cookieOptions)

    return response
  } catch (err) {
    console.error('Session creation error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('__session', '', { maxAge: 0, path: '/' })
  response.cookies.set('session', '', { maxAge: 0, path: '/' })
  return response
}

