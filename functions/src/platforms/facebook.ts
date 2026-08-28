// Facebook Page posting via Graph API
// Requires: FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ID

const FB_BASE = 'https://graph.facebook.com/v19.0'

interface FacebookPostResult {
  postId: string
}

async function fbPost(
  path: string,
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!token || token === 'placeholder') throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN not configured')

  const url = new URL(`${FB_BASE}${path}`)
  Object.entries({ ...params, access_token: token }).forEach(([k, v]) =>
    url.searchParams.set(k, v)
  )

  const res = await fetch(url.toString(), { method: 'POST' })
  const data = (await res.json()) as Record<string, unknown>
  if (!res.ok || data['error']) {
    throw new Error(`Facebook API error: ${JSON.stringify(data['error'] ?? data)}`)
  }
  return data
}

export async function postToFacebook(
  caption: string,
  mediaUrl: string | null,
  mediaType: 'image' | 'video' | null
): Promise<FacebookPostResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID
  if (!pageId || pageId === 'placeholder') throw new Error('FACEBOOK_PAGE_ID not configured')

  let postId: string

  if (!mediaUrl) {
    // Text-only post
    const data = await fbPost(`/${pageId}/feed`, { message: caption })
    postId = data['id'] as string
  } else if (mediaType === 'image') {
    // Image post
    const data = await fbPost(`/${pageId}/photos`, {
      url: mediaUrl,
      caption,
    })
    postId = data['post_id'] as string ?? data['id'] as string
  } else {
    // Video post
    const data = await fbPost(`/${pageId}/videos`, {
      file_url: mediaUrl,
      description: caption,
    })
    postId = data['id'] as string
  }

  if (!postId) throw new Error('Facebook post returned no ID')
  return { postId }
}
