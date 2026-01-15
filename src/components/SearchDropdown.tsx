import { motion, AnimatePresence } from 'framer-motion'
import { VideoDetails } from '@/utils/youtube'
import { Loader2 } from 'lucide-react'

interface SearchDropdownProps {
  results: VideoDetails[]
  loading: boolean
  onSelect: (video: VideoDetails) => void
}

export function SearchDropdown({ results, loading, onSelect }: SearchDropdownProps) {
  if (!loading && results.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="absolute top-full left-0 right-0 mt-2 bg-white/98 backdrop-blur-xl border border-gray-200 rounded-xl overflow-hidden shadow-xl z-50 max-h-[60vh] overflow-y-auto"
      >
        {loading ? (
          <div className="px-4 py-4 flex items-center gap-3 text-[13px] text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
            Searching...
          </div>
        ) : (
          <div className="py-1">
            {results.map((video, index) => (
              <motion.button
                key={video.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelect(video)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-all duration-150 text-left group"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-16 h-9 sm:w-20 sm:h-11 object-cover rounded-lg ring-1 ring-gray-200"
                  />
                  <div className="absolute inset-0 bg-sky-500/0 group-hover:bg-sky-500/10 rounded-lg transition-colors duration-150" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] sm:text-sm text-gray-700 truncate group-hover:text-gray-900 transition-colors font-medium">
                    {video.title}
                  </p>
                  <p className="text-[11px] sm:text-xs text-gray-400 truncate mt-0.5">
                    {video.channelTitle} • {video.viewCount}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
