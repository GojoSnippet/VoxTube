import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Shuffle, ArrowRight, HelpCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoxLogo } from '@/components/VoxLogo'
import { SearchDropdown } from '@/components/SearchDropdown'
import { searchVideos, VideoDetails } from '@/utils/youtube'
import { getRandomSong } from '@/config/songs'

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || ''

// Rotating taglines
const TAGLINES = [
  'Hear what thousands are saying',
  'Decoding the comment section chaos',
  'Where opinions become insights',
  '10 million hot takes, analyzed',
  'The vibe check you didn\'t know you needed',
]

// Rotating placeholders
const PLACEHOLDERS = [
  'Search for a song...',
  'What\'s stuck in your head?',
  'What song hits different?',
  'Name a banger...',
  'What should we decode?',
]

// Fun footer taglines
const FOOTER_TAGLINES = [
  'Built with coffee and mass curiosity',
  'Powered by caffeine and comment chaos',
  'Made with mass analysis of internet opinions',
  'Shipped at 2am, no regrets',
]

export default function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VideoDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Rotating state
  const [taglineIndex, setTaglineIndex] = useState(0)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [isRandomHovered, setIsRandomHovered] = useState(false)
  const [previewSong, setPreviewSong] = useState(() => getRandomSong())
  const [showToast, setShowToast] = useState(false)
  const [emptySearchMessage, setEmptySearchMessage] = useState('')

  // Random footer tagline (picked once on mount)
  const footerTagline = useMemo(
    () => FOOTER_TAGLINES[Math.floor(Math.random() * FOOTER_TAGLINES.length)],
    []
  )

  // Rotating example song
  const [exampleSong, setExampleSong] = useState(() => getRandomSong())

  // Rotate taglines every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Rotate placeholders every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Rotate example song every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setExampleSong(getRandomSong())
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Change preview song every 2s while hovering Random Song
  useEffect(() => {
    if (!isRandomHovered) return
    const interval = setInterval(() => {
      setPreviewSong(getRandomSong())
    }, 2000)
    return () => clearInterval(interval)
  }, [isRandomHovered])

  // Search effect with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }

    if (!API_KEY) return

    const timeoutId = setTimeout(() => {
      setLoading(true)
      setShowDropdown(true)
      searchVideos(query, API_KEY, 5)
        .then(setResults)
        .finally(() => setLoading(false))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
        setShowToast(true)
        setTimeout(() => setShowToast(false), 1500)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleVideoSelect = (video: VideoDetails) => {
    setShowDropdown(false)
    setQuery('')
    navigate(`/visualize/${video.id}`)
  }

  const handleRandomSong = useCallback(() => {
    const song = getRandomSong()
    navigate(`/visualize/${song.id}`)
  }, [navigate])

  const handleSearch = () => {
    if (!query.trim()) {
      setEmptySearchMessage('Even silence has something to say. Try a song!')
      setTimeout(() => setEmptySearchMessage(''), 3000)
      return
    }
    if (results.length > 0) {
      handleVideoSelect(results[0])
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 overflow-hidden">
      {/* Soft gradient background - light mode */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/50 via-transparent to-transparent" />
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[300px] sm:w-[500px] md:w-[700px] h-[300px] sm:h-[400px] md:h-[500px] bg-gradient-to-br from-sky-200/40 to-pink-200/30 rounded-full blur-[60px] sm:blur-[80px] md:blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[-10%] w-[200px] sm:w-[300px] md:w-[400px] h-[200px] sm:h-[300px] md:h-[400px] bg-gradient-to-tl from-pink-200/30 to-sky-200/20 rounded-full blur-[50px] sm:blur-[70px] md:blur-[90px]" />
        <div className="absolute top-1/3 left-[-5%] w-[150px] sm:w-[200px] h-[150px] sm:h-[200px] bg-sky-200/20 rounded-full blur-[40px] sm:blur-[60px]" />
      </div>

      {/* Pro move toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white/90 backdrop-blur-xl border border-gray-200 rounded-full text-sm text-gray-800 shadow-lg"
          >
            Pro move 😎
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-5 sm:px-6 md:px-8 py-16 sm:py-20">
        {/* Logo with subtitle for clarity */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <VoxLogo size="lg" subtitle="YouTube Comment Analyzer" />
        </motion.div>

        {/* Rotating Tagline */}
        <motion.div
          className="mt-3 sm:mt-4 md:mt-5 h-7 md:h-8 relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={taglineIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="text-base sm:text-lg md:text-xl font-medium bg-gradient-to-r from-gray-600 via-gray-700 to-gray-600 bg-clip-text text-transparent text-center px-4"
            >
              {TAGLINES[taglineIndex]}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Description */}
        <motion.div
          className="mt-3 md:mt-4 max-w-xs sm:max-w-md md:max-w-2xl text-center px-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm sm:text-base md:text-lg text-gray-500 leading-relaxed font-light">
            Popular songs have thousands of comments — but nobody reads them all.
            <span className="text-gray-700 font-normal"> VoxTube uses AI to analyze what people actually feel.</span>
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          className="mt-6 sm:mt-8 md:mt-10 w-full max-w-[calc(100%-1rem)] sm:max-w-md md:max-w-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-sky-300/30 via-pink-300/20 to-sky-300/30 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

            <div className="relative">
              <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 h-5 w-5 md:h-6 md:w-6 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder={PLACEHOLDERS[placeholderIndex]}
                className="w-full h-14 sm:h-[60px] md:h-16 pl-13 md:pl-14 pr-4 md:pr-14 bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-2xl focus:outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100 transition-all duration-300 text-base md:text-lg font-normal shadow-sm"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setEmptySearchMessage('')
                }}
                onFocus={() => query && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <kbd className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 px-2 md:px-2.5 py-1 text-xs bg-gray-100 text-gray-500 rounded-lg border border-gray-200 hidden sm:block font-mono">
                /
              </kbd>
            </div>

            {/* Search Dropdown */}
            {showDropdown && (
              <SearchDropdown
                results={results}
                loading={loading}
                onSelect={handleVideoSelect}
              />
            )}
          </div>

          {/* Empty search easter egg */}
          <AnimatePresence>
            {emptySearchMessage && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 text-sm text-amber-400/80 text-center"
              >
                {emptySearchMessage}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Buttons */}
        <motion.div
          className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 w-full max-w-[calc(100%-1rem)] sm:max-w-md md:max-w-none md:w-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            size="lg"
            className="relative bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-semibold px-8 h-[52px] sm:h-14 rounded-xl shadow-lg shadow-sky-500/30 hover:shadow-sky-400/40 transition-all duration-300 text-base w-full sm:w-auto tracking-wide"
            onClick={handleSearch}
            disabled={results.length === 0 && query.trim() !== ''}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Analyze Comments
          </Button>

          {/* Random Song Button with hover preview */}
          <div
            className="relative"
            onMouseEnter={() => setIsRandomHovered(true)}
            onMouseLeave={() => setIsRandomHovered(false)}
          >
            <Button
              size="lg"
              variant="outline"
              className="border-gray-200 bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300 w-full sm:w-auto px-8 h-[52px] sm:h-14 rounded-xl transition-all duration-300 text-base font-medium shadow-sm"
              onClick={handleRandomSong}
            >
              <Shuffle className="mr-2 h-5 w-5" />
              Surprise Me
            </Button>

            {/* Preview tooltip - hidden on mobile */}
            <AnimatePresence>
              {isRandomHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="hidden sm:block absolute top-full left-1/2 -translate-x-1/2 mt-3 px-4 py-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl text-xs text-gray-500 whitespace-nowrap shadow-lg"
                >
                  Maybe: <span className="text-gray-900 font-medium">{previewSong.name}</span>?
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Example CTA */}
        <motion.div
          className="mt-10 sm:mt-12 md:mt-16 w-full max-w-[calc(100%-1rem)] sm:max-w-none sm:w-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={() => navigate(`/visualize/${exampleSong.id}`)}
            className="group flex items-center justify-center gap-3 w-full sm:w-auto px-6 py-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-sky-300 transition-all duration-300 shadow-sm"
          >
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-gray-400 font-medium">
              Try it
            </span>
            <span className="text-gray-300">•</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={exampleSong.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className="text-pink-500 font-medium text-[13px] sm:text-sm truncate max-w-[160px] sm:max-w-[200px]"
              >
                {exampleSong.name}
              </motion.span>
            </AnimatePresence>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-pink-500 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
          </button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full py-5 sm:py-6 text-center px-4">
        <button
          onClick={() =>
            alert(
              'VoxTube analyzes YouTube comments using AI:\n\n1. Fetches comments from any YouTube video\n2. Uses OpenAI embeddings to understand meaning\n3. Clusters similar comments together\n4. Names themes with AI\n5. Generates a summary of what people are saying\n\nPerfect for understanding what the crowd really thinks!'
            )
          }
          className="text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-2 mx-auto text-[13px] sm:text-sm font-medium"
        >
          <HelpCircle className="h-4 w-4" />
          How it works
        </button>
        <p className="mt-3 text-[11px] text-gray-400 font-light">{footerTagline}</p>
      </footer>
    </div>
  )
}
