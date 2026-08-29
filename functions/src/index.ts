import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { fetchYouTubeComments, fetchInstagramComments, fetchFacebookComments } from './fetchComments'
import { generateRepliesForComment } from './generateReplies'
import { postScheduledContent } from './postScheduled'
import { refreshInstagramToken } from './refreshTokens'

const YOUTUBE_SECRETS = [
  'YOUTUBE_CLIENT_ID',
  'YOUTUBE_CLIENT_SECRET',
  'YOUTUBE_REDIRECT_URI',
  'YOUTUBE_REFRESH_TOKEN',
]

const COMMENTS_SECRETS = [
  ...YOUTUBE_SECRETS,
  'INSTAGRAM_ACCESS_TOKEN',
  'INSTAGRAM_USER_ID',
  'FACEBOOK_PAGE_ACCESS_TOKEN',
  'FACEBOOK_PAGE_ID',
]

const POSTING_SECRETS = [
  ...COMMENTS_SECRETS,
  'TIKTOK_ACCESS_TOKEN',
  'TIKTOK_OPEN_ID',
]

// ── Comments: fetch every 30 minutes ──────────────────────
export const fetchCommentsScheduled = onSchedule(
  {
    schedule: 'every 30 minutes',
    region: 'europe-west1',
    secrets: COMMENTS_SECRETS,
  },
  async () => {
    console.log('Running scheduled comment fetch...')
    await fetchYouTubeComments()
    await fetchInstagramComments()
    await fetchFacebookComments()
  }
)

// HTTP trigger for manual testing
export const fetchCommentsHttp = onRequest(
  {
    region: 'europe-west1',
    secrets: COMMENTS_SECRETS,
  },
  async (req, res) => {
    await fetchYouTubeComments()
    await fetchInstagramComments()
    await fetchFacebookComments()
    res.json({ success: true })
  }
)

// ── Generate AI replies ────────────────────────────────────
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

// ── Scheduled posting: every 5 minutes ────────────────────
export const postScheduledJob = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'europe-west1',
    secrets: POSTING_SECRETS,
    memory: '2GiB',
    timeoutSeconds: 540,
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

// ── Token refresh: daily at 03:00 ─────────────────────────
export const refreshTokensScheduled = onSchedule(
  {
    schedule: '0 3 * * *',
    region: 'europe-west1',
    secrets: ['INSTAGRAM_ACCESS_TOKEN'],
  },
  async () => {
    console.log('Running daily token refresh...')
    await refreshInstagramToken()
  }
)

// ── Analytics & Intelligence: daily at 04:00 ──────────────
import { aggregateAndStoreAnalytics } from './fetchAnalytics'

export const fetchAnalyticsScheduled = onSchedule(
  {
    schedule: '0 4 * * *',
    region: 'europe-west1',
    secrets: [...COMMENTS_SECRETS, 'GEMINI_API_KEY'],
  },
  async () => {
    console.log('Running daily analytics snapshot & intelligence analysis...')
    await aggregateAndStoreAnalytics()
  }
)

// HTTP trigger for manual testing
export const fetchAnalyticsHttp = onRequest(
  {
    region: 'europe-west1',
    secrets: [...COMMENTS_SECRETS, 'GEMINI_API_KEY'],
  },
  async (req, res) => {
    await aggregateAndStoreAnalytics()
    res.json({ success: true })
  }
)

