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
      part: ['id', 'contentDetails', 'snippet'],
      mine: true,
    })

    const myChannelId = channelRes.data.items?.[0]?.id ?? ''
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
          part: ['snippet', 'replies'],
          videoId,
          maxResults: 50,
          order: 'time',
        })

        for (const item of commentsRes.data.items ?? []) {
          const topComment = item.snippet?.topLevelComment?.snippet
          if (!topComment) continue

          const author = topComment.authorDisplayName ?? 'Unknown'
          // Filter out top-level comments posted by the artist himself
          if (
            author.toLowerCase() === '@jackhowlin' ||
            author.toLowerCase() === 'jack howlin\'' ||
            author.toLowerCase() === channelTitle.toLowerCase()
          ) {
            continue
          }

          const platformCommentId = item.id!
          const likeCount = topComment.likeCount ?? 0
          const isLikedByCreator = topComment.viewerRating === 'like'
          const replyCount = item.snippet?.totalReplyCount ?? 0

          // Check if Jack Howlin' replied to this comment thread
          const threadReplies = item.replies?.comments ?? []
          const creatorRepliesText: string[] = []
          for (const reply of threadReplies) {
            const rSnippet = reply.snippet
            if (!rSnippet) continue
            const rAuthor = rSnippet.authorDisplayName ?? ''
            const rChannelId = rSnippet.authorChannelId?.value ?? ''
            if (
              rChannelId === myChannelId ||
              rAuthor.toLowerCase() === channelTitle.toLowerCase() ||
              rAuthor.toLowerCase() === '@jackhowlin' ||
              rAuthor.toLowerCase() === 'jack howlin\''
            ) {
              if (rSnippet.textDisplay) creatorRepliesText.push(rSnippet.textDisplay)
            }
          }

          const isRepliedByCreator = creatorRepliesText.length > 0

          const existing = await db
            .collection('comments')
            .where('platformCommentId', '==', platformCommentId)
            .limit(1)
            .get()

          if (!existing.empty) {
            // Update existing comment's live stats (likes & replied status)
            const docId = existing.docs[0].id
            const existingData = existing.docs[0].data() as CommentDoc
            await db.collection('comments').doc(docId).update({
              likeCount,
              isLikedByCreator,
              isRepliedByCreator,
              creatorReplies: creatorRepliesText,
              replyCount,
              sourceUrl,
              sourceType,
              // If Jack already replied natively on YouTube, mark as replied if it was new
              status: isRepliedByCreator && existingData.status === 'new' ? 'replied' : existingData.status,
              chosenReply: isRepliedByCreator && !existingData.chosenReply ? creatorRepliesText[0] : existingData.chosenReply,
            })
            continue
          }

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
            status: isRepliedByCreator ? 'replied' : 'new',
            generatedReplies: [],
            chosenReply: isRepliedByCreator ? creatorRepliesText[0] : null,
            likeCount,
            isLikedByCreator,
            isRepliedByCreator,
            creatorReplies: creatorRepliesText,
            replyCount,
          }

          const docRef = await db.collection('comments').add(commentDoc)
          console.log(`[YouTube] Saved comment ${docRef.id} from ${commentDoc.author} on "${videoTitle}" (Likes: ${likeCount}, Liked: ${isLikedByCreator}, Replied: ${isRepliedByCreator})`)
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
        `${BASE}/${media.id}/comments?fields=id,text,username,like_count,timestamp,replies{id,text,username}&limit=50&access_token=${token}`
      )
      const commentsData = (await commentsRes.json()) as {
        data?: { id: string; text: string; username: string; like_count?: number; timestamp: string; replies?: { data: { id: string; text: string; username: string }[] } }[]
      }

      for (const comment of commentsData.data ?? []) {
        if (comment.username?.toLowerCase() === 'jack_howlin_official') continue

        const likeCount = comment.like_count ?? 0
        const replies = comment.replies?.data ?? []
        const creatorReplies = replies
          .filter(r => r.username?.toLowerCase() === 'jack_howlin_official')
          .map(r => r.text)
        const isRepliedByCreator = creatorReplies.length > 0

        const existing = await db
          .collection('comments')
          .where('platformCommentId', '==', comment.id)
          .limit(1)
          .get()

        if (!existing.empty) {
          const docId = existing.docs[0].id
          const existingData = existing.docs[0].data() as CommentDoc
          await db.collection('comments').doc(docId).update({
            likeCount,
            isRepliedByCreator,
            creatorReplies,
            replyCount: replies.length,
            sourceUrl,
            sourceType,
            status: isRepliedByCreator && existingData.status === 'new' ? 'replied' : existingData.status,
            chosenReply: isRepliedByCreator && !existingData.chosenReply ? creatorReplies[0] : existingData.chosenReply,
          })
          continue
        }

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
          status: isRepliedByCreator ? 'replied' : 'new',
          generatedReplies: [],
          chosenReply: isRepliedByCreator ? creatorReplies[0] : null,
          likeCount,
          isLikedByCreator: false,
          isRepliedByCreator,
          creatorReplies,
          replyCount: replies.length,
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
        `${BASE}/${post.id}/comments?fields=id,message,from,like_count,created_time,comments{id,message,from}&limit=50&access_token=${token}`
      )
      const commentsData = (await commentsRes.json()) as {
        data?: { id: string; message: string; from?: { name: string; id: string }; like_count?: number; created_time: string; comments?: { data: { id: string; message: string; from?: { name: string; id: string } }[] } }[]
      }

      for (const comment of commentsData.data ?? []) {
        if (comment.from?.name?.toLowerCase() === 'jack howlin\'' || comment.from?.id === pageId) continue

        const likeCount = comment.like_count ?? 0
        const subComments = comment.comments?.data ?? []
        const creatorReplies = subComments
          .filter(r => r.from?.id === pageId || r.from?.name?.toLowerCase() === 'jack howlin\'')
          .map(r => r.message)
        const isRepliedByCreator = creatorReplies.length > 0

        const existing = await db
          .collection('comments')
          .where('platformCommentId', '==', comment.id)
          .limit(1)
          .get()

        if (!existing.empty) {
          const docId = existing.docs[0].id
          const existingData = existing.docs[0].data() as CommentDoc
          await db.collection('comments').doc(docId).update({
            likeCount,
            isRepliedByCreator,
            creatorReplies,
            replyCount: subComments.length,
            sourceUrl,
            sourceType: 'post',
            status: isRepliedByCreator && existingData.status === 'new' ? 'replied' : existingData.status,
            chosenReply: isRepliedByCreator && !existingData.chosenReply ? creatorReplies[0] : existingData.chosenReply,
          })
          continue
        }

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
          status: isRepliedByCreator ? 'replied' : 'new',
          generatedReplies: [],
          chosenReply: isRepliedByCreator ? creatorReplies[0] : null,
          likeCount,
          isLikedByCreator: false,
          isRepliedByCreator,
          creatorReplies,
          replyCount: subComments.length,
        }

        const docRef = await db.collection('comments').add(commentDoc)
        console.log(`[Facebook] Saved comment ${docRef.id} from ${comment.from?.name}`)
      }
    }
  } catch (err) {
    console.error('[Facebook] Comment fetch error:', err)
  }
}
