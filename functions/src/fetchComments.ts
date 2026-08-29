import { getDb } from './admin'
import { Timestamp } from 'firebase-admin/firestore'
import type { CommentDoc } from './types'

// ──────────────────────────────────────────────
// YouTube
// ──────────────────────────────────────────────
export async function fetchYouTubeComments(): Promise<void> {
  try {
    const db = getDb()

    const clientId = (process.env.YOUTUBE_CLIENT_ID || '').trim()
    const clientSecret = (process.env.YOUTUBE_CLIENT_SECRET || '').trim()
    const redirectUri = (process.env.YOUTUBE_REDIRECT_URI || '').trim()
    const refreshToken = (process.env.YOUTUBE_REFRESH_TOKEN || '').trim()

    if (!clientId || !clientSecret || !refreshToken) {
      console.log('[YouTube] Credentials not configured, skipping')
      return
    }

    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    oauth2Client.setCredentials({ refresh_token: refreshToken })

    const youtube = google.youtube('v3')

    const channelRes = await youtube.channels.list({
      auth: oauth2Client,
      part: ['contentDetails', 'snippet'],
      mine: true,
    })

    const channelTitle = channelRes.data.items?.[0]?.snippet?.title ?? "Jack Howlin'"
    const uploadsPlaylistId =
      channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
    if (!uploadsPlaylistId) {
      console.log('[YouTube] No uploads playlist found')
      return
    }

    const videosRes = await youtube.playlistItems.list({
      auth: oauth2Client,
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: 25,
    })

    for (const video of videosRes.data.items ?? []) {
      const videoId = video.snippet?.resourceId?.videoId
      const videoTitle = video.snippet?.title ?? 'Untitled Video'
      const description = video.snippet?.description ?? ''
      if (!videoId) continue

      const isShort =
        videoTitle.toLowerCase().includes('#short') ||
        description.toLowerCase().includes('#short') ||
        videoTitle.includes('#music')

      const sourceType = isShort ? 'short' : 'video'
      const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`

      try {
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

          const author = topComment.authorDisplayName ?? 'Unknown'
          // Filter out comments from the artist himself
          if (
            author.toLowerCase() === '@jackhowlin' ||
            author.toLowerCase() === 'jack howlin\'' ||
            author.toLowerCase() === channelTitle.toLowerCase()
          ) {
            continue
          }

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
            sourceUrl,
            sourceType,
            author,
            authorAvatar: topComment.authorProfileImageUrl ?? '',
            text: topComment.textDisplay ?? '',
            publishedAt: Timestamp.fromDate(new Date(topComment.publishedAt ?? Date.now())),
            fetchedAt: Timestamp.now(),
            status: 'new',
            generatedReplies: [],
            chosenReply: null,
          }

          const docRef = await db.collection('comments').add(commentDoc)
          console.log(`[YouTube] Saved comment ${docRef.id} from ${commentDoc.author} on "${videoTitle}"`)
        }
      } catch (err) {
        console.log(`[YouTube] No comments or error on video ${videoId}:`, err instanceof Error ? err.message : err)
      }
    }
  } catch (err) {
    console.error('[YouTube] Comment fetch error:', err)
  }
}

// ──────────────────────────────────────────────
// Instagram (Creator API via graph.instagram.com)
// ──────────────────────────────────────────────
export async function fetchInstagramComments(): Promise<void> {
  try {
    const token = (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()
    const userId = (process.env.INSTAGRAM_USER_ID || '').trim()

    if (!token || token === 'placeholder' || !userId || userId === 'placeholder') {
      console.log('[Instagram] Credentials not configured, skipping')
      return
    }

    const db = getDb()
    const BASE = 'https://graph.instagram.com/v21.0'

    // Get recent media (last 15 posts)
    const mediaRes = await fetch(
      `${BASE}/${userId}/media?fields=id,caption,media_type,permalink,timestamp&limit=15&access_token=${token}`
    )
    const mediaData = (await mediaRes.json()) as {
      data?: { id: string; caption?: string; media_type: string; permalink?: string; timestamp: string }[]
    }

    for (const media of mediaData.data ?? []) {
      const isReel = media.media_type === 'VIDEO'
      const sourceType = isReel ? 'reel' : 'post'
      const sourceUrl = media.permalink || `https://www.instagram.com/p/${media.id}`
      const postTitle = media.caption ? media.caption.substring(0, 75) + '...' : 'Instagram Post'

      // Fetch comments on this post
      const commentsRes = await fetch(
        `${BASE}/${media.id}/comments?fields=id,text,username,timestamp&limit=50&access_token=${token}`
      )
      const commentsData = (await commentsRes.json()) as {
        data?: { id: string; text: string; username: string; timestamp: string }[]
      }

      for (const comment of commentsData.data ?? []) {
        // Skip artist own comments
        if (comment.username?.toLowerCase() === 'jack_howlin_official') continue

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
          videoTitle: postTitle,
          sourceUrl,
          sourceType,
          author: `@${comment.username}`,
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
  } catch (err) {
    console.error('[Instagram] Comment fetch error:', err)
  }
}

// ──────────────────────────────────────────────
// Facebook Page
// ──────────────────────────────────────────────
export async function fetchFacebookComments(): Promise<void> {
  try {
    const token = (process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '').trim()
    const pageId = (process.env.FACEBOOK_PAGE_ID || '').trim()

    if (!token || token === 'placeholder' || !pageId || pageId === 'placeholder') {
      console.log('[Facebook] Credentials not configured, skipping')
      return
    }

    const db = getDb()
    const BASE = 'https://graph.facebook.com/v19.0'

    // Get last 15 Page posts
    const postsRes = await fetch(
      `${BASE}/${pageId}/posts?fields=id,message,permalink_url,created_time&limit=15&access_token=${token}`
    )
    const postsData = (await postsRes.json()) as {
      data?: { id: string; message?: string; permalink_url?: string; created_time: string }[]
    }

    for (const post of postsData.data ?? []) {
      const postTitle = post.message ? post.message.substring(0, 75) + '...' : 'Facebook Post'
      const sourceUrl = post.permalink_url || `https://www.facebook.com/${post.id}`

      // Fetch comments on this post
      const commentsRes = await fetch(
        `${BASE}/${post.id}/comments?fields=id,message,from,created_time&limit=50&access_token=${token}`
      )
      const commentsData = (await commentsRes.json()) as {
        data?: { id: string; message: string; from?: { name: string; id: string }; created_time: string }[]
      }

      for (const comment of commentsData.data ?? []) {
        // Skip page own comments
        if (comment.from?.name?.toLowerCase() === 'jack howlin\'' || comment.from?.id === pageId) continue

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
          videoTitle: postTitle,
          sourceUrl,
          sourceType: 'post',
          author: comment.from?.name ?? 'Facebook User',
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
  } catch (err) {
    console.error('[Facebook] Comment fetch error:', err)
  }
}
