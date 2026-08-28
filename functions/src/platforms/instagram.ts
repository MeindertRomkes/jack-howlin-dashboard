// Instagram Graph API posting
// Requires: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

interface InstagramPostResult {
  mediaId: string
}

async function graphPost(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN not configured')

  const url = new URL(`${GRAPH_BASE}${path}`)
  Object.entries({ ...params, access_token: token }).forEach(([k, v]) =>
    url.searchParams.set(k, v)
  )

  const res = await fetch(url.toString(), { method: 'POST' })
  const data = (await res.json()) as Record<string, unknown>
  if (!res.ok || data['error']) {
    throw new Error(`Instagram API error: ${JSON.stringify(data['error'] ?? data)}`)
  }
  return data
}

async function waitForMediaReady(containerId: string, maxWaitMs = 120_000): Promise<void> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN not configured')

  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const url = new URL(`${GRAPH_BASE}/${containerId}`)
    url.searchParams.set('fields', 'status_code')
    url.searchParams.set('access_token', token)

    const res = await fetch(url.toString())
    const data = (await res.json()) as { status_code?: string }

    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') throw new Error('Instagram media processing failed')

    await new Promise(r => setTimeout(r, 5000)) // poll every 5s
  }
  throw new Error('Instagram media processing timeout')
}

export async function postToInstagram(
  mediaUrl: string,
  mediaType: 'image' | 'video',
  caption: string
): Promise<InstagramPostResult> {
  const userId = process.env.INSTAGRAM_USER_ID
  if (!userId) throw new Error('INSTAGRAM_USER_ID not configured')

  let containerId: string

  if (mediaType === 'image') {
    // Image post
    const data = await graphPost(`/${userId}/media`, {
      image_url: mediaUrl,
      caption,
    })
    containerId = data['id'] as string
  } else {
    // Reel (video)
    const data = await graphPost(`/${userId}/media`, {
      media_type: 'REELS',
      video_url: mediaUrl,
      caption,
      share_to_feed: 'true',
    })
    containerId = data['id'] as string
    // Wait for video to finish processing (up to 2 min)
    await waitForMediaReady(containerId)
  }

  // Publish the container
  const publishData = await graphPost(`/${userId}/media_publish`, {
    creation_id: containerId,
  })

  const mediaId = publishData['id'] as string
  if (!mediaId) throw new Error('Instagram publish returned no media ID')
  return { mediaId }
}
