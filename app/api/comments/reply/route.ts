import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    const { platformCommentId, reply, platform, alsoLike, commentId } =
      (await req.json()) as {
        platformCommentId: string
        reply: string
        platform?: string
        alsoLike?: boolean
        commentId?: string
      }

    const plat = (platform || 'youtube').toLowerCase()

    if (plat === 'youtube') {
      const clientId = process.env.YOUTUBE_CLIENT_ID?.trim()
      const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim()
      const redirectUri = process.env.YOUTUBE_REDIRECT_URI?.trim()
      const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN?.trim()

      if (clientId && clientSecret && refreshToken) {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
        oauth2Client.setCredentials({ refresh_token: refreshToken })
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client })

        await youtube.comments.insert({
          part: ['snippet'],
          requestBody: {
            snippet: {
              parentId: platformCommentId,
              textOriginal: reply,
            },
          },
        })
      }
    } else if (plat === 'instagram' || plat === 'facebook') {
      const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim()
      if (pageToken) {
        const endpoint =
          plat === 'instagram'
            ? `https://graph.facebook.com/v21.0/${platformCommentId}/replies`
            : `https://graph.facebook.com/v21.0/${platformCommentId}/comments`

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: reply,
            access_token: pageToken,
          }),
        })

        const resJson = await res.json()
        if (resJson.error) {
          console.error(`[${plat}] Reply API error:`, resJson.error)
        }
      }
    }

    // If alsoLike is requested and commentId exists, mark as liked in DB
    if (alsoLike && commentId) {
      try {
        const docRef = adminDb.collection('comments').doc(commentId)
        const docSnap = await docRef.get()
        if (docSnap.exists) {
          const curData = docSnap.data()!
          const curLikes = curData.likeCount || 0
          await docRef.update({
            isLikedByCreator: true,
            likeCount: curData.isLikedByCreator ? curLikes : curLikes + 1,
            likedAt: FieldValue.serverTimestamp(),
          })
        }
      } catch (likeErr) {
        console.error('Failed to auto-like comment in DB:', likeErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to post reply:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to post reply' },
      { status: 500 }
    )
  }
}
