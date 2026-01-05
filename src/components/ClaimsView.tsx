import { useState } from 'react'
import { CommentWithEmbedding } from '../utils/embeddings'
import { ClusterResult } from '../utils/clustering'
import { Claim, ClusterName } from '../utils/llm'

interface ClaimsViewProps {
  comments: CommentWithEmbedding[]
  clusterResult: ClusterResult
  clusterNames: ClusterName[]
  claims: Claim[]
  opacity?: number
}

/**
 * Level 4: CLAIMS (Prose, but accountable)
 * Paragraphs with clickable sentences that expand to show source
 */
export function ClaimsView({ 
  comments, 
  clusterResult, 
  clusterNames, 
  claims, 
  opacity = 1 
}: ClaimsViewProps) {
  const [expandedClaim, setExpandedClaim] = useState<number | null>(null)

  const { clusters } = clusterResult
  const nameMap = new Map(clusterNames.map(n => [n.clusterId, n]))

  // Get comments for a claim's clusters
  const getClaimComments = (claim: Claim) => {
    const relevantClusters = clusters.filter(c => claim.clusterIds.includes(c.id))
    const commentIndices = relevantClusters.flatMap(c => c.commentIndices)
    return [...new Set(commentIndices)].map(i => comments[i]).filter(Boolean)
  }

  // Get cluster names for a claim
  const getClaimClusters = (claim: Claim) => {
    return claim.clusterIds
      .map(id => nameMap.get(id))
      .filter(Boolean)
      .map(n => n!.name)
  }

  return (
    <div className="claims-view" style={{ opacity }}>
      <div className="claims-container">
        <div className="claims-disclaimer">
          One way of speaking about many experiences.
        </div>

        <div className="claims-prose">
          {claims.map((claim, i) => {
            const isExpanded = expandedClaim === claim.id
            const claimComments = getClaimComments(claim)
            const claimClusters = getClaimClusters(claim)

            return (
              <div
                key={claim.id}
                className={`claim-block ${isExpanded ? 'expanded' : ''}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <button
                  className="claim-text"
                  onClick={() => setExpandedClaim(isExpanded ? null : claim.id)}
                >
                  {claim.text}
                  <span className="claim-citation">
                    ({claim.commentCount} comments)
                  </span>
                </button>

                {isExpanded && (
                  <div className="claim-expansion">
                    <div className="claim-clusters">
                      <span className="claim-clusters-label">From clusters:</span>
                      {claimClusters.map((name, j) => (
                        <span key={j} className="claim-cluster-tag">{name}</span>
                      ))}
                    </div>

                    <div className="claim-source-comments">
                      <h4>Source comments:</h4>
                      <div className="claim-comments-list">
                        {claimComments.slice(0, 15).map((comment) => (
                          <div key={comment.id} className="claim-source-comment">
                            "{comment.text}"
                          </div>
                        ))}
                        {claimComments.length > 15 && (
                          <div className="claim-more-comments">
                            ...and {claimComments.length - 15} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ClaimsView

