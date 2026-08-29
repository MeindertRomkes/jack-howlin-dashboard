export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'facebook'
export type CommentStatus = 'new' | 'replied' | 'ignored'
export type PostStatus = 'draft' | 'scheduled' | 'posted' | 'failed'

export interface CommentDoc {
  platform: Platform
  platformCommentId: string
  videoId: string
  videoTitle: string
  sourceUrl?: string
  sourceType?: 'video' | 'short' | 'reel' | 'post'
  author: string
  authorAvatar: string
  text: string
  publishedAt: FirebaseFirestore.Timestamp
  fetchedAt: FirebaseFirestore.Timestamp
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

export interface SyncStateDoc {
  lastSyncAt: FirebaseFirestore.Timestamp
  lastSyncStatus: 'success' | 'error'
  totalCommentsCount: number
  unrepliedCount: number
  repliedCount: number
  platforms: Partial<Record<Platform, { lastSyncAt: FirebaseFirestore.Timestamp; status: 'success' | 'error'; totalCount: number; error?: string }>>
}

export interface PersonaConfigDoc {
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
  updatedAt: FirebaseFirestore.Timestamp
}

export interface FanProfileDoc {
  author: string
  platform: Platform
  authorAvatar?: string
  commentCount: number
  firstCommentAt: FirebaseFirestore.Timestamp
  lastCommentAt: FirebaseFirestore.Timestamp
  isSuperfan: boolean
  recentComments: string[]
}

export interface ConnectionHealthDoc {
  youtube: { connected: boolean; channelTitle?: string; channelId?: string; lastChecked?: FirebaseFirestore.Timestamp }
  instagram: { connected: boolean; username?: string; lastChecked?: FirebaseFirestore.Timestamp; expiresAt?: FirebaseFirestore.Timestamp }
  facebook: { connected: boolean; pageName?: string; lastChecked?: FirebaseFirestore.Timestamp }
  tiktok: { connected: boolean; status: string; lastChecked?: FirebaseFirestore.Timestamp }
}
