export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'facebook'
export type CommentStatus = 'new' | 'replied' | 'ignored'

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
}
