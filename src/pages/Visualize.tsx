import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Play, X, ArrowLeft, Sparkles, BookOpen, ThumbsUp, HelpCircle, ChevronRight } from 'lucide-react'
import { fetchVideoById, fetchComments, VideoDetails, searchVideos } from '@/utils/youtube'
import { embedComments, CommentWithEmbedding } from '@/utils/embeddings'
import { getMultiLevelClusters, ClusterResult } from '@/utils/clustering'
import { generateClusterNames, detectStoryComments, generateProseSummary, ClusterName, StoryComment } from '@/utils/llm'
import { VoxLogo } from '@/components/VoxLogo'
import { Input } from '@/components/ui/input'
import { SearchDropdown } from '@/components/SearchDropdown'
import { LoadingScreen } from '@/components/LoadingScreen'
import { MiniPlayer } from '@/components/MiniPlayer'

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || ''

type LoadingStage =
  | 'fetching-video'
  | 'fetching-comments'
  | 'embedding'
  | 'clustering'
  | 'naming'
  | 'claims'
  | 'stories'
  | 'done'

const LOADING_MESSAGES: Record<LoadingStage, string> = {
  'fetching-video': 'Loading video info...',
  'fetching-comments': 'Gathering the crowd\'s wisdom...',
  'embedding': 'Decoding the comment section...',
  'clustering': 'Finding patterns in the noise...',
  'naming': 'Labeling the themes...',
  'claims': 'Synthesizing voices...',
  'stories': 'Discovering personal moments...',
  'done': '',
}

type DialLevel = 0 | 1 | 2 | 3

const DIAL_LEVELS = [
  { name: 'Raw', label: 'RAW', icon: '💬', description: 'Unfiltered voices in their own words', preview: 'See comments grouped by similarity' },
  { name: 'Clusters', label: 'CLUSTERS', icon: '🔮', description: 'Comments grouped by similarity', preview: 'See AI-labeled themes' },
  { name: 'Themes', label: 'THEMES', icon: '🏷️', description: 'AI-labeled patterns and topics', preview: 'See synthesized summary' },
  { name: 'Refined', label: 'SUMMARY', icon: '✨', description: 'Synthesized summary of all voices', preview: null },
]

export default function Visualize() {
  const { videoId } = useParams()
  const navigate = useNavigate()

  // Video and comments
  const [video, setVideo] = useState<VideoDetails | null>(null)
  const [comments, setComments] = useState<CommentWithEmbedding[]>([])

  // Clustering data
  const [fineClusters, setFineClusters] = useState<ClusterResult | null>(null)
  const [coarseClusters, setCoarseClusters] = useState<ClusterResult | null>(null)
  const [clusterNames, setClusterNames] = useState<ClusterName[]>([])
  const [storyComments, setStoryComments] = useState<StoryComment[]>([])
  const [proseSummary, setProseSummary] = useState<string>('')

  // UI state
  const [dialLevel, setDialLevel] = useState<DialLevel>(0)
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('fetching-video')
  const [errorType, setErrorType] = useState<'noComments' | 'videoNotFound' | 'generic' | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showMiniPlayer, setShowMiniPlayer] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showHint, setShowHint] = useState(() => {
    return !localStorage.getItem('voxtube-dial-hint-dismissed')
  })
  const [hoveredStat, setHoveredStat] = useState<string | null>(null)

  // Search state
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<VideoDetails[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isLoading = loadingStage !== 'done'

  // Reset page title on unmount
  useEffect(() => {
    return () => {
      document.title = 'VoxTube'
    }
  }, [])

  // Search effect
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    const timeoutId = setTimeout(() => {
      setSearchLoading(true)
      searchVideos(query, API_KEY, 3)
        .then((results) => {
          setSearchResults(results)
          setShowDropdown(true)
        })
        .finally(() => setSearchLoading(false))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleVideoClick = (vid: VideoDetails) => {
    setShowDropdown(false)
    setQuery('')
    navigate(`/visualize/${vid.id}`)
  }

  // Main data loading
  useEffect(() => {
    if (!videoId) return

    let cancelled = false

    async function loadData() {
      setLoadingStage('fetching-video')
      setErrorType(null)

      try {
        const videoData = await fetchVideoById(videoId!, API_KEY)
        if (cancelled) return
        if (!videoData) {
          setErrorType('videoNotFound')
          return
        }
        setVideo(videoData)
        document.title = `${videoData.title} - VoxTube`

        setLoadingStage('fetching-comments')
        const maxComments = Math.min(videoData.commentCountRaw, 200)
        const rawComments = await fetchComments(videoId!, API_KEY, maxComments)
        if (cancelled) return
        if (rawComments.length === 0) {
          setErrorType('noComments')
          return
        }

        setLoadingStage('embedding')
        const embeddedComments = await embedComments(rawComments)
        if (cancelled) return
        setComments(embeddedComments)

        setLoadingStage('clustering')
        const validComments = embeddedComments.filter((c) => c.embedding.length > 0)
        const embeddings = validComments.map((c) => c.embedding)

        if (embeddings.length === 0) {
          setErrorType('generic')
          return
        }

        setComments(validComments)
        const { fine, coarse } = getMultiLevelClusters(embeddings)
        if (cancelled) return
        setFineClusters(fine)
        setCoarseClusters(coarse)

        setLoadingStage('naming')
        const clustersForNaming = coarse.clusters.map((c) => ({
          id: c.id,
          comments: c.commentIndices.map((i) => validComments[i]?.text || '').filter(Boolean),
        }))
        const names = await generateClusterNames(clustersForNaming)
        if (cancelled) return
        setClusterNames(names)

        setLoadingStage('claims')
        const clustersForSummary = coarse.clusters.map((c) => ({
          id: c.id,
          name: names.find((n) => n.clusterId === c.id)?.name || 'unnamed',
          comments: c.commentIndices.map((idx) => validComments[idx]?.text || '').filter(Boolean),
          confidence: c.confidence,
        }))

        // Generate prose summary
        const summary = await generateProseSummary(clustersForSummary, videoData?.title)
        if (cancelled) return
        setProseSummary(summary)

        setLoadingStage('stories')
        const commentsForStories = validComments.map((c) => ({
          text: c.text,
          authorDisplayName: c.authorName,
          authorProfileImageUrl: c.authorProfileImageUrl,
        }))
        const stories = await detectStoryComments(commentsForStories)
        if (cancelled) return
        setStoryComments(stories)

        setLoadingStage('done')
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load data:', err)
          setErrorType('generic')
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [videoId])

  // Error state
  if (errorType) {
    const errorMessages = {
      noComments: { icon: '🔇', title: 'Comments are disabled', subtitle: 'Even we can\'t read silence.' },
      videoNotFound: { icon: '🔍', title: 'Video not found', subtitle: 'Maybe it\'s hiding in another dimension?' },
      generic: { icon: '⚡', title: 'Something went wrong', subtitle: 'The crowd went silent. Try again?' },
    }
    const errorMsg = errorMessages[errorType]
    return (
      <div className="min-h-screen bg-[#fafafa] text-gray-900 flex flex-col items-center justify-center gap-3 sm:gap-4 px-4 text-center">
        <span className="text-5xl sm:text-6xl md:text-7xl">{errorMsg.icon}</span>
        <h2 className="text-2xl sm:text-3xl font-semibold">{errorMsg.title}</h2>
        <p className="text-sm sm:text-base text-gray-500">{errorMsg.subtitle}</p>
        <Link to="/" className="mt-4 flex items-center gap-2 text-sky-500 hover:text-sky-600 text-sm sm:text-base">
          <ArrowLeft className="w-4 h-4" /> Try a different song
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 bg-white/90 backdrop-blur-xl border-b border-gray-200">
        <Link to="/" className="flex-shrink-0">
          <VoxLogo size="sm" showText={false} />
        </Link>

        <div className="flex-1 max-w-xs sm:max-w-md mx-auto relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search videos"
            className="w-full h-10 sm:h-11 pl-9 sm:pl-11 bg-gray-50 border-gray-200 text-gray-900 text-sm sm:text-base rounded-xl"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />
          {showDropdown && (
            <SearchDropdown results={searchResults} loading={searchLoading} onSelect={handleVideoClick} />
          )}
        </div>
      </nav>

      {/* Loading State */}
      {isLoading ? (
        <LoadingScreen stage={LOADING_MESSAGES[loadingStage]} />
      ) : (
        <div className="flex flex-col lg:flex-row">
          {/* LEFT PANEL - Collapsible on mobile */}
          <aside className="w-full lg:w-[35%] lg:min-w-[320px] lg:max-w-[400px] border-b lg:border-b-0 lg:border-r border-gray-200 p-4 sm:p-6 lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] lg:overflow-y-auto bg-gray-50/50">
            {/* Video Info */}
            {video && (
              <div className="mb-6 lg:mb-8">
                <div className="flex gap-3 sm:gap-4 lg:block">
                  <div
                    className="relative w-28 sm:w-36 lg:w-full aspect-video rounded-lg lg:rounded-xl overflow-hidden cursor-pointer group flex-shrink-0 lg:mb-4"
                    onClick={() => setShowMiniPlayer(true)}
                  >
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-4 h-4 lg:w-6 lg:h-6 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-1 right-1 lg:bottom-2 lg:right-2 px-1.5 lg:px-2 py-0.5 lg:py-1 bg-black/60 rounded text-[10px] lg:text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      Listen
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-[13px] sm:text-sm lg:text-base font-semibold leading-snug line-clamp-2 lg:line-clamp-none text-gray-900">{video.title}</h1>
                    <p className="text-[11px] sm:text-xs text-gray-600 mt-1 font-medium">{video.channelTitle}</p>
                    <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">{video.viewCount}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats with Tooltips */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 lg:mb-8">
              <div
                className="bg-white rounded-xl p-2.5 sm:p-3 text-center relative cursor-help border border-gray-200 shadow-sm"
                onMouseEnter={() => setHoveredStat('analyzed')}
                onMouseLeave={() => setHoveredStat(null)}
              >
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{comments.length}</p>
                <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium uppercase tracking-wide">analyzed</p>
                <AnimatePresence>
                  {hoveredStat === 'analyzed' && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 rounded-lg text-xs text-white whitespace-nowrap z-20 shadow-lg"
                    >
                      Comments processed by AI
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div
                className="bg-white rounded-xl p-2.5 sm:p-3 text-center relative cursor-help border border-gray-200 shadow-sm"
                onMouseEnter={() => setHoveredStat('themes')}
                onMouseLeave={() => setHoveredStat(null)}
              >
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{coarseClusters?.clusters.length || 0}</p>
                <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium uppercase tracking-wide">themes</p>
                <AnimatePresence>
                  {hoveredStat === 'themes' && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 rounded-lg text-xs text-white whitespace-nowrap z-20 shadow-lg"
                    >
                      Distinct patterns found
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div
                className="bg-white rounded-xl p-2.5 sm:p-3 text-center relative cursor-help border border-gray-200 shadow-sm"
                onMouseEnter={() => setHoveredStat('stories')}
                onMouseLeave={() => setHoveredStat(null)}
              >
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{storyComments.length}</p>
                <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium uppercase tracking-wide">stories</p>
                <AnimatePresence>
                  {hoveredStat === 'stories' && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 rounded-lg text-xs text-white whitespace-nowrap z-20 shadow-lg"
                    >
                      Personal experiences shared
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Listener Stories - Hidden on mobile in sidebar, shown on lg+ */}
            {storyComments.length > 0 && (
              <div className="hidden lg:block">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Listener Stories
                </h3>
                <div className="space-y-3">
                  {storyComments.slice(0, 5).map((story, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-3 sm:p-4 bg-white rounded-lg lg:rounded-xl border border-gray-200 shadow-sm"
                    >
                      <p className="text-xs sm:text-sm text-gray-600 italic leading-relaxed line-clamp-3">"{story.text}"</p>
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-2">@{story.authorDisplayName}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Mobile Stories Section - Horizontal scroll */}
            {storyComments.length > 0 && (
              <div className="lg:hidden mt-4">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Listener Stories
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 scrollbar-hide">
                  {storyComments.slice(0, 5).map((story, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex-shrink-0 w-64 sm:w-72 p-3 bg-white rounded-lg border border-gray-200 shadow-sm"
                    >
                      <p className="text-xs text-gray-600 italic leading-relaxed line-clamp-3">"{story.text}"</p>
                      <p className="text-[10px] text-gray-400 mt-2">@{story.authorDisplayName}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* RIGHT PANEL */}
          <main className="flex-1 min-h-[50vh] lg:min-h-[calc(100vh-65px)]">
            {/* Sticky Clarity Dial */}
            <div className="sticky top-[57px] sm:top-[65px] bg-white/95 backdrop-blur-xl border-b border-gray-200 p-3 sm:p-4 lg:p-6 z-10">
              <div className="max-w-2xl mx-auto">
                {/* First-time Hint */}
                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-sky-50 border border-sky-200 rounded-lg lg:rounded-xl p-3 lg:p-4 mb-3 lg:mb-4"
                    >
                      <p className="text-xs sm:text-sm text-gray-600">
                        💡 Drag the slider to see AI organize {comments.length} comments into clear themes.
                      </p>
                      <button
                        onClick={() => {
                          setShowHint(false)
                          localStorage.setItem('voxtube-dial-hint-dismissed', 'true')
                        }}
                        className="text-xs text-sky-500 hover:text-sky-600 mt-2 transition-colors"
                      >
                        Got it
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Labels above slider */}
                <div className="flex justify-between text-[9px] sm:text-[10px] text-gray-400 mb-2 sm:mb-3 px-4 sm:px-8">
                  {DIAL_LEVELS.map((level, idx) => (
                    <span
                      key={idx}
                      className={`uppercase tracking-wider transition-colors cursor-pointer hover:text-gray-600 ${
                        idx === dialLevel ? 'text-sky-500 font-medium' : ''
                      }`}
                      onClick={() => setDialLevel(idx as DialLevel)}
                    >
                      {level.label}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 sm:gap-6">
                  <div className="text-center">
                    <span className="text-xl sm:text-2xl">💬</span>
                  </div>

                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min="0"
                      max="3"
                      value={dialLevel}
                      onChange={(e) => setDialLevel(Number(e.target.value) as DialLevel)}
                      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-sky-500
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-sky-500 [&::-webkit-slider-thumb]:to-pink-500
                        [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-sky-500/30"
                    />
                    <div className="flex justify-between mt-1.5 sm:mt-2 px-1">
                      {[0, 1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors cursor-pointer ${
                            level <= dialLevel ? 'bg-sky-500' : 'bg-gray-300'
                          }`}
                          onClick={() => setDialLevel(level as DialLevel)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-xl sm:text-2xl">✨</span>
                  </div>
                </div>

                {/* Current level description */}
                <div className="text-center mt-3 lg:mt-4">
                  <p className="text-xs sm:text-sm text-gray-500">
                    <span className="text-base sm:text-lg mr-1.5 sm:mr-2">{DIAL_LEVELS[dialLevel].icon}</span>
                    {DIAL_LEVELS[dialLevel].description}
                  </p>

                  {/* Next level preview - hidden on mobile */}
                  {DIAL_LEVELS[dialLevel].preview && (
                    <p className="hidden sm:flex text-xs text-gray-400 mt-2 items-center justify-center gap-1">
                      <ChevronRight className="w-3 h-3" />
                      Next: {DIAL_LEVELS[dialLevel].preview}
                    </p>
                  )}

                  {/* What's this? */}
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="text-[10px] sm:text-xs text-gray-400 hover:text-gray-600 mt-2 sm:mt-3 flex items-center gap-1 mx-auto transition-colors"
                  >
                    <HelpCircle className="w-3 h-3" />
                    What's this?
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-3 sm:p-4 lg:p-6">
              <AnimatePresence mode="wait">
                {/* RAW VIEW */}
                {dialLevel === 0 && (
                  <motion.div
                    key="raw"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="max-w-2xl mx-auto"
                  >
                    <div className="flex items-center justify-between mb-4 lg:mb-6">
                      <h2 className="text-base sm:text-lg font-medium">{comments.length} comments</h2>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      {comments.slice(0, 50).map((comment, idx) => (
                        <div key={idx} className="p-3 sm:p-4 bg-white rounded-lg lg:rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex items-start gap-2 sm:gap-3">
                            {comment.authorProfileImageUrl ? (
                              <img
                                src={comment.authorProfileImageUrl}
                                alt=""
                                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-pink-100 flex items-center justify-center text-[10px] sm:text-xs flex-shrink-0 text-pink-500">
                                {comment.authorName.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-400">
                                <span className="font-medium text-gray-500 truncate">@{comment.authorName}</span>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-700 mt-1 leading-relaxed">{comment.text}</p>
                              {comment.likeCount > 0 && (
                                <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-gray-400">
                                  <ThumbsUp className="w-3 h-3" />
                                  {comment.likeCount}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* CLUSTERS VIEW */}
                {dialLevel === 1 && fineClusters && (
                  <motion.div
                    key="clusters"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <div className="flex items-center justify-between mb-4 lg:mb-6">
                      <h2 className="text-base sm:text-lg font-medium">{fineClusters.clusters.length} clusters found</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {fineClusters.clusters.slice(0, 12).map((cluster, idx) => (
                        <div key={idx} className="p-3 sm:p-4 lg:p-5 bg-white rounded-lg lg:rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-2 sm:mb-3">
                            <div className="px-2 py-0.5 sm:py-1 bg-sky-100 rounded-full text-[10px] sm:text-xs text-sky-600">
                              {cluster.commentIndices.length} comments
                            </div>
                          </div>
                          <div className="space-y-1.5 sm:space-y-2">
                            {cluster.commentIndices.slice(0, 3).map((i) => (
                              <p key={i} className="text-[10px] sm:text-xs text-gray-500 line-clamp-2">
                                "{comments[i]?.text}"
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* THEMES VIEW */}
                {dialLevel === 2 && coarseClusters && (
                  <motion.div
                    key="themes"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="max-w-2xl mx-auto"
                  >
                    <div className="flex items-center justify-between mb-4 lg:mb-6">
                      <h2 className="text-base sm:text-lg font-medium">{clusterNames.length} themes identified</h2>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      {coarseClusters.clusters.map((cluster, idx) => {
                        const name = clusterNames.find((n) => n.clusterId === cluster.id)
                        return (
                          <div key={idx} className="p-4 sm:p-5 lg:p-6 bg-white/[0.02] rounded-lg lg:rounded-xl border border-white/5">
                            <div className="flex items-start justify-between mb-3 sm:mb-4">
                              <h3 className="text-base sm:text-lg font-medium text-white">
                                {name?.name || `Cluster ${idx + 1}`}
                              </h3>
                              <span className="text-[10px] sm:text-xs text-zinc-500 flex-shrink-0 ml-2">
                                {cluster.commentIndices.length} voices
                              </span>
                            </div>
                            <div className="space-y-1.5 sm:space-y-2">
                              {cluster.commentIndices.slice(0, 3).map((i) => (
                                <p key={i} className="text-xs sm:text-sm text-zinc-400 italic line-clamp-2">
                                  "{comments[i]?.text}"
                                </p>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}

                {/* REFINED VIEW */}
                {dialLevel === 3 && (
                  <motion.div
                    key="refined"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="max-w-2xl mx-auto"
                  >
                    <div className="p-4 sm:p-6 lg:p-8 bg-white rounded-xl lg:rounded-2xl border border-gray-200 shadow-sm">
                      <h2 className="text-lg sm:text-xl font-medium mb-4 sm:mb-6 flex items-center gap-2 text-gray-900">
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />
                        AI Summary
                      </h2>

                      {/* Prose Summary */}
                      {proseSummary && (
                        <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6 sm:mb-8">
                          {proseSummary}
                        </p>
                      )}

                      {/* Theme breakdown */}
                      <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                        <h3 className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider">Themes Found</h3>
                        {coarseClusters?.clusters.map((cluster, idx) => {
                          const name = clusterNames.find((n) => n.clusterId === cluster.id)
                          return (
                            <div key={idx} className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 last:border-0">
                              <span className="text-xs sm:text-sm text-gray-700">{name?.name || `Theme ${idx + 1}`}</span>
                              <span className="text-[10px] sm:text-sm text-gray-400">{cluster.commentIndices.length} voices</span>
                            </div>
                          )
                        })}
                      </div>

                      <div className="pt-4 sm:pt-6 border-t border-gray-100">
                        <p className="text-[10px] sm:text-xs text-gray-400">
                          This is one interpretation of {comments.length} voices. Drag left to explore the raw data yourself.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      )}

      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowVideoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowVideoModal(false)}
                className="absolute -top-10 sm:-top-12 right-0 p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div className="aspect-video rounded-lg sm:rounded-xl overflow-hidden bg-black">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                  title={video?.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setShowHelpModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#0a0a0f] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-medium text-white">The Clarity Dial</h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-zinc-400">
                <p>
                  The clarity dial lets you control how much AI processing is applied to the comments.
                </p>

                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <span className="text-base sm:text-lg">💬</span>
                    <div>
                      <p className="text-white font-medium text-sm">Raw</p>
                      <p className="text-[10px] sm:text-xs">See all comments unfiltered</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <span className="text-base sm:text-lg">🔮</span>
                    <div>
                      <p className="text-white font-medium text-sm">Clusters</p>
                      <p className="text-[10px] sm:text-xs">Similar comments grouped together</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <span className="text-base sm:text-lg">🏷️</span>
                    <div>
                      <p className="text-white font-medium text-sm">Themes</p>
                      <p className="text-[10px] sm:text-xs">AI-generated labels for each group</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <span className="text-base sm:text-lg">✨</span>
                    <div>
                      <p className="text-white font-medium text-sm">Summary</p>
                      <p className="text-[10px] sm:text-xs">Synthesized overview of all voices</p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] sm:text-xs text-zinc-600 pt-2 border-t border-white/5">
                  Slide right to increase clarity. Each level builds on the previous one.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Player */}
      <AnimatePresence>
        {showMiniPlayer && videoId && (
          <MiniPlayer
            videoId={videoId}
            title={video?.title}
            onClose={() => setShowMiniPlayer(false)}
            onExpand={() => {
              setShowMiniPlayer(false)
              setShowVideoModal(true)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
