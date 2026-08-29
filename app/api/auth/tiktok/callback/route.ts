import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  if (host && !host.includes('0.0.0.0') && !host.includes('127.0.0.1')) {
    return `${proto}://${host}`
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  return 'https://jack-howlin-dashboard--jack-howlin-dashboard.europe-west4.hosted.app'
}

async function updateSecret(name: string, payload: string) {
  try {
    const client = new SecretManagerServiceClient()
    const parent = 'projects/jack-howlin-dashboard'
    try {
      await client.createSecret({
        parent,
        secretId: name,
        secret: { replication: { automatic: {} } },
      })
    } catch {
      // Secret already exists
    }
    await client.addSecretVersion({
      parent: `${parent}/secrets/${name}`,
      payload: { data: Buffer.from(payload, 'utf8') },
    })
    console.log(`Updated Secret Manager secret: ${name}`)
  } catch (err) {
    console.error(`Failed to update secret ${name}:`, err)
  }
}

// TikTok OAuth callback — exchanges auth code for access token
export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('TikTok OAuth error:', error)
    return NextResponse.redirect(new URL('/settings?tiktok_error=' + encodeURIComponent(error), baseUrl))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?tiktok_error=no_code', baseUrl))
  }

  try {
    const clientKey = process.env.TIKTOK_CLIENT_KEY || process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'sbawow4ti5dov9966f'
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET || 'aQqubtYFMSN3JoBmmPdJI6t9AeiGkeWv'
    const redirectUri = `${baseUrl}/api/auth/tiktok/callback`

    console.log('Exchanging TikTok code with redirect URI:', redirectUri)

    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenRes.json()
    console.log('TikTok token response:', JSON.stringify(tokenData))

    if (tokenData.error || tokenData.data?.error_code) {
      const errMsg = tokenData.error_description || tokenData.data?.description || tokenData.error || 'Token exchange failed'
      throw new Error(errMsg)
    }

    const accessToken = tokenData.access_token || tokenData.data?.access_token
    const refreshToken = tokenData.refresh_token || tokenData.data?.refresh_token
    const openId = tokenData.open_id || tokenData.data?.open_id
    const expiresIn = tokenData.expires_in || tokenData.data?.expires_in

    console.log('TikTok token exchange successful! open_id:', openId)

    if (accessToken) {
      await updateSecret('TIKTOK_ACCESS_TOKEN', accessToken)
    }
    if (refreshToken) {
      await updateSecret('TIKTOK_REFRESH_TOKEN', refreshToken)
    }
    if (openId) {
      await updateSecret('TIKTOK_OPEN_ID', openId)
    }

    // Save tokens in Firestore settings/tokens document as well
    try {
      await adminDb.collection('settings').doc('tokens').set({
        tiktok: {
          accessToken,
          refreshToken,
          openId,
          expiresIn,
          updatedAt: new Date(),
          status: 'connected',
        },
      }, { merge: true })
    } catch (dbErr) {
      console.error('Firestore token save error:', dbErr)
    }

    return NextResponse.redirect(new URL('/settings?tiktok_connected=1', baseUrl))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('TikTok token exchange failed:', message)
    return NextResponse.redirect(
      new URL('/settings?tiktok_error=' + encodeURIComponent(message), baseUrl)
    )
  }
}
