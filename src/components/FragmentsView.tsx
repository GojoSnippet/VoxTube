import { CommentWithEmbedding } from '../utils/embeddings'
import { ClusterResult } from '../utils/clustering'

interface FragmentsViewProps {
  comments: CommentWithEmbedding[]
  clusterResult: ClusterResult
  opacity?: number
}

// Color palette for visual grouping (subtle, unlabeled)
const FRAGMENT_COLORS = [
  'rgba(99, 102, 241, 0.08)',   // indigo
  'rgba(236, 72, 153, 0.08)',   // pink
  'rgba(34, 197, 94, 0.08)',    // green
  'rgba(251, 146, 60, 0.08)',   // orange
  'rgba(59, 130, 246, 0.08)',   // blue
  'rgba(168, 85, 247, 0.08)',   // purple
  'rgba(20, 184, 166, 0.08)',   // teal
  'rgba(244, 63, 94, 0.08)',    // rose
]

/**
 * Level 2: FRAGMENTS (Grouped, Unlabeled)
 * Comments visually "magnetize" into clusters
 * No labels - just spatial proximity
 */
export function FragmentsView({ comments, clusterResult, opacity = 1 }: FragmentsViewProps) {
  const { clusters } = clusterResult

  // Group comments by cluster
  const groupedComments = clusters.map(cluster => ({
    ...cluster,
    comments: cluster.commentIndices.map(i => comments[i]).filter(Boolean)
  }))

  return (
    <div className="fragments-view" style={{ opacity }}>
      <div className="fragments-container">
        {groupedComments.map((group, groupIndex) => (
          <div
            key={group.id}
            className="fragment-group"
            style={{
              backgroundColor: FRAGMENT_COLORS[groupIndex % FRAGMENT_COLORS.length],
              animationDelay: `${groupIndex * 100}ms`
            }}
          >
            {group.comments.map((comment, i) => (
              <div
                key={comment.id}
                className="fragment-comment"
                style={{ animationDelay: `${groupIndex * 100 + i * 30}ms` }}
              >
                <span className="fragment-text">{comment.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default FragmentsView

