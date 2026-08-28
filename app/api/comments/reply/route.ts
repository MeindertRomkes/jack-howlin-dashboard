import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(req: NextRequest) {
  try {
    const { platformCommentId, reply } = (await req.json()) as {
      platformCommentId: string
      reply: string
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    )
    oauth2Client.setCredentials({
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    })

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

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to post YouTube reply:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to post reply' },
      { status: 500 }
    )
  }
}
