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
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-full left-0 right-0 mt-3 bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 z-50"
      >
        {loading ? (
          <div className="px-5 py-4 flex items-center gap-3 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching...
          </div>
        ) : (
          <div className="py-2">
            {results.map((video, index) => (
              <motion.button
                key={video.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelect(video)
                }}
                className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.05] transition-all duration-200 text-left group"
              >
                <div className="relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-20 h-11 object-cover rounded-lg ring-1 ring-white/10"
                  />
                  <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 rounded-lg transition-colors duration-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate group-hover:text-white transition-colors">
                    {video.title}
                  </p>
                  <p className="text-xs text-zinc-600 truncate mt-0.5">
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
