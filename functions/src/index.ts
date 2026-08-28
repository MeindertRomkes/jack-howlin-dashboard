import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import { fetchYouTubeComments } from './fetchComments'

admin.initializeApp()

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
