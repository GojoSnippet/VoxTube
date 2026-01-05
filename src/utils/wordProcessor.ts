
// Common English stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
  'his', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
  'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once', 'if',
  'about', 'after', 'before', 'above', 'below', 'up', 'down', 'out', 'off',
  'over', 'under', 'again', 'further', 'am', 'an', 'any', 'because', 'being',
  'between', 'during', 'having', 'into', 'through', 'until', 'while',
  // Common YouTube comment words to filter
  'video', 'song', 'like', 'im', 'dont', 'cant', 'got', 'get', 'one',
  'really', 'still', 'even', 'much', 'back', 'go', 'come', 'make', 'know',
  'think', 'see', 'way', 'well', 'thing', 'say', 'want', 'give', 'take',
  'good', 'first', 'new', 'time', 'year', 'day', 'man', 'people', 'going'
])

export interface WordFrequency {
  text: string
  value: number
}

/**
 * Clean text by removing HTML entities, URLs, and special characters
 */
function cleanText(text: string): string {
  return text
    // Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Remove URLs
    .replace(/https?:\/\/[^\s]+/g, '')
    // Remove timestamps like 1:23 or 12:34:56
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, '')
    // Remove emojis and special unicode
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    // Remove special characters but keep letters and spaces
    .replace(/[^\w\s'-]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return cleanText(text)
    .split(/\s+/)
    .filter(word => word.length > 2) // Minimum 3 characters
    .filter(word => !STOP_WORDS.has(word))
    .filter(word => !/^\d+$/.test(word)) // Filter pure numbers
}

/**
 * Process comments and return word frequencies for word cloud
 */
export function processComments(comments: { text: string }[]): WordFrequency[] {
  const wordCounts = new Map<string, number>()

  for (const comment of comments) {
    const words = tokenize(comment.text)
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    }
  }

  // Convert to array and sort by frequency
  const frequencies: WordFrequency[] = Array.from(wordCounts.entries())
    .map(([text, value]) => ({ text, value }))
    .filter(item => item.value >= 2) // Minimum 2 occurrences
    .sort((a, b) => b.value - a.value)
    .slice(0, 100) // Top 100 words

  return frequencies
}






