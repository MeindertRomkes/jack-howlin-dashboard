import { getDb } from './admin'
import { Timestamp } from 'firebase-admin/firestore'
import { google } from 'googleapis'
import type { CommentDoc } from './types'

export async function fetchYouTubeComments(): Promise<void> {
  const db = getDb()

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  )
  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
  })

  const youtube = google.youtube('v3')

  // Get upload playlist ID for the channel
  const channelRes = await youtube.channels.list({
    auth: oauth2Client,
    part: ['contentDetails'],
    mine: true,
  })

  const uploadsPlaylistId =
    channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsPlaylistId) {
    console.log('No uploads playlist found')
    return
  }

  // Get last 10 videos
  const videosRes = await youtube.playlistItems.list({
    auth: oauth2Client,
    part: ['snippet'],
    playlistId: uploadsPlaylistId,
    maxResults: 10,
  })

  for (const video of videosRes.data.items ?? []) {
    const videoId = video.snippet?.resourceId?.videoId
    const videoTitle = video.snippet?.title ?? 'Unknown'
    if (!videoId) continue

    // Fetch top-level comments for this video
    const commentsRes = await youtube.commentThreads.list({
      auth: oauth2Client,
      part: ['snippet'],
      videoId,
      maxResults: 50,
      order: 'time',
    })

    for (const item of commentsRes.data.items ?? []) {
      const topComment = item.snippet?.topLevelComment?.snippet
      if (!topComment) continue

      const platformCommentId = item.id!

      // Deduplication check
      const existing = await db
        .collection('comments')
        .where('platformCommentId', '==', platformCommentId)
        .limit(1)
        .get()

      if (!existing.empty) continue

      const commentDoc: CommentDoc = {
        platform: 'youtube',
        platformCommentId,
        videoId,
        videoTitle,
        author: topComment.authorDisplayName ?? 'Unknown',
        authorAvatar: topComment.authorProfileImageUrl ?? '',
        text: topComment.textDisplay ?? '',
        publishedAt: Timestamp.fromDate(
          new Date(topComment.publishedAt ?? Date.now())
        ),
        fetchedAt: Timestamp.now(),
        status: 'new',
        generatedReplies: [],
        chosenReply: null,
      }

      const docRef = await db.collection('comments').add(commentDoc)
      console.log(`Saved comment ${docRef.id} from ${commentDoc.author}`)
    }
  }
}
