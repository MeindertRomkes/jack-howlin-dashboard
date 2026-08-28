import { NextRequest, NextResponse } from 'next/server'

// TikTok OAuth callback — exchanges auth code for access token
// and stores it in session / Firestore for later use
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('TikTok OAuth error:', error)
    return NextResponse.redirect(new URL('/?tiktok_error=' + error, req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?tiktok_error=no_code', req.url))
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY ?? '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${req.nextUrl.origin}/api/auth/tiktok/callback`,
      }),
    })

    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      throw new Error(tokenData.error_description ?? tokenData.error)
    }

    // In production: store tokenData.access_token and tokenData.open_id
    // in Secret Manager. For now, log them so you can copy them.
    console.log('TikTok access token received — open_id:', tokenData.open_id)

    return NextResponse.redirect(new URL('/?tiktok_connected=1', req.url))
  } catch (err) {
    console.error('TikTok token exchange failed:', err)
    return NextResponse.redirect(
      new URL('/?tiktok_error=token_exchange_failed', req.url)
    )
  }
}
