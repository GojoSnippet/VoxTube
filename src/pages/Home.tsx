import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Shuffle, ArrowRight, Github, HelpCircle, Sparkles } from 'lucide-react'
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
    <div className="min-h-screen bg-[#050508] text-white overflow-hidden">
      {/* Premium gradient background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Pro move toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full text-sm text-white shadow-xl"
          >
            Pro move 😎
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pb-20">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <VoxLogo size="lg" />
        </motion.div>

        {/* Rotating Tagline */}
        <motion.div
          className="mt-5 h-8 relative"
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
              className="text-lg font-medium bg-gradient-to-r from-zinc-400 to-zinc-500 bg-clip-text text-transparent"
            >
              {TAGLINES[taglineIndex]}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Description */}
        <motion.div
          className="mt-4 max-w-2xl text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm text-zinc-500">
            Popular songs have thousands of comments — but nobody reads them all.
            <span className="text-zinc-400"> VoxTube uses AI to analyze what people actually feel.</span>
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          className="mt-10 w-full max-w-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                ref={inputRef}
                type="text"
                placeholder={PLACEHOLDERS[placeholderIndex]}
                className="w-full h-16 pl-14 pr-14 bg-white/[0.03] border border-white/10 text-white placeholder:text-zinc-600 rounded-2xl focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all duration-300 text-[15px]"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setEmptySearchMessage('')
                }}
                onFocus={() => query && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <kbd className="absolute right-5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs bg-white/5 text-zinc-500 rounded-lg border border-white/10 hidden sm:block font-mono">
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
          className="mt-6 flex flex-col sm:flex-row gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            size="lg"
            className="relative bg-indigo-500 hover:bg-indigo-400 text-white font-medium px-8 h-12 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
            onClick={handleSearch}
            disabled={results.length === 0 && query.trim() !== ''}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Analyze
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
              className="border-white/10 bg-white/[0.02] text-zinc-300 hover:text-white hover:bg-white/[0.05] hover:border-white/20 w-full px-8 h-12 rounded-xl transition-all duration-300"
              onClick={handleRandomSong}
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Random Song
            </Button>

            {/* Preview tooltip */}
            <AnimatePresence>
              {isRandomHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl text-xs text-zinc-400 whitespace-nowrap shadow-xl"
                >
                  Maybe: <span className="text-white font-medium">{previewSong.name}</span>?
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Example CTA */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={() => navigate(`/visualize/${exampleSong.id}`)}
            className="group flex items-center gap-4 px-6 py-4 bg-white/[0.02] border border-white/10 rounded-2xl hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300"
          >
            <span className="text-[11px] uppercase tracking-widest text-zinc-600 font-medium">
              Try an example
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={exampleSong.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className="text-white font-medium"
              >
                {exampleSong.name}
              </motion.span>
            </AnimatePresence>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all duration-300" />
          </button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full py-8 text-center">
        <div className="flex items-center justify-center gap-6 text-sm">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1.5"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <span className="text-zinc-800">·</span>
          <button
            onClick={() =>
              alert(
                'VoxTube uses OpenAI embeddings to cluster YouTube comments and find patterns in what people are saying.'
              )
            }
            className="text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1.5"
          >
            <HelpCircle className="h-4 w-4" />
            How it works
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-700">{footerTagline} · Sai · 2025</p>
      </footer>
    </div>
  )
}
