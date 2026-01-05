import { ThumbsUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommentCardProps {
  authorName: string
  authorImage?: string
  text: string
  likeCount?: number
  timeAgo?: string
  className?: string
}

function formatCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return count.toString()
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-red-500', 'bg-pink-500', 'bg-purple-500', 'bg-indigo-500',
    'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-green-500',
    'bg-yellow-500', 'bg-orange-500'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function CommentCard({
  authorName,
  authorImage,
  text,
  likeCount,
  timeAgo,
  className,
}: CommentCardProps) {
  const displayName = authorName?.startsWith('@') ? authorName : `@${authorName}`
  const initial = authorName?.charAt(0)?.toUpperCase() || '?'

  return (
    <div className={cn('flex gap-3', className)}>
      {authorImage ? (
        <img
          src={authorImage}
          alt={authorName}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0',
            getAvatarColor(authorName || '')
          )}
        >
          {initial}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">{displayName}</span>
          {timeAgo && <span className="text-xs text-zinc-500">{timeAgo}</span>}
        </div>
        <p className="text-sm text-zinc-300 break-words">{text}</p>
        {likeCount !== undefined && likeCount > 0 && (
          <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
            <ThumbsUp className="w-3 h-3" />
            {formatCount(likeCount)}
          </div>
        )}
      </div>
    </div>
  )
}
