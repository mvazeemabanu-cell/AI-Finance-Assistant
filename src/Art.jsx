// Illustrations drawn in code: no image files, no copyright problems, work offline.

export function HeroArt({ className }) {
  return (
    <svg className={className} viewBox="0 0 480 360" role="img" aria-label="Growing savings with gold coins">
      <ellipse cx="240" cy="338" rx="200" ry="14" fill="rgba(0,0,0,.22)" />

      {/* glass panel */}
      <rect x="36" y="56" width="304" height="256" rx="22" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.38)" strokeWidth="2" />

      {/* rising bars: the last one is gold */}
      <rect x="64" y="242" width="32" height="50" rx="7" fill="#e4dafc" />
      <rect x="110" y="212" width="32" height="80" rx="7" fill="#cdbafa" />
      <rect x="156" y="182" width="32" height="110" rx="7" fill="#b697f6" />
      <rect x="202" y="152" width="32" height="140" rx="7" fill="#a07bf2" />
      <rect x="248" y="122" width="32" height="170" rx="7" fill="#8b5cf6" />
      <rect x="294" y="92" width="32" height="200" rx="7" fill="#f5b82e" />

      {/* trend line */}
      <polyline
        points="80,228 126,198 172,168 218,138 264,108 310,78"
        fill="none" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
      />
      {[[80, 228], [126, 198], [172, 168], [218, 138], [264, 108]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="5" fill="#fde68a" />
      ))}
      <circle cx="310" cy="78" r="9" fill="#f5b82e" stroke="#fff7dd" strokeWidth="3" />

      {/* security shield */}
      <path
        d="M62 76 l22 8 v18 c0 14 -10 24 -22 30 c-12 -6 -22 -16 -22 -30 v-18z"
        fill="rgba(255,255,255,.22)" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round"
      />
      <path d="M51 104 l8 8 14 -17" fill="none" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

      {/* big gold coin */}
      <circle cx="392" cy="140" r="58" fill="#f5b82e" stroke="#d99a0b" strokeWidth="6" />
      <circle cx="392" cy="140" r="42" fill="none" stroke="#fbd36b" strokeWidth="3" />
      <text x="392" y="161" textAnchor="middle" fontSize="58" fontWeight="800" fill="#8a5a00">$</text>
      <path d="M356 112 a46 46 0 0 1 30 -22" fill="none" stroke="#fff3c4" strokeWidth="5" strokeLinecap="round" opacity=".85" />

      {/* gold coin stack */}
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <ellipse cx="398" cy={326 - i * 14} rx="44" ry="13" fill="#d99a0b" />
          <ellipse cx="398" cy={321 - i * 14} rx="44" ry="13" fill="#f5b82e" stroke="#d99a0b" strokeWidth="2" />
        </g>
      ))}

      {/* small floating coins */}
      <circle cx="352" cy="236" r="16" fill="#f5b82e" stroke="#d99a0b" strokeWidth="3" />
      <text x="352" y="242" textAnchor="middle" fontSize="16" fontWeight="800" fill="#8a5a00">$</text>
      <circle cx="446" cy="226" r="12" fill="#f5b82e" stroke="#d99a0b" strokeWidth="3" />
      <text x="446" y="231" textAnchor="middle" fontSize="13" fontWeight="800" fill="#8a5a00">$</text>

      {/* sparkles */}
      <path d="M300 28 l4 12 12 4 -12 4 -4 12 -4 -12 -12 -4 12 -4z" fill="#fde68a" />
      <path d="M452 62 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" fill="#fff7dd" />
      <path d="M24 188 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" fill="#fff7dd" />
    </svg>
  );
}

export function BannerArt({ className }) {
  return (
    <svg className={className} viewBox="0 0 220 150" role="img" aria-label="Gold coins">
      {/* coin stack */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <ellipse cx="110" cy={136 - i * 13} rx="46" ry="13" fill="#d99a0b" />
          <ellipse cx="110" cy={131 - i * 13} rx="46" ry="13" fill="#f5b82e" stroke="#d99a0b" strokeWidth="2" />
        </g>
      ))}

      {/* floating coin */}
      <circle cx="110" cy="52" r="28" fill="#f5b82e" stroke="#d99a0b" strokeWidth="4" />
      <circle cx="110" cy="52" r="19" fill="none" stroke="#fbd36b" strokeWidth="2" />
      <text x="110" y="63" textAnchor="middle" fontSize="30" fontWeight="800" fill="#8a5a00">$</text>

      <circle cx="42" cy="78" r="14" fill="#f5b82e" stroke="#d99a0b" strokeWidth="3" />
      <text x="42" y="84" textAnchor="middle" fontSize="16" fontWeight="800" fill="#8a5a00">$</text>
      <circle cx="182" cy="86" r="12" fill="#f5b82e" stroke="#d99a0b" strokeWidth="3" />
      <text x="182" y="91" textAnchor="middle" fontSize="13" fontWeight="800" fill="#8a5a00">$</text>

      <path d="M24 28 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" fill="#fde68a" />
      <path d="M188 28 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" fill="#fff7dd" />
    </svg>
  );
}