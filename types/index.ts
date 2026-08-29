import { Timestamp } from 'firebase/firestore'

export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'facebook'
export type CommentStatus = 'new' | 'replied' | 'ignored'
export type PostStatus = 'draft' | 'scheduled' | 'posted' | 'failed'

export interface Comment {
  id: string
  platform: Platform
  platformCommentId: string
  videoId: string
  videoTitle: string
  sourceUrl?: string
  sourceType?: 'video' | 'short' | 'reel' | 'post'
  author: string
  authorAvatar: string
  text: string
  publishedAt: Timestamp
  fetchedAt: Timestamp
  status: CommentStatus
  generatedReplies: string[]
  chosenReply: string | null
}

export interface Post {
  id: string
  platforms: Platform[]
  caption: string
  title?: string
  tags?: string[]
  mediaUrl: string | null
  mediaType: 'image' | 'video' | null
  scheduledAt: Timestamp
  status: PostStatus
  platformResults?: Record<string, { status: 'posted' | 'failed'; postId?: string; error?: string }>
  postedAt: Timestamp | null
  errorMessage: string | null
  createdAt: Timestamp
}

export interface VoiceHistory {
  id: string
  commentText: string
  chosenReply: string
  platform: Platform
  videoTitle: string
  timestamp: Timestamp
}

export interface UserProfile {
  email: string
  jackContext: string
  connectedPlatforms: Platform[]
}
