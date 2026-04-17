/**
 * Bus Transmilenio SVG — Icono decorativo Light Cyberpunk
 * - Color: #FF3333 (rojo Transmilenio)
 * - Glow: animate-glow-neon-red (CSS en index.css)
 * - Responsive: 44px ≥1024px, 32px <1024px, hidden <768px
 * - aria-hidden, no clickeable, no tooltip
 */
export function BusTransmilenio({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center animate-glow-neon-red hidden md:inline-flex ${className}`}
    >
      <svg
        viewBox="0 0 120 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 lg:h-11 w-auto"
      >
        {/* Cuerpo del bus */}
        <rect x="5" y="10" width="105" height="28" rx="6" fill="#FF3333" />
        {/* Franja lateral blanca */}
        <rect x="5" y="24" width="105" height="4" rx="1" fill="#FFFFFF" opacity="0.85" />
        {/* Ventanas */}
        <rect x="14" y="14" width="10" height="9" rx="1.5" fill="#1A1A2E" opacity="0.9" />
        <rect x="28" y="14" width="10" height="9" rx="1.5" fill="#1A1A2E" opacity="0.9" />
        <rect x="42" y="14" width="10" height="9" rx="1.5" fill="#1A1A2E" opacity="0.9" />
        <rect x="56" y="14" width="10" height="9" rx="1.5" fill="#1A1A2E" opacity="0.9" />
        <rect x="70" y="14" width="10" height="9" rx="1.5" fill="#1A1A2E" opacity="0.9" />
        <rect x="84" y="14" width="10" height="9" rx="1.5" fill="#1A1A2E" opacity="0.9" />
        {/* Parabrisas delantero */}
        <rect x="98" y="13" width="9" height="12" rx="2" fill="#87CEEB" opacity="0.8" />
        {/* Puerta */}
        <rect x="36" y="28" width="8" height="10" rx="1" fill="#CC2222" />
        <rect x="37" y="29" width="6" height="8" rx="0.5" fill="#1A1A2E" opacity="0.6" />
        {/* Ruedas */}
        <circle cx="25" cy="40" r="5.5" fill="#333333" />
        <circle cx="25" cy="40" r="3" fill="#666666" />
        <circle cx="90" cy="40" r="5.5" fill="#333333" />
        <circle cx="90" cy="40" r="3" fill="#666666" />
        {/* Faros delanteros */}
        <rect x="108" y="18" width="3" height="3" rx="1" fill="#FFD700" opacity="0.9" />
        <rect x="108" y="30" width="3" height="3" rx="1" fill="#FF6666" opacity="0.8" />
        {/* Espejo retrovisor */}
        <rect x="1" y="16" width="4" height="3" rx="1" fill="#FF3333" />
        {/* Texto TRANSMILENIO en la franja */}
        <text
          x="60"
          y="27.5"
          textAnchor="middle"
          fill="#FF3333"
          fontSize="3.5"
          fontWeight="700"
          fontFamily="'Space Grotesk', sans-serif"
          letterSpacing="0.08em"
        >
          TRANSMILENIO
        </text>
      </svg>
    </span>
  );
}
