import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

const PROJECT_ID = 'jack-howlin-dashboard'

// Lazy-initialized to avoid credential fetch at module load time
let _secretClient: SecretManagerServiceClient | null = null
function getSecretClient(): SecretManagerServiceClient {
  if (!_secretClient) _secretClient = new SecretManagerServiceClient()
  return _secretClient
}

async function updateSecret(secretName: string, newValue: string): Promise<void> {
  const parent = `projects/${PROJECT_ID}/secrets/${secretName}`
  await getSecretClient().addSecretVersion({
    parent,
    payload: { data: Buffer.from(newValue, 'utf8') },
  })
  console.log(`✅ Updated secret ${secretName}`)
}

// ──────────────────────────────────────────────
// Instagram token refresh (runs daily)
// Instagram long-lived tokens last 60 days, refreshable any time
// ──────────────────────────────────────────────
export async function refreshInstagramToken(): Promise<void> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token || token === 'placeholder') {
    console.log('[Instagram] Token not configured, skipping refresh')
    return
  }

  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
  )
  const data = (await res.json()) as {
    access_token?: string
    expires_in?: number
    error?: { message: string }
  }

  if (!res.ok || data.error || !data.access_token) {
    console.error('[Instagram] Token refresh failed:', data.error?.message ?? 'Unknown error')
    return
  }

  const daysLeft = Math.round((data.expires_in ?? 0) / 86400)
  console.log(`[Instagram] Token refreshed — valid for ${daysLeft} more days`)

  await updateSecret('INSTAGRAM_ACCESS_TOKEN', data.access_token)
}
