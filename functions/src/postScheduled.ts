import { getDb } from './admin'
import { Timestamp } from 'firebase-admin/firestore'
import { google } from 'googleapis'

export async function postScheduledContent(): Promise<void> {
  const db = getDb()
  const now = Timestamp.now()

  // Find all posts that are scheduled and due
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

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  )
  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
  })

  for (const docSnap of snap.docs) {
    const post = docSnap.data()
    try {
      if (post['platforms'] && (post['platforms'] as string[]).includes('youtube')) {
        // MVP: YouTube Community posts require separate YouTube API endpoints
        // For now, log the scheduled post — full video upload in Phase 2
        console.log(
          `Scheduled YouTube post: "${(post['caption'] as string).substring(0, 60)}..."`
        )
      }

      // Instagram and TikTok publishing: Phase 2
      // For now, mark as posted to demonstrate the scheduler works
      await db.collection('posts').doc(docSnap.id).update({
        status: 'posted',
        postedAt: Timestamp.now(),
      })

      console.log(`Post ${docSnap.id} marked as posted`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`Failed to publish post ${docSnap.id}:`, message)
      await db.collection('posts').doc(docSnap.id).update({
        status: 'failed',
        errorMessage: message,
      })
    }
  }
}
