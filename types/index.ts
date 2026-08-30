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
  timestamp: any
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

export interface TrackPerformance {
  trackId: string
  title: string
  album?: string
  releaseDate?: string
  spotifyUrl?: string
  popularity: number // 0-100 score from Spotify API
  estimatedStreams?: number
  weeklyGrowthPercent?: number
  topPlatformHook?: string
  keyLyricLine?: string
}

export interface PlatformMetricOverview {
  totalViews?: number
  videoCount?: number
  shortsViews?: number
  longformViews?: number
  avgWatchPercentage?: number
  totalComments?: number
  totalLikes?: number
  followers?: number
  reach?: number
  shares?: number
  saves?: number
  engagementRate?: number
}

export interface AnalyticsSnapshot {
  id?: string
  timestamp: any
  period: 'daily' | 'weekly' | 'manual'
  totalCrossPlatformViews: number
  totalCommentsCount: number
  youtube: PlatformMetricOverview & {
    channelTitle?: string
    topVideos?: Array<{
      videoId: string
      title: string
      views: number
      likes: number
      comments: number
      isShort?: boolean
      retentionScore?: number
    }>
  }
  spotify: {
    artistName: string
    monthlyListeners: number
    followers: number
    topTracks: TrackPerformance[]
  }
  instagram: PlatformMetricOverview
  tiktok: PlatformMetricOverview
  facebook?: PlatformMetricOverview
}

export interface ActionablePlaybookItem {
  id: string
  type: 'song_release' | 'merch_push' | 'lyric_short' | 'fan_reengage'
  title: string
  targetTrack?: string
  reason: string
  recommendedHook: string
  suggestedPlatforms: Platform[]
  priority: 'high' | 'medium' | 'low'
  actionPayload?: {
    caption?: string
    suggestedFormat?: string
    smartLink?: string
  }
}

export interface IntelligenceReport {
  id?: string
  generatedAt: any
  summary: string
  winningHooks: Array<{
    hookTitle: string
    description: string
    effectivenessMultiplier: string
    exampleScene: string
  }>
  contentFatigueAlerts: string[]
  bestPostingWindows: Array<{
    platform: Platform
    bestDay: string
    bestTime: string
    reason: string
  }>
  trackMomentumRadar: Array<{
    trackTitle: string
    momentumStatus: 'surging' | 'steady' | 'needs_boost'
    growthNote: string
    actionRecommendation: string
  }>
  actionablePlaybooks: ActionablePlaybookItem[]
}

// ─── AI Content Studio ───────────────────────────────────────────────────────

export type KieModel = 'photo' | 'video'
export type KieState = 'waiting' | 'success' | 'fail'

export interface KieJob {
  id: string
  taskId: string
  model: KieModel
  kieModel: string
  state: KieState
  prompt: string
  aspectRatio: string
  resultUrls: string[]
  linkedPostId?: string
  failMsg?: string
  createdAt: Timestamp
  completedAt?: Timestamp
}

export interface MediaAsset {
  id: string
  url: string
  type: 'image' | 'video'
  prompt: string
  kieJobId: string
  linkedPostId?: string
  createdAt: Timestamp
}

export interface SunoTrack {
  id: string
  name: string
  storageUrl: string
  publicUrl: string
  durationSeconds?: number
  createdAt: Timestamp
  // Release metadata
  releaseType: 'single' | 'album'
  releaseStatus?: 'released' | 'upcoming'  // for singles: already out vs planned
  albumName?: string        // e.g. "The Silent Cowboy" (only for album tracks)
  trackNumber?: number      // track position in album
  releaseYear?: number      // e.g. 2025
  albumCoverUrl?: string    // optional album art image URL
}

export interface JackCoreSetPhoto {
  id: string
  label: string
  storageUrl: string
  publicUrl: string
  order: number
  createdAt: Timestamp
}
