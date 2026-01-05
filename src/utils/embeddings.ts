import OpenAI from 'openai'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for client-side usage
})

export interface CommentWithEmbedding {
  id: string
  text: string
  authorName: string
  authorProfileImageUrl: string
  likeCount: number
  publishedAt: string
  embedding: number[]
}

/**
 * Clean text for embedding API - remove invalid characters and ensure valid input
 */
function cleanTextForEmbedding(text: string): string {
  if (!text) return ''
  
  // Trim and normalize whitespace
  let cleaned = text.trim().replace(/\s+/g, ' ')
  
  // Remove null characters and other problematic characters
  cleaned = cleaned.replace(/\0/g, '')
  
  // Ensure it's not too long (API limit is ~8000 tokens, so cap chars)
  if (cleaned.length > 8000) {
    cleaned = cleaned.slice(0, 8000)
  }
  
  return cleaned
}

/**
 * Delay helper for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get embeddings for a batch of texts using OpenAI's text-embedding-3-small
 * Uses smaller batches and retries for rate limiting
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  // Clean all texts and track which ones are valid
  const cleanedTexts = texts.map(cleanTextForEmbedding)
  const validIndices: number[] = []
  const validTexts: string[] = []
  
  cleanedTexts.forEach((text, i) => {
    if (text.length > 0) {
      validIndices.push(i)
      validTexts.push(text)
    }
  })

  if (validTexts.length === 0) {
    return texts.map(() => [])
  }

  // Use smaller batch size to avoid rate limits
  const BATCH_SIZE = 50
  const validEmbeddings: number[][] = []
  
  for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
    const batch = validTexts.slice(i, i + BATCH_SIZE)
    
    // Retry logic for rate limiting
    let retries = 3
    let success = false
    
    while (retries > 0 && !success) {
      try {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: batch,
        })

        const embeddings = response.data.map(item => item.embedding)
        validEmbeddings.push(...embeddings)
        success = true
        
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < validTexts.length) {
          await delay(200)
        }
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string }
        console.error('Embedding error:', err.message || error)
        
        if (err.status === 429) {
          // Rate limited - wait longer and retry
          console.log('Rate limited, waiting 2 seconds...')
          await delay(2000)
          retries--
        } else {
          // Other error - add empty embeddings for this batch
          validEmbeddings.push(...batch.map(() => []))
          success = true
        }
      }
    }
    
    if (!success) {
      // Failed after retries
      validEmbeddings.push(...batch.map(() => []))
    }
  }

  // Map embeddings back to original indices
  const result: number[][] = texts.map(() => [])
  validIndices.forEach((originalIdx, embeddingIdx) => {
    result[originalIdx] = validEmbeddings[embeddingIdx] || []
  })

  console.log(`Embeddings: ${validEmbeddings.filter(e => e.length > 0).length}/${texts.length} successful`)

  return result
}

/**
 * Add embeddings to comments
 */
export async function embedComments(
  comments: { id: string; text: string; authorName: string; authorProfileImageUrl: string; likeCount: number; publishedAt: string }[]
): Promise<CommentWithEmbedding[]> {
  const texts = comments.map(c => c.text)
  const embeddings = await getEmbeddings(texts)

  return comments.map((comment, i) => ({
    ...comment,
    embedding: embeddings[i] || []
  }))
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

/**
 * Compute distance matrix (1 - cosine similarity) for clustering
 */
export function computeDistanceMatrix(embeddings: number[][]): number[][] {
  const n = embeddings.length
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const distance = 1 - cosineSimilarity(embeddings[i], embeddings[j])
      matrix[i][j] = distance
      matrix[j][i] = distance
    }
  }

  return matrix
}
