export interface VideoDetails {
  id: string
  title: string
  channelTitle: string
  thumbnail: string
  viewCount: string
  viewCountRaw: number
  commentCount: string
  commentCountRaw: number
  publishedAt: string
  timeAgo: string
}

/**
 * Format count to human readable format
 */
function formatCount(count: string, label: string): string {
  const num = parseInt(count, 10)
  if (isNaN(num)) return `0 ${label}`
  
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B ' + label
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M ' + label
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K ' + label
  }
  return num + ' ' + label
}

/**
 * Format date to relative time (e.g., "2 years ago")
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (years >= 1) {
    return years === 1 ? '1 year ago' : `${years} years ago`
  }
  if (months >= 1) {
    return months === 1 ? '1 month ago' : `${months} months ago`
  }
  if (days >= 1) {
    return days === 1 ? '1 day ago' : `${days} days ago`
  }
  if (hours >= 1) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  if (minutes >= 1) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  }
  return 'Just now'
}

/**
 * Search YouTube for videos and return top results with full details
 */
export async function searchVideos(query: string, apiKey: string, maxResults: number = 3): Promise<VideoDetails[]> {
  if (!query.trim()) return []

  // Search for more videos than needed to account for filtering
  const searchCount = maxResults * 3
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${searchCount}&q=${encodeURIComponent(query)}&key=${apiKey}`

  try {
    const searchResponse = await fetch(searchUrl)
    const searchData = await searchResponse.json()

    if (!searchData.items || searchData.items.length === 0) {
      return []
    }

    // Get video IDs from search results
    const videoIds = searchData.items.map((item: { id: { videoId: string } }) => item.id.videoId).join(',')

    // Fetch full details (including statistics) for these videos
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`
    const detailsResponse = await fetch(detailsUrl)
    const detailsData = await detailsResponse.json()

    if (!detailsData.items) {
      return []
    }

    const allVideos: VideoDetails[] = detailsData.items.map((item: {
      id: string
      snippet: {
        title: string
        channelTitle: string
        thumbnails: { medium?: { url: string }; default?: { url: string } }
        publishedAt: string
      }
      statistics: {
        viewCount?: string
        commentCount?: string
      }
    }) => ({
      id: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      viewCount: formatCount(item.statistics.viewCount || '0', 'views'),
      viewCountRaw: parseInt(item.statistics.viewCount || '0', 10),
      commentCount: formatCount(item.statistics.commentCount || '0', 'comments'),
      commentCountRaw: parseInt(item.statistics.commentCount || '0', 10),
      publishedAt: item.snippet.publishedAt,
      timeAgo: formatTimeAgo(item.snippet.publishedAt)
    }))

    // Filter to only videos with accessible comments
    const accessibleVideos: VideoDetails[] = []
    for (const video of allVideos) {
      if (accessibleVideos.length >= maxResults) break
      const accessible = await areCommentsAccessible(video.id, apiKey)
      if (accessible) {
        accessibleVideos.push(video)
      }
    }

    // Sort by view count (most views first)
    return accessibleVideos.sort((a, b) => b.viewCountRaw - a.viewCountRaw)
  } catch (error) {
    console.error('Failed to search videos:', error)
    return []
  }
}

/**
 * Fetch video details by ID
 */
export async function fetchVideoById(videoId: string, apiKey: string): Promise<VideoDetails | null> {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (!data.items || data.items.length === 0) {
      return null
    }

    const item = data.items[0]
    return {
      id: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      viewCount: formatCount(item.statistics.viewCount || '0', 'views'),
      viewCountRaw: parseInt(item.statistics.viewCount || '0', 10),
      commentCount: formatCount(item.statistics.commentCount || '0', 'comments'),
      commentCountRaw: parseInt(item.statistics.commentCount || '0', 10),
      publishedAt: item.snippet.publishedAt,
      timeAgo: formatTimeAgo(item.snippet.publishedAt)
    }
  } catch (error) {
    console.error('Failed to fetch video:', error)
    return null
  }
}

export interface Comment {
  id: string
  text: string
  authorName: string
  authorProfileImageUrl: string
  likeCount: number
  publishedAt: string
}

/**
 * Check if comments are accessible for a video
 */
export async function areCommentsAccessible(videoId: string, apiKey: string): Promise<boolean> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=id&videoId=${videoId}&maxResults=1&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()
    
    // If there's an error (like 403 for disabled comments), return false
    if (data.error) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

/**
 * Fetch top comments for a video (ordered by relevance)
 */
export async function fetchComments(videoId: string, apiKey: string, maxResults: number = 100): Promise<Comment[]> {
  const comments: Comment[] = []
  let pageToken = ''
  const perPage = Math.min(maxResults, 100) // API max is 100 per request

  try {
    while (comments.length < maxResults) {
      const remaining = maxResults - comments.length
      const fetchCount = Math.min(remaining, perPage)
      
      let url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=${fetchCount}&order=relevance&textFormat=plainText&key=${apiKey}`
      
      if (pageToken) {
        url += `&pageToken=${pageToken}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.error) {
        console.error('YouTube API error:', data.error)
        break
      }

      if (!data.items || data.items.length === 0) {
        break
      }

      for (const item of data.items) {
        const snippet = item.snippet.topLevelComment.snippet
        comments.push({
          id: item.id,
          text: snippet.textDisplay,
          authorName: snippet.authorDisplayName,
          authorProfileImageUrl: snippet.authorProfileImageUrl || '',
          likeCount: snippet.likeCount || 0,
          publishedAt: snippet.publishedAt
        })
      }

      if (!data.nextPageToken || comments.length >= maxResults) {
        break
      }
      
      pageToken = data.nextPageToken
    }

    return comments.slice(0, maxResults)
  } catch (error) {
    console.error('Failed to fetch comments:', error)
    return comments
  }
}
