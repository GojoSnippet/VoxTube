import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { funFacts } from '@/config/funFacts'
import { Loader2 } from 'lucide-react'

const loadingMessages = [
  "Fetching comments...",
  "Reading thousands of opinions...",
  "Clustering similar voices...",
  "Finding patterns...",
  "Synthesizing voices...",
  "Almost there...",
]

interface LoadingScreenProps {
  stage?: string
}

export function LoadingScreen({ stage }: LoadingScreenProps) {
  const [factIndex, setFactIndex] = useState(
    Math.floor(Math.random() * funFacts.length)
  )
  const [messageIndex, setMessageIndex] = useState(0)

  // Rotate fun facts every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex(prev => (prev + 1) % funFacts.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Rotate loading messages every 2 seconds (only if no stage provided)
  useEffect(() => {
    if (stage) return
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % loadingMessages.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [stage])

  const displayMessage = stage || loadingMessages[messageIndex]

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {/* Spinner */}
      <div className="relative">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <div className="absolute inset-0 w-12 h-12 rounded-full bg-indigo-500/20 animate-pulse" />
      </div>

      {/* Loading message */}
      <p className="mt-6 text-zinc-400 animate-pulse text-sm">
        {displayMessage}
      </p>

      {/* Divider */}
      <div className="w-48 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent my-8" />

      {/* Fun fact */}
      <div className="text-center max-w-md px-4">
        <p className="text-xs text-zinc-600 mb-3 flex items-center justify-center gap-2">
          <span>💡</span> Did you know?
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={factIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-zinc-500 leading-relaxed"
          >
            "{funFacts[factIndex]}"
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
