import { useState } from 'react'
import { CommentWithEmbedding } from '../utils/embeddings'
import { ClusterResult } from '../utils/clustering'
import { ClusterName } from '../utils/llm'

interface ClustersViewProps {
  comments: CommentWithEmbedding[]
  clusterResult: ClusterResult
  clusterNames: ClusterName[]
  opacity?: number
}

// Cluster halo colors
const CLUSTER_COLORS = [
  { bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.3)' },
  { bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.3)' },
  { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)' },
  { bg: 'rgba(251, 146, 60, 0.12)', border: 'rgba(251, 146, 60, 0.3)' },
  { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' },
  { bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)' },
  { bg: 'rgba(20, 184, 166, 0.12)', border: 'rgba(20, 184, 166, 0.3)' },
]

/**
 * Level 3: CLUSTERS (Soft-Named)
 * Cluster halos with soft labels
 * Click to expand and see raw comments
 */
export function ClustersView({ comments, clusterResult, clusterNames, opacity = 1 }: ClustersViewProps) {
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null)
  const [showDissenting, setShowDissenting] = useState(false)

  const { clusters } = clusterResult

  // Map cluster names by ID
  const nameMap = new Map(clusterNames.map(n => [n.clusterId, n]))

  // Build cluster data with comments
  const clusterData = clusters.map((cluster) => {
    const nameInfo = nameMap.get(cluster.id) || { name: 'unnamed feeling', confidence: 0.5 }
    return {
      ...cluster,
      name: nameInfo.name,
      labelConfidence: nameInfo.confidence,
      comments: cluster.commentIndices.map(idx => comments[idx]).filter(Boolean)
    }
  })

  return (
    <div className="clusters-view" style={{ opacity }}>
      <div className="clusters-container">
        {clusterData.map((cluster, i) => {
          const colors = CLUSTER_COLORS[i % CLUSTER_COLORS.length]
          const isExpanded = expandedCluster === cluster.id
          const blurAmount = Math.max(0, (1 - cluster.labelConfidence) * 2)

          return (
            <div
              key={cluster.id}
              className={`cluster-card ${isExpanded ? 'expanded' : ''}`}
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.border,
                animationDelay: `${i * 80}ms`
              }}
            >
              <button
                className="cluster-header"
                onClick={() => setExpandedCluster(isExpanded ? null : cluster.id)}
              >
                <h3 
                  className="cluster-name"
                  style={{ filter: `blur(${blurAmount}px)` }}
                >
                  {cluster.name}
                </h3>
                <span className="cluster-count">
                  {cluster.comments.length} comments
                </span>
                <span className="cluster-expand-icon">
                  {isExpanded ? '−' : '+'}
                </span>
              </button>

              {isExpanded && (
                <div className="cluster-content">
                  <div className="cluster-comments">
                    {cluster.comments.slice(0, showDissenting ? undefined : 10).map(comment => (
                      <div key={comment.id} className="cluster-comment">
                        {comment.text}
                      </div>
                    ))}
                    {cluster.comments.length > 10 && !showDissenting && (
                      <button 
                        className="cluster-show-more"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDissenting(true)
                        }}
                      >
                        Show all {cluster.comments.length} comments
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ClustersView

