import { getDb } from './admin'
import { Timestamp } from 'firebase-admin/firestore'
import { postToYouTube } from './platforms/youtube'
import { postToInstagram } from './platforms/instagram'
import { postToTikTok } from './platforms/tiktok'
import { postToFacebook } from './platforms/facebook'

interface PlatformResult {
  status: 'posted' | 'failed'
  postId?: string
  error?: string
}

export async function postScheduledContent(): Promise<void> {
  const db = getDb()
  const now = Timestamp.now()

  const snap = await db
    .collection('posts')
    .where('status', '==', 'scheduled')
    .where('scheduledAt', '<=', now)
    .get()

  if (snap.empty) {
    console.log('No scheduled posts due')
    return
  }

  console.log(`Found ${snap.size} post(s) to publish`)

  for (const docSnap of snap.docs) {
    const post = docSnap.data() as {
      platforms: string[]
      caption: string
      title?: string
      tags?: string[]
      mediaUrl?: string | null
      mediaType?: 'image' | 'video' | null
    }

    const platformResults: Record<string, PlatformResult> = {}
    let anyFailed = false

    // Mark in-progress immediately to avoid double-posting on retry
    await db.collection('posts').doc(docSnap.id).update({ status: 'posting' })

    for (const platform of post.platforms) {
      try {
        if (platform === 'youtube') {
          if (!post.mediaUrl) {
            throw new Error('YouTube requires a video file')
          }
          const title = post.title ?? post.caption.substring(0, 100)
          const { videoId } = await postToYouTube(
            post.mediaUrl,
            title,
            post.caption,
            post.tags ?? []
          )
          platformResults.youtube = { status: 'posted', postId: videoId }
          console.log(`✅ YouTube posted: ${videoId}`)

        } else if (platform === 'instagram') {
          if (!post.mediaUrl || !post.mediaType) {
            throw new Error('Instagram requires a media file (image or video)')
          }
          const { mediaId } = await postToInstagram(
            post.mediaUrl,
            post.mediaType,
            post.caption
          )
          platformResults.instagram = { status: 'posted', postId: mediaId }
          console.log(`✅ Instagram posted: ${mediaId}`)

        } else if (platform === 'tiktok') {
          if (!post.mediaUrl) {
            throw new Error('TikTok requires a video file')
          }
          const { publishId } = await postToTikTok(
            post.mediaUrl,
            post.caption
          )
          platformResults.tiktok = { status: 'posted', postId: publishId }
          console.log(`✅ TikTok posted: ${publishId}`)

        } else if (platform === 'facebook') {
          const { postId } = await postToFacebook(
            post.caption,
            post.mediaUrl ?? null,
            post.mediaType ?? null
          )
          platformResults.facebook = { status: 'posted', postId }
          console.log(`✅ Facebook posted: ${postId}`)

        } else {
          console.warn(`Unknown platform: ${platform}`)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`❌ Failed to post to ${platform} for post ${docSnap.id}:`, message)
        platformResults[platform] = { status: 'failed', error: message }
        anyFailed = true
      }
    }

    // Determine overall status
    const allPosted = Object.values(platformResults).every(r => r.status === 'posted')
    const overallStatus = allPosted ? 'posted' : anyFailed ? 'partial' : 'failed'

    const errorMessages = Object.entries(platformResults)
      .filter(([, r]) => r.status === 'failed')
      .map(([p, r]) => `${p}: ${r.error}`)
      .join('; ')

    await db.collection('posts').doc(docSnap.id).update({
      status: overallStatus === 'partial' ? 'posted' : overallStatus,
      postedAt: Timestamp.now(),
      platformResults,
      errorMessage: errorMessages || null,
    })

    console.log(`Post ${docSnap.id} → ${overallStatus}`)
  }
}
