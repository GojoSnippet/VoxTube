import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface VoxLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  subtitle?: string
}

const sizes = {
  sm: { icon: 32, text: 'text-xl', subtitle: 'text-[11px]' },
  md: { icon: 44, text: 'text-2xl', subtitle: 'text-sm' },
  lg: { icon: 64, text: 'text-4xl sm:text-5xl md:text-6xl', subtitle: 'text-xs sm:text-sm md:text-base' },
}

export function VoxLogo({ size = 'md', showText = true, subtitle }: VoxLogoProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Responsive icon sizes for lg
  const iconSize = size === 'lg' ? 'w-12 h-8 sm:w-16 sm:h-10 md:w-20 md:h-12' : ''

  return (
    <div
      className="flex flex-col items-center gap-2 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Icon */}
        <svg
          width={sizes[size].icon}
          height={sizes[size].icon * 0.6}
          viewBox="0 0 80 48"
          fill="none"
          className={size === 'lg' ? 'w-10 h-6 sm:w-12 sm:h-8 md:w-14 md:h-9' : ''}
        >
        <rect x="0" y="4" width="80" height="40" rx="20" fill="url(#logoGradient)" />
        <defs>
          <linearGradient id="logoGradient" x1="0" y1="24" x2="80" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0ea5e9" />
            <stop offset="1" stopColor="#ec4899" />
          </linearGradient>
        </defs>
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
            'font-bold tracking-[-0.02em] text-gray-900',
            sizes[size].text
          )}
        >
          VoxTube
        </span>
      )}
      </div>
      
      {/* Subtitle for clarity */}
      {subtitle && (
        <p className={cn(
          'text-gray-500 font-medium tracking-[0.05em] uppercase',
          sizes[size].subtitle
        )}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
