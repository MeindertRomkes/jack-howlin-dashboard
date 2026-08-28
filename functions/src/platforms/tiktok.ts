// TikTok Content Posting API
// Requires: TIKTOK_ACCESS_TOKEN, TIKTOK_OPEN_ID

const TIKTOK_BASE = 'https://open.tiktokapis.com/v2'

interface TikTokPostResult {
  publishId: string
}

export async function postToTikTok(
  mediaUrl: string,
  description: string
): Promise<TikTokPostResult> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN
  if (!accessToken) throw new Error('TIKTOK_ACCESS_TOKEN not configured')

  // TikTok Content Posting API — pull video from URL
  const res = await fetch(`${TIKTOK_BASE}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: description.substring(0, 150), // TikTok title max 150 chars
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: mediaUrl,
      },
    }),
  })

  const data = (await res.json()) as {
    data?: { publish_id?: string }
    error?: { code: string; message: string }
  }

  if (!res.ok || data.error?.code !== 'ok') {
    throw new Error(`TikTok API error: ${JSON.stringify(data.error ?? data)}`)
  }

  const publishId = data.data?.publish_id
  if (!publishId) throw new Error('TikTok returned no publish_id')
  return { publishId }
}
