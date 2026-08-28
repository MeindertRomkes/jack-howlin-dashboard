import { initializeApp, getApps } from 'firebase-admin/app'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { fetchYouTubeComments } from './fetchComments'
import { generateRepliesForComment } from './generateReplies'
import { postScheduledContent } from './postScheduled'

if (!getApps().length) {
  initializeApp()
}

// Fetch YouTube comments every 30 minutes
export const fetchCommentsScheduled = onSchedule(
  {
    schedule: 'every 30 minutes',
    region: 'europe-west1',
    secrets: [
      'YOUTUBE_CLIENT_ID',
      'YOUTUBE_CLIENT_SECRET',
      'YOUTUBE_REDIRECT_URI',
      'YOUTUBE_REFRESH_TOKEN',
    ],
  },
  async () => {
    console.log('Running scheduled comment fetch...')
    await fetchYouTubeComments()
  }
)

// HTTP trigger for manual testing
export const fetchCommentsHttp = onRequest(
  {
    region: 'europe-west1',
    secrets: [
      'YOUTUBE_CLIENT_ID',
      'YOUTUBE_CLIENT_SECRET',
      'YOUTUBE_REDIRECT_URI',
      'YOUTUBE_REFRESH_TOKEN',
    ],
  },
  async (req, res) => {
    await fetchYouTubeComments()
    res.json({ success: true })
  }
)

// Generate AI replies when a new comment is created
export const onNewComment = onDocumentCreated(
  {
    document: 'comments/{commentId}',
    region: 'europe-west1',
    secrets: ['GEMINI_API_KEY'],
  },
  async (event) => {
    const commentId = event.params.commentId
    console.log(`New comment created: ${commentId}`)
    await generateRepliesForComment(commentId)
  }
)

// Publish scheduled posts every 5 minutes
export const postScheduledJob = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'europe-west1',
    secrets: [
      'YOUTUBE_CLIENT_ID',
      'YOUTUBE_CLIENT_SECRET',
      'YOUTUBE_REDIRECT_URI',
      'YOUTUBE_REFRESH_TOKEN',
    ],
  },
  async () => {
    console.log('Running scheduled post publisher...')
    await postScheduledContent()
  }
)

// HTTP trigger for manual testing
export const postScheduledHttp = onRequest(
  {
    region: 'europe-west1',
    secrets: [
      'YOUTUBE_CLIENT_ID',
      'YOUTUBE_CLIENT_SECRET',
      'YOUTUBE_REDIRECT_URI',
      'YOUTUBE_REFRESH_TOKEN',
    ],
  },
  async (req, res) => {
    await postScheduledContent()
    res.json({ success: true })
  }
)

