import { computeDistanceMatrix, cosineSimilarity } from './embeddings'

export interface Cluster {
  id: number
  commentIndices: number[]
  centroid?: number[]
  confidence: number
}

export interface ClusterResult {
  clusters: Cluster[]
  assignments: number[]
}

/**
 * Simple k-means clustering on embeddings
 */
export function clusterEmbeddings(
  embeddings: number[][],
  numClusters: number = 5
): ClusterResult {
  if (embeddings.length === 0) {
    return { clusters: [], assignments: [] }
  }

  const k = Math.min(numClusters, embeddings.length)
  
  if (embeddings.length <= k) {
    const clusters: Cluster[] = embeddings.map((_, i) => ({
      id: i,
      commentIndices: [i],
      confidence: 1.0
    }))
    return { clusters, assignments: embeddings.map((_, i) => i) }
  }

  // Initialize centroids by picking k random points (k-means++ style spread)
  const centroidIndices: number[] = []
  centroidIndices.push(Math.floor(Math.random() * embeddings.length))
  
  while (centroidIndices.length < k) {
    // Pick point furthest from existing centroids
    let bestIdx = 0
    let bestMinDist = -1
    
    for (let i = 0; i < embeddings.length; i++) {
      if (centroidIndices.includes(i)) continue
      
      let minDist = Infinity
      for (const cIdx of centroidIndices) {
        const sim = cosineSimilarity(embeddings[i], embeddings[cIdx])
        const dist = 1 - sim
        if (dist < minDist) minDist = dist
      }
      
      if (minDist > bestMinDist) {
        bestMinDist = minDist
        bestIdx = i
      }
    }
    centroidIndices.push(bestIdx)
  }
  
  let centroids = centroidIndices.map(i => [...embeddings[i]])
  let assignments: number[] = new Array(embeddings.length).fill(0)
  
  // K-means iterations
  for (let iter = 0; iter < 20; iter++) {
    // Assign each point to nearest centroid
    const newAssignments = embeddings.map(embedding => {
      let bestCluster = 0
      let bestSimilarity = -Infinity
      
      for (let c = 0; c < k; c++) {
        const sim = cosineSimilarity(embedding, centroids[c])
        if (sim > bestSimilarity) {
          bestSimilarity = sim
          bestCluster = c
        }
      }
      return bestCluster
    })

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i])
    assignments = newAssignments
    
    if (!changed) break

    // Update centroids
    centroids = Array(k).fill(null).map((_, clusterId) => {
      const members = embeddings.filter((_, i) => assignments[i] === clusterId)
      if (members.length === 0) return centroids[clusterId]
      
      const dim = members[0].length
      const centroid = new Array(dim).fill(0)
      for (const m of members) {
        for (let d = 0; d < dim; d++) centroid[d] += m[d]
      }
      for (let d = 0; d < dim; d++) centroid[d] /= members.length
      return centroid
    })
  }

  console.log('K-means clusters:', k, 'unique assignments:', new Set(assignments).size)

  // Build cluster objects
  const clusterMap = new Map<number, number[]>()
  assignments.forEach((clusterId, dataIdx) => {
    if (!clusterMap.has(clusterId)) clusterMap.set(clusterId, [])
    clusterMap.get(clusterId)!.push(dataIdx)
  })

  const distanceMatrix = computeDistanceMatrix(embeddings)
  
  const clusters: Cluster[] = Array.from(clusterMap.entries()).map(([id, indices]) => {
    let confidence = 1.0
    if (indices.length > 1) {
      let total = 0, count = 0
      for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
          total += distanceMatrix[indices[i]][indices[j]]
          count++
        }
      }
      confidence = Math.max(0, 1 - (count > 0 ? total / count : 0))
    }
    return { id, commentIndices: indices, centroid: centroids[id], confidence }
  })

  clusters.sort((a, b) => b.commentIndices.length - a.commentIndices.length)
  
  const idMap = new Map<number, number>()
  clusters.forEach((c, i) => { idMap.set(c.id, i); c.id = i })
  
  return { clusters, assignments: assignments.map(id => idMap.get(id) ?? id) }
}

/**
 * Get cluster assignments at multiple granularities
 */
export function getMultiLevelClusters(
  embeddings: number[][]
): {
  fine: ClusterResult
  coarse: ClusterResult
} {
  const n = embeddings.length
  
  // Fine-grained: more clusters for FRAGMENTS
  const fineNumClusters = Math.max(3, Math.min(Math.floor(n / 5), 15))
  
  // Coarse: fewer clusters for CLUSTERS level
  const coarseNumClusters = Math.max(2, Math.min(Math.floor(n / 15), 7))

  return {
    fine: clusterEmbeddings(embeddings, fineNumClusters),
    coarse: clusterEmbeddings(embeddings, coarseNumClusters)
  }
}

/**
 * Find "dissenting" comments - ones that weakly belong to their cluster
 */
export function findDissentingComments(
  cluster: Cluster,
  embeddings: number[][],
  threshold: number = 0.3
): number[] {
  if (!cluster.centroid || cluster.commentIndices.length <= 1) return []

  const dissenting: number[] = []
  
  for (const idx of cluster.commentIndices) {
    const embedding = embeddings[idx]
    const similarity = cosineSimilarity(embedding, cluster.centroid)
    const distance = 1 - similarity

    if (distance > threshold) {
      dissenting.push(idx)
    }
  }

  return dissenting
}
