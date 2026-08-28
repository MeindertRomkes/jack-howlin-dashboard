import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json()
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })
    }

    // Verify the ID token with Firebase Admin
    const decoded = await adminAuth.verifyIdToken(idToken)

    // Only allow the authorized email
    if (decoded.email !== 'romkesmeindert@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized: wrong account' }, { status: 403 })
    }

    // Set a simple session cookie with the uid
    const response = NextResponse.json({ success: true, email: decoded.email })
    response.cookies.set('session', decoded.uid, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    })
    return response
  } catch (err) {
    console.error('Session creation error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('session', '', { maxAge: 0, path: '/' })
  return response
}
