export type DialLevel = 'voices' | 'clusters' | 'themes' | 'consensus'

interface MeaningDialProps {
  level: DialLevel
  onChange: (level: DialLevel) => void
  disabled?: boolean
}

const LEVELS: DialLevel[] = ['voices', 'clusters', 'themes', 'consensus']

const LEVEL_CONFIG: Record<DialLevel, {
  microcopy: string
}> = {
  voices: {
    microcopy: '1x (no compression): Raw voices in their own words.'
  },
  clusters: {
    microcopy: '5x: Light AI clustering.'
  },
  themes: {
    microcopy: '20x: AI suggests names for patterns.'
  },
  consensus: {
    microcopy: '100x (full compression): AI summaries of voices.'
  }
}

export function MeaningDial({ level, onChange, disabled }: MeaningDialProps) {
  const currentIndex = LEVELS.indexOf(level)

  const handleClick = (newLevel: DialLevel) => {
    if (!disabled) {
      onChange(newLevel)
    }
  }

  return (
    <div className="meaning-dial">
      {/* Title */}
      <div className="dial-title">
        <span className="dial-title-main">CLARITY DIAL</span>
      </div>

      {/* Endcaps + Track */}
      <div className="dial-container">
        <div className="dial-endcap dial-endcap-left">
          <span className="endcap-icon">" "</span>
          <span className="endcap-label">Raw</span>
          <span className="endcap-sub">unfiltered</span>
        </div>

        <div className="dial-track">
          {LEVELS.map((l, i) => (
            <button
              key={l}
              className={`dial-stop ${level === l ? 'active' : ''} ${i <= currentIndex ? 'reached' : ''}`}
              onClick={() => handleClick(l)}
              disabled={disabled}
            >
              <span className={`dial-dot blur-level-${i}`} />
            </button>
          ))}
          <div 
            className="dial-progress" 
            style={{ width: `${(currentIndex / (LEVELS.length - 1)) * 100}%` }}
          />
        </div>

        <div className="dial-endcap dial-endcap-right">
          <span className="endcap-icon">≈</span>
          <span className="endcap-label">Refined</span>
          <span className="endcap-sub">synthesized</span>
        </div>
      </div>

      {/* Dynamic microcopy */}
      <p className={`dial-microcopy microcopy-level-${currentIndex}`}>
        {LEVEL_CONFIG[level].microcopy}
      </p>
    </div>
  )
}

export default MeaningDial
