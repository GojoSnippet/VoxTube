import { motion } from 'framer-motion'
import { X, Maximize2 } from 'lucide-react'

interface MiniPlayerProps {
  videoId: string
  title?: string
  onClose: () => void
  onExpand?: () => void
}

export function MiniPlayer({ videoId, title, onClose, onExpand }: MiniPlayerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:right-4 sm:left-auto z-50 shadow-2xl shadow-black/50 sm:rounded-xl overflow-hidden border-t sm:border border-white/10"
    >
      {/* Video */}
      <div className="w-full sm:w-80 aspect-video bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Controls bar */}
      <div className="bg-[#0a0a0f] px-3 sm:px-3 py-2 sm:py-2 flex items-center justify-between">
        <span className="text-xs text-zinc-400 truncate max-w-[calc(100%-60px)] sm:max-w-[200px]">
          {title || 'Now playing'}
        </span>
        <div className="flex items-center gap-2">
          {onExpand && (
            <button
              onClick={onExpand}
              className="text-zinc-500 hover:text-white transition-colors p-1.5 sm:p-1"
              title="Expand"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1.5 sm:p-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
