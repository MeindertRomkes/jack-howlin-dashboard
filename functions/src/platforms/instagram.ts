// Instagram Graph API (Creator/Business) posting
// Uses graph.instagram.com — works with Creator accounts (no Facebook Page needed)
// Requires: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID

const IG_BASE = 'https://graph.instagram.com/v21.0'

interface InstagramPostResult {
  mediaId: string
}

async function igPost(
  path: string,
  body: Record<string, string>
): Promise<Record<string, unknown>> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token || token === 'placeholder') throw new Error('INSTAGRAM_ACCESS_TOKEN not configured')

  const res = await fetch(`${IG_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  })

  const data = (await res.json()) as Record<string, unknown>
  if (!res.ok || data['error']) {
    throw new Error(
      `Instagram API error: ${JSON.stringify(data['error'] ?? data)}`
    )
  }
  return data
}

async function waitForMediaReady(
  containerId: string,
  maxWaitMs = 120_000
): Promise<void> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN not configured')

  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const url = new URL(`${IG_BASE}/${containerId}`)
    url.searchParams.set('fields', 'status_code,status')
    url.searchParams.set('access_token', token)

    const res = await fetch(url.toString())
    const data = (await res.json()) as { status_code?: string; status?: string }

    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') {
      throw new Error(`Instagram media processing failed: ${data.status}`)
    }

    await new Promise(r => setTimeout(r, 5000))
  }
  throw new Error('Instagram media processing timeout (2 min)')
}

export async function postToInstagram(
  mediaUrl: string,
  mediaType: 'image' | 'video',
  caption: string
): Promise<InstagramPostResult> {
  const userId = process.env.INSTAGRAM_USER_ID
  if (!userId || userId === 'placeholder') throw new Error('INSTAGRAM_USER_ID not configured')

  let containerId: string

  if (mediaType === 'image') {
    const data = await igPost(`/${userId}/media`, {
      image_url: mediaUrl,
      caption,
    })
    containerId = data['id'] as string
  } else {
    // Reel (video) — Creator accounts post videos as Reels
    const data = await igPost(`/${userId}/media`, {
      media_type: 'REELS',
      video_url: mediaUrl,
      caption,
      share_to_feed: 'true',
    })
    containerId = data['id'] as string
    // Wait for video processing (up to 2 minutes)
    await waitForMediaReady(containerId)
  }

  // Publish the container
  const publishData = await igPost(`/${userId}/media_publish`, {
    creation_id: containerId,
  })

  const mediaId = publishData['id'] as string
  if (!mediaId) throw new Error('Instagram publish returned no media ID')
  return { mediaId }
}
