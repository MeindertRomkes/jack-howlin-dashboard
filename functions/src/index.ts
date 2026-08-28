import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { fetchYouTubeComments } from './fetchComments'
import { generateRepliesForComment } from './generateReplies'
import { postScheduledContent } from './postScheduled'

const YOUTUBE_SECRETS = [
  'YOUTUBE_CLIENT_ID',
  'YOUTUBE_CLIENT_SECRET',
  'YOUTUBE_REDIRECT_URI',
  'YOUTUBE_REFRESH_TOKEN',
]

const POSTING_SECRETS = [
  ...YOUTUBE_SECRETS,
  'INSTAGRAM_ACCESS_TOKEN',
  'INSTAGRAM_USER_ID',
  'TIKTOK_ACCESS_TOKEN',
  'FACEBOOK_PAGE_ACCESS_TOKEN',
  'FACEBOOK_PAGE_ID',
]

// Fetch YouTube comments every 30 minutes
export const fetchCommentsScheduled = onSchedule(
  {
    schedule: 'every 30 minutes',
    region: 'europe-west1',
    secrets: YOUTUBE_SECRETS,
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
    secrets: YOUTUBE_SECRETS,
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
// Higher memory + timeout to handle video uploads to YouTube
export const postScheduledJob = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'europe-west1',
    secrets: POSTING_SECRETS,
    memory: '2GiB',
    timeoutSeconds: 540, // 9 minutes — max for scheduled functions
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
    secrets: POSTING_SECRETS,
    memory: '2GiB',
    timeoutSeconds: 540,
  },
  async (req, res) => {
    await postScheduledContent()
    res.json({ success: true })
  }
)
