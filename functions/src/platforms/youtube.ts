import { google } from 'googleapis'
import { Readable } from 'stream'

interface YouTubePostResult {
  videoId: string
}

export async function postToYouTube(
  mediaUrl: string,
  title: string,
  description: string,
  tags: string[]
): Promise<YouTubePostResult> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  )
  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
  })

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client })

  // Download media from Firebase Storage URL
  const response = await fetch(mediaUrl)
  if (!response.ok) throw new Error(`Failed to fetch media: ${response.status}`)
  const buffer = await response.arrayBuffer()
  const readable = Readable.from(Buffer.from(buffer))

  const uploadResponse = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description,
        tags,
        categoryId: '10', // Music category
        defaultLanguage: 'nl',
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: readable,
    },
  })

  const videoId = uploadResponse.data.id
  if (!videoId) throw new Error('YouTube upload returned no videoId')
  return { videoId }
}
