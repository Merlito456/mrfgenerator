interface Props {
  size: number;
  /** compact: drop the "MRF" label so it stays readable at tiny sizes */
  compact?: boolean;
}

/** App logo — MRF sheet on a blue-to-teal tile with a green "generate" bolt. */
export function AppLogo({ size, compact }: Props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} aria-label="MRF Generator logo">
      <defs>
        <linearGradient id="lg-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b6ad8" />
          <stop offset="0.55" stopColor="#0877c4" />
          <stop offset="1" stopColor="#0e8a8a" />
        </linearGradient>
        <linearGradient id="lg-head" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0b6ad8" />
          <stop offset="1" stopColor="#0e8a8a" />
        </linearGradient>
        <linearGradient id="lg-bolt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ade80" />
          <stop offset="1" stopColor="#16a34a" />
        </linearGradient>
        <filter id="lg-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#052f5e" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect x="8" y="8" width="240" height="240" rx="44" fill="url(#lg-tile)" />
      <rect x="8" y="8" width="240" height="240" rx="44" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="2" />

      <g filter="url(#lg-shadow)">
        <rect x="52" y="42" width="120" height="158" rx="10" fill="#ffffff" />
        <rect x="52" y="42" width="120" height="30" rx="10" fill="url(#lg-head)" />
        <rect x="52" y="62" width="120" height="10" fill="url(#lg-head)" />
        {!compact && (
          <text
            x="112"
            y="62"
            textAnchor="middle"
            fontFamily="Segoe UI, Arial, sans-serif"
            fontSize="13.5"
            fontWeight="700"
            fill="#ffffff"
            letterSpacing="1"
          >
            MRF
          </text>
        )}
        <rect x="64" y="86" width="34" height="7" rx="2" fill="#9fb6cf" />
        <rect x="104" y="86" width="56" height="7" rx="2" fill="#d7e2ee" />
        <rect x="64" y="101" width="34" height="7" rx="2" fill="#9fb6cf" />
        <rect x="104" y="101" width="56" height="7" rx="2" fill="#d7e2ee" />
        <rect x="64" y="120" width="96" height="7" rx="2" fill="#0b6ad8" opacity="0.85" />
        <rect x="64" y="135" width="96" height="7" rx="2" fill="#c9d7e6" />
        <rect x="64" y="150" width="96" height="7" rx="2" fill="#c9d7e6" />
        <rect x="64" y="165" width="70" height="7" rx="2" fill="#c9d7e6" />
      </g>

      <circle cx="176" cy="176" r="34" fill="url(#lg-bolt)" stroke="#ffffff" strokeWidth="5" />
      <path
        d="M182 154 L164 182 h11 l-5 22 20 -30 h-12 l6 -20 z"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
