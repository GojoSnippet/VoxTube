import { CommentWithEmbedding } from '../utils/embeddings'

interface FeelsViewProps {
  comments: CommentWithEmbedding[]
  totalComments?: number
  opacity?: number
}

/**
 * Format a number to YouTube-style display (e.g., 1.2K, 3M)
 */
function formatCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return count.toString()
}

/**
 * Format ISO date to relative time (e.g., "1 year ago")
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ]

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds)
    if (count >= 1) {
      return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`
    }
  }

  return 'just now'
}

/**
 * Generate a color based on username for avatar background (fallback)
 */
function getAvatarColor(name: string): string {
  const colors = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', 
    '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
    '#009688', '#4caf50', '#8bc34a', '#cddc39',
    '#ff9800', '#ff5722', '#795548', '#607d8b'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Format number with commas (e.g., 8713 -> "8,713")
 */
function formatWithCommas(num: number): string {
  return num.toLocaleString()
}

/**
 * Level 1: FEELS (Raw)
 * YouTube-style comment list
 */
export function FeelsView({ comments, totalComments, opacity = 1 }: FeelsViewProps) {
  const displayedCount = comments.length
  const total = totalComments || displayedCount

  return (
    <div className="feels-view" style={{ opacity }}>
      <div className="feels-container">
        <div className="yt-comments-header">
          <span className="yt-comments-count">
            {displayedCount} / {formatWithCommas(total)} Comments
          </span>
        </div>
        {comments.map((comment, index) => {
          const initial = comment.authorName?.charAt(0)?.toUpperCase() || '?'
          const avatarColor = getAvatarColor(comment.authorName || '')
          // Remove @ prefix if it already exists in authorName
          const displayName = comment.authorName?.startsWith('@') 
            ? comment.authorName 
            : `@${comment.authorName}`
          
          return (
            <div
              key={comment.id}
              className="yt-comment"
              style={{ animationDelay: `${index * 15}ms` }}
            >
              {comment.authorProfileImageUrl ? (
                <img 
                  src={comment.authorProfileImageUrl} 
                  alt={comment.authorName}
                  className="yt-comment-avatar-img"
                />
              ) : (
                <div 
                  className="yt-comment-avatar"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initial}
                </div>
              )}
              <div className="yt-comment-content">
                <div className="yt-comment-header">
                  <span className="yt-comment-author">{displayName}</span>
                  <span className="yt-comment-time">{formatTimeAgo(comment.publishedAt)}</span>
                </div>
                <div className="yt-comment-text">{comment.text}</div>
                {comment.likeCount > 0 && (
                  <div className="yt-comment-likes">
                    {formatCount(comment.likeCount)} likes
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FeelsView
