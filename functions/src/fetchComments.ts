import { getDb } from './admin'
import { Timestamp } from 'firebase-admin/firestore'
import { google } from 'googleapis'
import type { CommentDoc } from './types'

// ──────────────────────────────────────────────
// YouTube
// ──────────────────────────────────────────────
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
        publishedAt: Timestamp.fromDate(new Date(topComment.publishedAt ?? Date.now())),
        fetchedAt: Timestamp.now(),
        status: 'new',
        generatedReplies: [],
        chosenReply: null,
      }

      const docRef = await db.collection('comments').add(commentDoc)
      console.log(`[YouTube] Saved comment ${docRef.id} from ${commentDoc.author}`)
    }
  }
}

// ──────────────────────────────────────────────
// Instagram (Creator API via graph.instagram.com)
// ──────────────────────────────────────────────
export async function fetchInstagramComments(): Promise<void> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const userId = process.env.INSTAGRAM_USER_ID

  if (!token || token === 'placeholder' || !userId || userId === 'placeholder') {
    console.log('[Instagram] Credentials not configured, skipping')
    return
  }

  const db = getDb()
  const BASE = 'https://graph.instagram.com/v21.0'

  // Get recent media (last 10 posts)
  const mediaRes = await fetch(
    `${BASE}/${userId}/media?fields=id,caption,media_type,timestamp&limit=10&access_token=${token}`
  )
  const mediaData = (await mediaRes.json()) as { data?: { id: string; caption?: string; media_type: string; timestamp: string }[] }

  for (const media of mediaData.data ?? []) {
    // Fetch comments on this post
    const commentsRes = await fetch(
      `${BASE}/${media.id}/comments?fields=id,text,username,timestamp&limit=50&access_token=${token}`
    )
    const commentsData = (await commentsRes.json()) as {
      data?: { id: string; text: string; username: string; timestamp: string }[]
    }

    for (const comment of commentsData.data ?? []) {
      const existing = await db
        .collection('comments')
        .where('platformCommentId', '==', comment.id)
        .limit(1)
        .get()

      if (!existing.empty) continue

      const commentDoc: CommentDoc = {
        platform: 'instagram',
        platformCommentId: comment.id,
        videoId: media.id,
        videoTitle: media.caption?.substring(0, 80) ?? 'Instagram Post',
        author: comment.username,
        authorAvatar: '',
        text: comment.text,
        publishedAt: Timestamp.fromDate(new Date(comment.timestamp)),
        fetchedAt: Timestamp.now(),
        status: 'new',
        generatedReplies: [],
        chosenReply: null,
      }

      const docRef = await db.collection('comments').add(commentDoc)
      console.log(`[Instagram] Saved comment ${docRef.id} from @${comment.username}`)
    }
  }
}

// ──────────────────────────────────────────────
// Facebook Page
// ──────────────────────────────────────────────
export async function fetchFacebookComments(): Promise<void> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  const pageId = process.env.FACEBOOK_PAGE_ID

  if (!token || token === 'placeholder' || !pageId || pageId === 'placeholder') {
    console.log('[Facebook] Credentials not configured, skipping')
    return
  }

  const db = getDb()
  const BASE = 'https://graph.facebook.com/v19.0'

  // Get last 10 Page posts
  const postsRes = await fetch(
    `${BASE}/${pageId}/posts?fields=id,message,created_time&limit=10&access_token=${token}`
  )
  const postsData = (await postsRes.json()) as {
    data?: { id: string; message?: string; created_time: string }[]
  }

  for (const post of postsData.data ?? []) {
    // Fetch comments on this post
    const commentsRes = await fetch(
      `${BASE}/${post.id}/comments?fields=id,message,from,created_time&limit=50&access_token=${token}`
    )
    const commentsData = (await commentsRes.json()) as {
      data?: { id: string; message: string; from?: { name: string }; created_time: string }[]
    }

    for (const comment of commentsData.data ?? []) {
      const existing = await db
        .collection('comments')
        .where('platformCommentId', '==', comment.id)
        .limit(1)
        .get()

      if (!existing.empty) continue

      const commentDoc: CommentDoc = {
        platform: 'facebook',
        platformCommentId: comment.id,
        videoId: post.id,
        videoTitle: post.message?.substring(0, 80) ?? 'Facebook Post',
        author: comment.from?.name ?? 'Unknown',
        authorAvatar: '',
        text: comment.message,
        publishedAt: Timestamp.fromDate(new Date(comment.created_time)),
        fetchedAt: Timestamp.now(),
        status: 'new',
        generatedReplies: [],
        chosenReply: null,
      }

      const docRef = await db.collection('comments').add(commentDoc)
      console.log(`[Facebook] Saved comment ${docRef.id} from ${comment.from?.name}`)
    }
  }
}
