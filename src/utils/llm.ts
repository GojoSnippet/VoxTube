import OpenAI from 'openai'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

export interface ClusterName {
  clusterId: number
  name: string
  confidence: number
}

export interface Claim {
  id: number
  text: string
  clusterIds: number[]
  commentCount: number
}

export interface StoryComment {
  text: string
  authorDisplayName: string
  authorProfileImageUrl?: string
}

/**
 * Generate soft, evocative names for clusters
 * Names should feel like moods/feelings, not categories
 */
export async function generateClusterNames(
  clusters: { id: number; comments: string[] }[]
): Promise<ClusterName[]> {
  if (clusters.length === 0) return []

  const clusterDescriptions = clusters.map(c => 
    `Cluster ${c.id} (${c.comments.length} comments):\n${c.comments.slice(0, 10).map(text => `- "${text.slice(0, 150)}"`).join('\n')}`
  ).join('\n\n')

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You name clusters of YouTube comments about music videos. 
          
Your names should be:
- Evocative and poetic, like "late-night solitude" or "childhood safety" or "post-breakup spiral"
- 2-4 words maximum
- Feelings/moods/experiences, NOT categories
- Lowercase, no punctuation

Respond with JSON array: [{"clusterId": number, "name": "string", "confidence": 0.0-1.0}]
Confidence reflects how coherent the cluster feels (1.0 = very tight theme, 0.5 = mixed).`
        },
        {
          role: 'user',
          content: `Name these comment clusters:\n\n${clusterDescriptions}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })

    const content = response.choices[0]?.message?.content
    if (!content) return clusters.map(c => ({ clusterId: c.id, name: 'unnamed feeling', confidence: 0.5 }))

    const parsed = JSON.parse(content)
    const names = parsed.clusters || parsed.names || parsed
    
    if (Array.isArray(names)) {
      return names.map((n: { clusterId?: number; cluster_id?: number; name?: string; confidence?: number }, i: number) => ({
        clusterId: n.clusterId ?? n.cluster_id ?? clusters[i]?.id ?? i,
        name: n.name || 'unnamed feeling',
        confidence: n.confidence ?? 0.7
      }))
    }

    return clusters.map(c => ({ clusterId: c.id, name: 'unnamed feeling', confidence: 0.5 }))
  } catch (error) {
    console.error('Failed to generate cluster names:', error)
    return clusters.map(c => ({ clusterId: c.id, name: 'unnamed feeling', confidence: 0.5 }))
  }
}

/**
 * Generate accountable prose claims from clusters
 * Each claim cites comment counts and remains epistemically humble
 */
export async function generateClaims(
  clusters: { id: number; name: string; comments: string[]; confidence: number }[]
): Promise<Claim[]> {
  if (clusters.length === 0) return []

  const totalComments = clusters.reduce((sum, c) => sum + c.comments.length, 0)
  
  const clusterSummary = clusters.map(c => 
    `"${c.name}" (${c.comments.length} comments, ${Math.round(c.confidence * 100)}% coherent):\n${c.comments.slice(0, 5).map(text => `  - "${text.slice(0, 100)}"`).join('\n')}`
  ).join('\n\n')

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You write prose summaries of how people respond to music. Your writing must be:

1. ACCOUNTABLE: Every claim cites a count, e.g. "Many listeners describe... (132 comments)"
2. HUMBLE: Use hedging language - "seem to", "many describe", "a smaller group"
3. PLURAL: Acknowledge different experiences, including minority views
4. REVERSIBLE: Write so readers want to see the underlying comments

Structure: 2-4 sentences covering major themes, then minority perspectives.
End with a reflection that this is "one way of speaking about many experiences."

Respond with JSON: {"claims": [{"text": "...", "clusterIds": [0, 1], "commentCount": 150}]}`
        },
        {
          role: 'user',
          content: `Summarize these ${totalComments} comments across ${clusters.length} clusters:\n\n${clusterSummary}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return [{
        id: 0,
        text: `${totalComments} comments reveal varied experiences with this music.`,
        clusterIds: clusters.map(c => c.id),
        commentCount: totalComments
      }]
    }

    const parsed = JSON.parse(content)
    const claims = parsed.claims || [parsed]

    return claims.map((claim: { text?: string; clusterIds?: number[]; cluster_ids?: number[]; commentCount?: number; comment_count?: number }, i: number) => ({
      id: i,
      text: claim.text || '',
      clusterIds: claim.clusterIds || claim.cluster_ids || [],
      commentCount: claim.commentCount || claim.comment_count || 0
    }))
  } catch (error) {
    console.error('Failed to generate claims:', error)
    return [{
      id: 0,
      text: `${totalComments} comments reveal varied experiences with this music.`,
      clusterIds: clusters.map(c => c.id),
      commentCount: totalComments
    }]
  }
}

/**
 * Generate a cohesive prose summary of all comments
 * This creates a readable paragraph that captures the essence of all feedback
 */
export async function generateProseSummary(
  clusters: { id: number; name: string; comments: string[]; confidence: number }[],
  videoTitle?: string
): Promise<string> {
  if (clusters.length === 0) return ''

  const totalComments = clusters.reduce((sum, c) => sum + c.comments.length, 0)

  const clusterSummary = clusters
    .sort((a, b) => b.comments.length - a.comments.length)
    .map(c => `"${c.name}" (${c.comments.length} comments): ${c.comments.slice(0, 3).join(' | ').slice(0, 200)}`)
    .join('\n')

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You write cohesive prose summaries of YouTube comment sections for music videos. Your summary should:

1. Be 3-5 sentences that flow naturally as a paragraph
2. Mention specific numbers (e.g., "the largest group of 48 comments")
3. Highlight the dominant sentiment and any notable minority views
4. Feel like insightful analysis, not a list
5. Use phrases like "reveals", "captures", "emerges", "suggests"

Write in third person, as if describing what the comment section shows.`
        },
        {
          role: 'user',
          content: `Summarize these ${totalComments} comments${videoTitle ? ` for "${videoTitle}"` : ''}:\n\n${clusterSummary}`
        }
      ],
      temperature: 0.7
    })

    const content = response.choices[0]?.message?.content
    return content || `Analysis of ${totalComments} comments across ${clusters.length} distinct themes.`
  } catch (error) {
    console.error('Failed to generate prose summary:', error)
    return `Analysis of ${totalComments} comments across ${clusters.length} distinct themes.`
  }
}

/**
 * Detect comments that contain personal stories or memories
 * Returns comments where people share meaningful experiences with the song
 */
export async function detectStoryComments(
  comments: { text: string; authorDisplayName: string; authorProfileImageUrl?: string }[]
): Promise<StoryComment[]> {
  if (comments.length === 0) return []

  // Take a sample of comments to analyze (max 100 for API efficiency)
  const sampleComments = comments.slice(0, 100)

  const commentTexts = sampleComments.map((c, i) =>
    `[${i}] "${c.text.slice(0, 300)}"`
  ).join('\n')

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You identify YouTube comments that contain personal stories, memories, or meaningful experiences related to a song.

Look for comments where someone shares:
- A specific memory triggered by the song (e.g., "This reminds me of when...")
- A personal story or experience (e.g., "I first heard this when...")
- An emotional journey or life event connected to the music
- Nostalgic reflections with personal context

Do NOT include:
- Generic praise ("Great song!", "Love this!")
- Simple reactions or opinions
- Timestamps or lyrics quotes
- Short comments without narrative content

Return a JSON object with an array of indices (0-based) of comments that qualify as stories.
Format: {"story_indices": [0, 5, 12, ...]}`
        },
        {
          role: 'user',
          content: `Identify which of these comments contain personal stories or memories:\n\n${commentTexts}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const content = response.choices[0]?.message?.content
    if (!content) return []

    const parsed = JSON.parse(content)
    const indices: number[] = parsed.story_indices || []

    // Map indices back to full comment objects
    const storyComments: StoryComment[] = indices
      .filter(i => i >= 0 && i < sampleComments.length)
      .slice(0, 10) // Limit to top 10 stories
      .map(i => ({
        text: sampleComments[i].text,
        authorDisplayName: sampleComments[i].authorDisplayName,
        authorProfileImageUrl: sampleComments[i].authorProfileImageUrl
      }))

    return storyComments
  } catch (error) {
    console.error('Failed to detect story comments:', error)
    return []
  }
}






