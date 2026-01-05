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
      <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center gap-4">
        <span className="text-6xl">{errorMsg.icon}</span>
        <h2 className="text-2xl font-semibold">{errorMsg.title}</h2>
        <p className="text-zinc-400">{errorMsg.subtitle}</p>
        <Link to="/" className="mt-4 flex items-center gap-2 text-indigo-400 hover:text-indigo-300">
          <ArrowLeft className="w-4 h-4" /> Try a different song
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center gap-4 px-6 py-4 bg-[#050508]/80 backdrop-blur-xl border-b border-white/5">
        <Link to="/">
          <VoxLogo size="sm" showText={false} />
        </Link>

        <div className="flex-1 max-w-md mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search music videos"
            className="w-full h-10 pl-10 bg-white/5 border-white/10 text-sm"
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
        <div className="flex">
          {/* LEFT PANEL */}
          <aside className="w-[35%] min-w-[320px] max-w-[400px] border-r border-white/5 p-6 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
            {/* Video Info */}
            {video && (
              <div className="mb-8">
                <div
                  className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group mb-4"
                  onClick={() => setShowMiniPlayer(true)}
                >
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    Listen while reading
                  </div>
                </div>
                <h1 className="text-lg font-semibold leading-tight">{video.title}</h1>
                <p className="text-sm text-zinc-500 mt-1">{video.channelTitle}</p>
                <p className="text-sm text-zinc-600 mt-1">{video.viewCount}</p>
              </div>
            )}

            {/* Quick Stats with Tooltips */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div
                className="bg-white/5 rounded-xl p-3 text-center relative cursor-help"
                onMouseEnter={() => setHoveredStat('analyzed')}
                onMouseLeave={() => setHoveredStat(null)}
              >
                <p className="text-xl font-semibold text-white">{comments.length}</p>
                <p className="text-xs text-zinc-500">analyzed</p>
                <AnimatePresence>
                  {hoveredStat === 'analyzed' && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 rounded-lg text-xs text-zinc-300 whitespace-nowrap z-20"
                    >
                      Comments processed by AI
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div
                className="bg-white/5 rounded-xl p-3 text-center relative cursor-help"
                onMouseEnter={() => setHoveredStat('themes')}
                onMouseLeave={() => setHoveredStat(null)}
              >
                <p className="text-xl font-semibold text-white">{coarseClusters?.clusters.length || 0}</p>
                <p className="text-xs text-zinc-500">themes</p>
                <AnimatePresence>
                  {hoveredStat === 'themes' && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 rounded-lg text-xs text-zinc-300 whitespace-nowrap z-20"
                    >
                      Distinct patterns found
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div
                className="bg-white/5 rounded-xl p-3 text-center relative cursor-help"
                onMouseEnter={() => setHoveredStat('stories')}
                onMouseLeave={() => setHoveredStat(null)}
              >
                <p className="text-xl font-semibold text-white">{storyComments.length}</p>
                <p className="text-xs text-zinc-500">stories</p>
                <AnimatePresence>
                  {hoveredStat === 'stories' && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 rounded-lg text-xs text-zinc-300 whitespace-nowrap z-20"
                    >
                      Personal experiences shared
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Listener Stories */}
            {storyComments.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
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
                      className="p-4 bg-white/[0.03] rounded-xl border border-white/5"
                    >
                      <p className="text-sm text-zinc-300 italic leading-relaxed">"{story.text}"</p>
                      <p className="text-xs text-zinc-600 mt-2">@{story.authorDisplayName}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* RIGHT PANEL */}
          <main className="flex-1 min-h-[calc(100vh-73px)]">
            {/* Sticky Clarity Dial */}
            <div className="sticky top-[73px] bg-[#050508]/95 backdrop-blur-xl border-b border-white/5 p-6 z-10">
              <div className="max-w-2xl mx-auto">
                {/* First-time Hint */}
                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-4"
                    >
                      <p className="text-sm text-zinc-300">
                        💡 Drag the slider to see AI organize {comments.length} comments into clear themes.
                      </p>
                      <button
                        onClick={() => {
                          setShowHint(false)
                          localStorage.setItem('voxtube-dial-hint-dismissed', 'true')
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 transition-colors"
                      >
                        Got it
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Labels above slider */}
                <div className="flex justify-between text-[10px] text-zinc-600 mb-3 px-8">
                  {DIAL_LEVELS.map((level, idx) => (
                    <span
                      key={idx}
                      className={`uppercase tracking-wider transition-colors cursor-pointer hover:text-zinc-400 ${
                        idx === dialLevel ? 'text-indigo-400 font-medium' : ''
                      }`}
                      onClick={() => setDialLevel(idx as DialLevel)}
                    >
                      {level.label}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <span className="text-2xl">💬</span>
                  </div>

                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min="0"
                      max="3"
                      value={dialLevel}
                      onChange={(e) => setDialLevel(Number(e.target.value) as DialLevel)}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500
                        [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-indigo-500/50"
                    />
                    <div className="flex justify-between mt-2 px-1">
                      {[0, 1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${
                            level <= dialLevel ? 'bg-indigo-500' : 'bg-white/20'
                          }`}
                          onClick={() => setDialLevel(level as DialLevel)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-2xl">✨</span>
                  </div>
                </div>

                {/* Current level description */}
                <div className="text-center mt-4">
                  <p className="text-sm text-zinc-400">
                    <span className="text-lg mr-2">{DIAL_LEVELS[dialLevel].icon}</span>
                    {DIAL_LEVELS[dialLevel].description}
                  </p>

                  {/* Next level preview */}
                  {DIAL_LEVELS[dialLevel].preview && (
                    <p className="text-xs text-zinc-600 mt-2 flex items-center justify-center gap-1">
                      <ChevronRight className="w-3 h-3" />
                      Next: {DIAL_LEVELS[dialLevel].preview}
                    </p>
                  )}

                  {/* What's this? */}
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="text-xs text-zinc-600 hover:text-zinc-400 mt-3 flex items-center gap-1 mx-auto transition-colors"
                  >
                    <HelpCircle className="w-3 h-3" />
                    What's this?
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6">
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
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-medium">{comments.length} comments</h2>
                    </div>
                    <div className="space-y-3">
                      {comments.slice(0, 50).map((comment, idx) => (
                        <div key={idx} className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                          <div className="flex items-start gap-3">
                            {comment.authorProfileImageUrl ? (
                              <img
                                src={comment.authorProfileImageUrl}
                                alt=""
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs">
                                {comment.authorName.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <span className="font-medium text-zinc-400">@{comment.authorName}</span>
                              </div>
                              <p className="text-sm text-zinc-300 mt-1 leading-relaxed">{comment.text}</p>
                              {comment.likeCount > 0 && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-zinc-600">
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
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-medium">{fineClusters.clusters.length} clusters found</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {fineClusters.clusters.slice(0, 12).map((cluster, idx) => (
                        <div key={idx} className="p-5 bg-white/[0.02] rounded-xl border border-white/5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="px-2 py-1 bg-indigo-500/20 rounded-full text-xs text-indigo-300">
                              {cluster.commentIndices.length} comments
                            </div>
                          </div>
                          <div className="space-y-2">
                            {cluster.commentIndices.slice(0, 3).map((i) => (
                              <p key={i} className="text-xs text-zinc-400 line-clamp-2">
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
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-medium">{clusterNames.length} themes identified</h2>
                    </div>
                    <div className="space-y-4">
                      {coarseClusters.clusters.map((cluster, idx) => {
                        const name = clusterNames.find((n) => n.clusterId === cluster.id)
                        return (
                          <div key={idx} className="p-6 bg-white/[0.02] rounded-xl border border-white/5">
                            <div className="flex items-start justify-between mb-4">
                              <h3 className="text-lg font-medium text-white">
                                {name?.name || `Cluster ${idx + 1}`}
                              </h3>
                              <span className="text-xs text-zinc-500">
                                {cluster.commentIndices.length} voices
                              </span>
                            </div>
                            <div className="space-y-2">
                              {cluster.commentIndices.slice(0, 3).map((i) => (
                                <p key={i} className="text-sm text-zinc-400 italic">
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
                    <div className="p-8 bg-white/[0.02] rounded-2xl border border-white/5">
                      <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        AI Summary
                      </h2>

                      {/* Prose Summary */}
                      {proseSummary && (
                        <p className="text-zinc-300 leading-relaxed mb-8">
                          {proseSummary}
                        </p>
                      )}

                      {/* Theme breakdown */}
                      <div className="space-y-3 mb-8">
                        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Themes Found</h3>
                        {coarseClusters?.clusters.map((cluster, idx) => {
                          const name = clusterNames.find((n) => n.clusterId === cluster.id)
                          return (
                            <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                              <span className="text-zinc-300">{name?.name || `Theme ${idx + 1}`}</span>
                              <span className="text-sm text-zinc-500">{cluster.commentIndices.length} voices</span>
                            </div>
                          )
                        })}
                      </div>

                      <div className="pt-6 border-t border-white/5">
                        <p className="text-xs text-zinc-600">
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowVideoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowVideoModal(false)}
                className="absolute -top-12 right-0 p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="aspect-video rounded-xl overflow-hidden bg-black">
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowHelpModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">The Clarity Dial</h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm text-zinc-400">
                <p>
                  The clarity dial lets you control how much AI processing is applied to the comments.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">💬</span>
                    <div>
                      <p className="text-white font-medium">Raw</p>
                      <p className="text-xs">See all comments unfiltered</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-lg">🔮</span>
                    <div>
                      <p className="text-white font-medium">Clusters</p>
                      <p className="text-xs">Similar comments grouped together</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-lg">🏷️</span>
                    <div>
                      <p className="text-white font-medium">Themes</p>
                      <p className="text-xs">AI-generated labels for each group</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-lg">✨</span>
                    <div>
                      <p className="text-white font-medium">Summary</p>
                      <p className="text-xs">Synthesized overview of all voices</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 pt-2 border-t border-white/5">
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
