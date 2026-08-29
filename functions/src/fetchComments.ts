import { getDb } from './admin'
import { Timestamp } from 'firebase-admin/firestore'
import type { CommentDoc, SyncStateDoc, FanProfileDoc } from './types'

// Helper to update Fan Profile in Firestore
async function updateFanProfile(
  db: FirebaseFirestore.Firestore,
  author: string,
  platform: 'youtube' | 'instagram' | 'facebook' | 'tiktok',
  authorAvatar: string,
  commentText: string,
  commentDate: Date
): Promise<{ isSuperfan: boolean; commentCount: number }> {
  try {
    const fanDocId = `${platform}_${author.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    const fanRef = db.collection('fans').doc(fanDocId)
    const fanSnap = await fanRef.get()

    if (fanSnap.exists) {
      const fanData = fanSnap.data() as FanProfileDoc
      const count = (fanData.commentCount || 1) + 1
      const isSuperfan = count >= 2
      const recentComments = [commentText, ...(fanData.recentComments || [])].slice(0, 5)

      await fanRef.update({
        commentCount: count,
        lastCommentAt: Timestamp.fromDate(commentDate),
        isSuperfan,
        authorAvatar: authorAvatar || fanData.authorAvatar || '',
        recentComments,
      })
      return { isSuperfan, commentCount: count }
    } else {
      const profile: FanProfileDoc = {
        author,
        platform,
        authorAvatar,
        commentCount: 1,
        firstCommentAt: Timestamp.fromDate(commentDate),
        lastCommentAt: Timestamp.fromDate(commentDate),
        isSuperfan: false,
        recentComments: [commentText],
      }
      await fanRef.set(profile)
      return { isSuperfan: false, commentCount: 1 }
    }
  } catch (err) {
    console.error(`[Fan CRM] Error updating fan profile for ${author}:`, err)
    return { isSuperfan: false, commentCount: 1 }
  }
}

// ──────────────────────────────────────────────
// YouTube
// ──────────────────────────────────────────────
export async function fetchYouTubeComments(): Promise<void> {
  const db = getDb()
  let ytStatus: 'success' | 'error' = 'success'
  let ytError: string | undefined = undefined
  let ytCount = 0

  try {
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
      part: ['id', 'snippet'],
      mine: true,
    })

    const myChannelId = channelRes.data.items?.[0]?.id ?? ''
    const channelTitle = channelRes.data.items?.[0]?.snippet?.title ?? "Jack Howlin'"

    if (!myChannelId) {
      console.log('[YouTube] Channel not found')
      return
    }

    // Update connection health
    await db.collection('settings').doc('connections').set(
      {
        youtube: {
          connected: true,
          channelTitle,
          channelId: myChannelId,
          lastChecked: Timestamp.now(),
        },
      },
      { merge: true }
    )

    // Video metadata cache to avoid redundant API calls
    const videoMetadataCache = new Map<string, { title: string; sourceType: 'video' | 'short' }>()

    async function getVideoMetadata(videoId: string): Promise<{ title: string; sourceType: 'video' | 'short' }> {
      if (videoMetadataCache.has(videoId)) {
        return videoMetadataCache.get(videoId)!
      }
      try {
        const vRes = await youtube.videos.list({
          auth: oauth2Client,
          part: ['snippet'],
          id: [videoId],
        })
        const item = vRes.data.items?.[0]
        const title = item?.snippet?.title ?? 'YouTube Video'
        const desc = item?.snippet?.description ?? ''
        const isShort =
          title.toLowerCase().includes('#short') ||
          desc.toLowerCase().includes('#short') ||
          title.includes('#music')
        const meta = { title, sourceType: isShort ? ('short' as const) : ('video' as const) }
        videoMetadataCache.set(videoId, meta)
        return meta
      } catch {
        const fallback = { title: 'YouTube Video', sourceType: 'video' as const }
        videoMetadataCache.set(videoId, fallback)
        return fallback
      }
    }

    // Fetch ALL comment threads related to the channel with pagination
    let pageToken: string | undefined = undefined
    let totalProcessed = 0

    while (true) {
      const threadsRes: any = await youtube.commentThreads.list({
        auth: oauth2Client,
        part: ['snippet', 'replies'],
        allThreadsRelatedToChannelId: myChannelId,
        maxResults: 100,
        pageToken,
      })

      const items = threadsRes.data.items ?? []

      for (const item of items) {
        const topComment = item.snippet?.topLevelComment?.snippet
        if (!topComment) continue

        const author = topComment.authorDisplayName ?? 'Unknown'
        // Filter out top-level comments posted by the artist himself
        if (
          author.toLowerCase() === '@jackhowlin' ||
          author.toLowerCase() === 'jack howlin\'' ||
          author.toLowerCase() === channelTitle.toLowerCase() ||
          topComment.authorChannelId?.value === myChannelId
        ) {
          continue
        }

        const platformCommentId = item.id!
        const videoId = item.snippet?.videoId ?? ''
        const { title: videoTitle, sourceType } = videoId
          ? await getVideoMetadata(videoId)
          : { title: 'Channel Comment', sourceType: 'video' as const }

        const sourceUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : `https://www.youtube.com/channel/${myChannelId}`
        const likeCount = topComment.likeCount ?? 0
        const isLikedByCreator = topComment.viewerRating === 'like'
        const replyCount = item.snippet?.totalReplyCount ?? 0
        const commentDate = new Date(topComment.publishedAt ?? Date.now())

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

        // Fan CRM tracking
        const { isSuperfan, commentCount: fanCount } = await updateFanProfile(
          db,
          author,
          'youtube',
          topComment.authorProfileImageUrl ?? '',
          topComment.textDisplay ?? '',
          commentDate
        )

        const existing = await db
          .collection('comments')
          .where('platformCommentId', '==', platformCommentId)
          .limit(1)
          .get()

        if (!existing.empty) {
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
            videoTitle,
            isSuperfan,
            fanCommentCount: fanCount,
            status: isRepliedByCreator && existingData.status === 'new' ? 'replied' : existingData.status,
            chosenReply: isRepliedByCreator && !existingData.chosenReply ? creatorRepliesText[0] : existingData.chosenReply,
          })
          totalProcessed++
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
          publishedAt: Timestamp.fromDate(commentDate),
          fetchedAt: Timestamp.now(),
          status: isRepliedByCreator ? 'replied' : 'new',
          generatedReplies: [],
          chosenReply: isRepliedByCreator ? creatorRepliesText[0] : null,
          likeCount,
          isLikedByCreator,
          isRepliedByCreator,
          creatorReplies: creatorRepliesText,
          replyCount,
          isSuperfan,
          fanCommentCount: fanCount,
        }

        const docRef = await db.collection('comments').add(commentDoc)
        totalProcessed++
        console.log(`[YouTube] Ingested comment ${docRef.id} from ${commentDoc.author} on "${videoTitle}" (Superfan: ${isSuperfan})`)
      }

      pageToken = threadsRes.data?.nextPageToken
      if (!pageToken) break
    }

    ytCount = totalProcessed
    console.log(`[YouTube] Total historical comments processed: ${totalProcessed}`)
  } catch (err) {
    ytStatus = 'error'
    ytError = err instanceof Error ? err.message : String(err)
    console.error('[YouTube] Comment fetch error:', err)
  }

  // Update Global Sync State in Firestore
  await updateGlobalSyncState(db, 'youtube', ytStatus, ytCount, ytError)
}

// ──────────────────────────────────────────────
// Instagram (Creator API via graph.instagram.com)
// ──────────────────────────────────────────────
export async function fetchInstagramComments(): Promise<void> {
  const db = getDb()
  let instaStatus: 'success' | 'error' = 'success'
  let instaError: string | undefined = undefined
  let instaCount = 0

  try {
    const token = (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()
    const userId = (process.env.INSTAGRAM_USER_ID || '').trim()

    if (!token || token === 'placeholder' || !userId || userId === 'placeholder') {
      console.log('[Instagram] Credentials not configured, skipping')
      return
    }

    const BASE = 'https://graph.instagram.com/v21.0'

    // Update connection health
    await db.collection('settings').doc('connections').set(
      {
        instagram: {
          connected: true,
          username: 'jack_howlin_official',
          lastChecked: Timestamp.now(),
        },
      },
      { merge: true }
    )

    // Get recent media (last 25 posts)
    const mediaRes = await fetch(
      `${BASE}/${userId}/media?fields=id,caption,media_type,permalink,timestamp&limit=25&access_token=${token}`
    )
    const mediaData = (await mediaRes.json()) as {
      data?: { id: string; caption?: string; media_type: string; permalink?: string; timestamp: string }[]
    }

    for (const media of mediaData.data ?? []) {
      const isReel = media.media_type === 'VIDEO'
      const sourceType = isReel ? 'reel' : 'post'
      const sourceUrl = media.permalink || `https://www.instagram.com/p/${media.id}`
      const postTitle = media.caption ? media.caption.substring(0, 75) + '...' : 'Instagram Post'

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
        const commentDate = new Date(comment.timestamp)

        const { isSuperfan, commentCount: fanCount } = await updateFanProfile(
          db,
          `@${comment.username}`,
          'instagram',
          '',
          comment.text,
          commentDate
        )

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
            isSuperfan,
            fanCommentCount: fanCount,
            status: isRepliedByCreator && existingData.status === 'new' ? 'replied' : existingData.status,
            chosenReply: isRepliedByCreator && !existingData.chosenReply ? creatorReplies[0] : existingData.chosenReply,
          })
          instaCount++
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
          publishedAt: Timestamp.fromDate(commentDate),
          fetchedAt: Timestamp.now(),
          status: isRepliedByCreator ? 'replied' : 'new',
          generatedReplies: [],
          chosenReply: isRepliedByCreator ? creatorReplies[0] : null,
          likeCount,
          isLikedByCreator: false,
          isRepliedByCreator,
          creatorReplies,
          replyCount: replies.length,
          isSuperfan,
          fanCommentCount: fanCount,
        }

        const docRef = await db.collection('comments').add(commentDoc)
        instaCount++
        console.log(`[Instagram] Saved comment ${docRef.id} from @${comment.username}`)
      }
    }
  } catch (err) {
    instaStatus = 'error'
    instaError = err instanceof Error ? err.message : String(err)
    console.error('[Instagram] Comment fetch error:', err)
  }

  await updateGlobalSyncState(db, 'instagram', instaStatus, instaCount, instaError)
}

// ──────────────────────────────────────────────
// Facebook Page
// ──────────────────────────────────────────────
export async function fetchFacebookComments(): Promise<void> {
  const db = getDb()
  let fbStatus: 'success' | 'error' = 'success'
  let fbError: string | undefined = undefined
  let fbCount = 0

  try {
    const token = (process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '').trim()
    const pageId = (process.env.FACEBOOK_PAGE_ID || '').trim()

    if (!token || token === 'placeholder' || !pageId || pageId === 'placeholder') {
      console.log('[Facebook] Credentials not configured, skipping')
      return
    }

    const BASE = 'https://graph.facebook.com/v19.0'

    // Update connection health
    await db.collection('settings').doc('connections').set(
      {
        facebook: {
          connected: true,
          pageName: "Jack Howlin'",
          lastChecked: Timestamp.now(),
        },
      },
      { merge: true }
    )

    // Get last 25 Page posts
    const postsRes = await fetch(
      `${BASE}/${pageId}/posts?fields=id,message,permalink_url,created_time&limit=25&access_token=${token}`
    )
    const postsData = (await postsRes.json()) as {
      data?: { id: string; message?: string; permalink_url?: string; created_time: string }[]
    }

    for (const post of postsData.data ?? []) {
      const postTitle = post.message ? post.message.substring(0, 75) + '...' : 'Facebook Post'
      const sourceUrl = post.permalink_url || `https://www.facebook.com/${post.id}`

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
        const commentDate = new Date(comment.created_time)

        const { isSuperfan, commentCount: fanCount } = await updateFanProfile(
          db,
          comment.from?.name ?? 'Facebook User',
          'facebook',
          '',
          comment.message,
          commentDate
        )

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
            isSuperfan,
            fanCommentCount: fanCount,
            status: isRepliedByCreator && existingData.status === 'new' ? 'replied' : existingData.status,
            chosenReply: isRepliedByCreator && !existingData.chosenReply ? creatorReplies[0] : existingData.chosenReply,
          })
          fbCount++
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
          publishedAt: Timestamp.fromDate(commentDate),
          fetchedAt: Timestamp.now(),
          status: isRepliedByCreator ? 'replied' : 'new',
          generatedReplies: [],
          chosenReply: isRepliedByCreator ? creatorReplies[0] : null,
          likeCount,
          isLikedByCreator: false,
          isRepliedByCreator,
          creatorReplies,
          replyCount: subComments.length,
          isSuperfan,
          fanCommentCount: fanCount,
        }

        const docRef = await db.collection('comments').add(commentDoc)
        fbCount++
        console.log(`[Facebook] Saved comment ${docRef.id} from ${comment.from?.name}`)
      }
    }
  } catch (err) {
    fbStatus = 'error'
    fbError = err instanceof Error ? err.message : String(err)
    console.error('[Facebook] Comment fetch error:', err)
  }

  await updateGlobalSyncState(db, 'facebook', fbStatus, fbCount, fbError)
}

// ──────────────────────────────────────────────
// Global Sync State Aggregator
// ──────────────────────────────────────────────
async function updateGlobalSyncState(
  db: FirebaseFirestore.Firestore,
  platform: 'youtube' | 'instagram' | 'facebook' | 'tiktok',
  status: 'success' | 'error',
  count: number,
  error?: string
): Promise<void> {
  try {
    const allCommentsSnap = await db.collection('comments').get()
    const totalCommentsCount = allCommentsSnap.size
    let unrepliedCount = 0
    let repliedCount = 0

    allCommentsSnap.forEach(doc => {
      const d = doc.data() as CommentDoc
      if (d.status === 'new' && !d.isRepliedByCreator) {
        unrepliedCount++
      } else if (d.status === 'replied' || d.isRepliedByCreator) {
        repliedCount++
      }
    })

    const syncStateRef = db.collection('system').doc('sync_state')
    const updateData: Partial<SyncStateDoc> = {
      lastSyncAt: Timestamp.now(),
      lastSyncStatus: status,
      totalCommentsCount,
      unrepliedCount,
      repliedCount,
    }

    const platformUpdate: Record<string, any> = {
      ...updateData,
      [`platforms.${platform}`]: {
        lastSyncAt: Timestamp.now(),
        status,
        totalCount: count,
        ...(error ? { error } : {}),
      },
    }

    await syncStateRef.set(platformUpdate, { merge: true })
    console.log(`[Sync State] Updated system/sync_state -> Total: ${totalCommentsCount}, Unreplied: ${unrepliedCount}, Replied: ${repliedCount}`)
  } catch (err) {
    console.error('[Sync State] Error updating sync state:', err)
  }
}
