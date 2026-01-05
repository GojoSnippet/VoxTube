import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface VoxLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

const sizes = {
  sm: { icon: 32, text: 'text-xl' },
  md: { icon: 48, text: 'text-3xl' },
  lg: { icon: 80, text: 'text-6xl' },
}

export function VoxLogo({ size = 'md', showText = true }: VoxLogoProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="flex items-center gap-3 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Icon */}
      <svg
        width={sizes[size].icon}
        height={sizes[size].icon * 0.6}
        viewBox="0 0 80 48"
        fill="none"
      >
        <rect x="0" y="4" width="80" height="40" rx="20" fill="#6366f1" />
        <circle cx="24" cy="24" r="6" fill="white" />

        {/* Sound waves with pulse animation on hover */}
        <motion.path
          d="M36 14 Q44 24 36 34"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          animate={isHovered ? {
            opacity: [1, 0.6, 1],
            scale: [1, 1.05, 1],
          } : {}}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: '40px 24px' }}
        />
        <motion.path
          d="M46 10 Q56 24 46 38"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          animate={isHovered ? {
            opacity: [0.8, 1, 0.8],
            scale: [1, 1.08, 1],
          } : {}}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.15,
          }}
          style={{ transformOrigin: '51px 24px' }}
        />
        <motion.path
          d="M56 6 Q68 24 56 42"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          animate={isHovered ? {
            opacity: [0.6, 1, 0.6],
            scale: [1, 1.1, 1],
          } : {}}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
          style={{ transformOrigin: '62px 24px' }}
        />
      </svg>

      {/* Text */}
      {showText && (
        <span
          className={cn(
            'font-bold tracking-tight text-white',
            sizes[size].text
          )}
        >
          VoxTube
        </span>
      )}
    </div>
  )
}
