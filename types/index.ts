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
  likeCount?: number
  isLikedByCreator?: boolean
  isRepliedByCreator?: boolean
  creatorReplies?: string[]
  replyCount?: number
  isSuperfan?: boolean
  fanCommentCount?: number
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

export interface SyncState {
  lastSyncAt: Timestamp
  lastSyncStatus: 'success' | 'error'
  totalCommentsCount: number
  unrepliedCount: number
  repliedCount: number
  platforms: Partial<Record<Platform, { lastSyncAt: Timestamp; status: 'success' | 'error'; totalCount: number; error?: string }>>
}

export interface PersonaConfig {
  artistName: string
  genre: string
  bio: string
  toneGuidelines: string[]
  smartLinks: {
    spotify?: string
    youtubeMusic?: string
    appleMusic?: string
    website?: string
  }
  customInstructions: string
  updatedAt: Timestamp
}

export interface FanProfile {
  id: string
  author: string
  platform: Platform
  authorAvatar?: string
  commentCount: number
  firstCommentAt: Timestamp
  lastCommentAt: Timestamp
  isSuperfan: boolean
  recentComments: string[]
}

export interface ConnectionHealth {
  youtube: { connected: boolean; channelTitle?: string; channelId?: string; lastChecked?: Timestamp }
  instagram: { connected: boolean; username?: string; lastChecked?: Timestamp; expiresAt?: Timestamp }
  facebook: { connected: boolean; pageName?: string; lastChecked?: Timestamp }
  tiktok: { connected: boolean; status: string; lastChecked?: Timestamp }
}
