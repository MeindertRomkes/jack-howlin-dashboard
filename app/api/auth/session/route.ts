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
    const allowedEmail = process.env.ALLOWED_EMAIL || 'romkesmeindert@gmail.com'
    if (decoded.email !== allowedEmail) {
      return NextResponse.json({ error: 'Unauthorized email' }, { status: 403 })
    }

    // Create a session cookie (expires in 7 days)
    const expiresIn = 60 * 60 * 24 * 7 * 1000
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn })

    const response = NextResponse.json({ success: true })
    response.cookies.set('session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'lax',
    })
    return response
  } catch (err) {
    console.error('Session creation error:', err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('session', '', { maxAge: 0, path: '/' })
  return response
}
