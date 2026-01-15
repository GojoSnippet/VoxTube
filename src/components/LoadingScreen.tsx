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
    <div className="flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[60vh] px-4">
      {/* Spinner */}
      <div className="relative">
        <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-sky-500 animate-spin" />
        <div className="absolute inset-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-sky-500/20 animate-pulse" />
      </div>

      {/* Loading message */}
      <p className="mt-4 sm:mt-6 text-gray-500 animate-pulse text-xs sm:text-sm text-center">
        {displayMessage}
      </p>

      {/* Divider */}
      <div className="w-32 sm:w-48 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-6 sm:my-8" />

      {/* Fun fact */}
      <div className="text-center max-w-sm sm:max-w-md px-2">
        <p className="text-[10px] sm:text-xs text-gray-400 mb-2 sm:mb-3 flex items-center justify-center gap-2">
          <span>💡</span> Did you know?
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={factIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-xs sm:text-sm text-gray-500 leading-relaxed"
          >
            "{funFacts[factIndex]}"
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
