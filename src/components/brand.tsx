// Aset visual yang digambar ulang dari desain Hifi (versi SVG, bukan ekspor asli dari Figma).
import type { ReactNode } from 'react'

export function LogoIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="3" y="9" width="26" height="20" rx="4" fill="#00897B" />
      <path d="M2 9.5C2 7.6 3.6 6 5.5 6h21C28.4 6 30 7.6 30 9.5V12H2V9.5Z" fill="#00897B" />
      <rect x="11" y="3" width="10" height="4" rx="2" fill="#00897B" />
      <rect x="2" y="11" width="28" height="2.4" fill="#5FC0B3" />
      <path d="M16 25.5c-3.6-2.6-6-4.6-6-7 0-1.7 1.3-3 3-3 1.2 0 2.3.7 3 1.7.7-1 1.8-1.7 3-1.7 1.7 0 3 1.3 3 3 0 2.4-2.4 4.4-6 7Z" fill="#fff" />
    </svg>
  )
}

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={'logo' + (small ? ' sm' : '')}>
      <LogoIcon />
      Ziswaf
    </span>
  )
}

export function MoneyBag({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3h6l-1.5 3.5h-3L9 3Z" />
      <path d="M10.5 6.5C6.5 8.5 4 12.3 4 15.5 4 19 7 21 12 21s8-2 8-5.5c0-3.2-2.5-7-6.5-9" />
      <path d="M12 11v6M10 12.5c0-.8.9-1.5 2-1.5s2 .7 2 1.5-.9 1.2-2 1.5-2 .7-2 1.5.9 1.5 2 1.5 2-.7 2-1.5" />
    </svg>
  )
}

function Bubble({ cx, cy, r, cream, children }: { cx: number; cy: number; r: number; cream?: boolean; children?: ReactNode }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={cream ? '#FBE5B6' : '#CFEDE9'} opacity={cream ? 1 : 0.62} stroke="#fff" strokeOpacity=".55" strokeWidth="3" />
      <g transform={`translate(${cx} ${cy})`}>{children}</g>
    </g>
  )
}

const T = '#0E7C6F'

/** Ilustrasi kotak donasi di panel kiri halaman autentikasi. */
export function DonationIllustration() {
  return (
    <svg viewBox="0 0 420 470" role="img" aria-label="Ilustrasi kotak donasi">
      {/* garis putus-putus melingkar */}
      <path d="M70 250 C 60 150, 170 70, 260 95" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="2" strokeDasharray="5 7" />
      <path d="M350 160 C 395 230, 380 300, 330 330" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="2" strokeDasharray="5 7" />
      {/* garis vertikal pendek */}
      {[[150, 40], [195, 80], [235, 150], [292, 255], [120, 130], [258, 15]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="3" height="18" rx="1.5" fill="#fff" opacity=".55" />
      ))}
      {/* titik & tanda plus */}
      <circle cx="58" cy="310" r="7" fill="#fff" opacity=".55" />
      <circle cx="120" cy="185" r="4" fill="#FBE5B6" />
      <circle cx="365" cy="105" r="7" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2" />
      <circle cx="300" cy="215" r="3.5" fill="#fff" opacity=".7" />
      <circle cx="375" cy="300" r="5" fill="#fff" opacity=".6" />
      {[[40, 240], [330, 240], [350, 370]].map(([x, y], i) => (
        <path key={i} d={`M${x - 8} ${y}h16M${x} ${y - 8}v16`} stroke="#FBE5B6" strokeWidth="2.5" strokeLinecap="round" />
      ))}

      {/* gelembung ikon */}
      <Bubble cx={150} cy={85} r={22} cream>
        <path d="M-6-9h12l-3 4h-6zM-8 1c0-5 4-7 8-7s8 2 8 7c0 6-3 9-8 9s-8-3-8-9Z" fill={T} />
      </Bubble>
      <Bubble cx={268} cy={150} r={50}>
        <path d="M-20-6c0-9 7-16 16-16 5 0 9 2 12 6 3-4 7-6 12-6 9 0 16 7 16 16 0 15-17 26-28 34C-3 20-20 9-20-6Z" fill={T} transform="scale(.75)" />
        <path d="M-14 4l10-6 8 5 8-6" stroke="#CFEDE9" strokeWidth="4" fill="none" strokeLinecap="round" />
      </Bubble>
      <Bubble cx={95} cy={220} r={38} cream>
        <path d="M0-4c-3-5-12-4-12 3 0 6 12 12 12 12s12-6 12-12c0-7-9-8-12-3Z" fill={T} transform="translate(0 -6)" />
        <path d="M-22 10h8l10 6h12c3 0 3 4 0 4H-2M-22 22h10l16 4 16-10" stroke={T} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Bubble>
      <Bubble cx={200} cy={265} r={36}>
        <path d="M-16-8 0-16l16 8v18L0 18l-16-8z" fill={T} />
        <path d="M-16-8 0 0l16-8M0 0v18" stroke="#CFEDE9" strokeWidth="2.5" fill="none" />
      </Bubble>
      <Bubble cx={292} cy={300} r={28}>
        {[-10, 0, 10].map((x, i) => (
          <g key={i} transform={`translate(${x} 0)`}>
            <circle cx="0" cy="-8" r="4" fill={T} />
            <rect x="-4" y="-3" width="8" height="15" rx="3" fill={T} />
          </g>
        ))}
      </Bubble>

      {/* kotak donasi */}
      <ellipse cx="225" cy="448" rx="150" ry="14" fill="#2F7F76" opacity=".35" />
      <path d="M95 352 L355 352 L340 438 Q338 446 330 446 L120 446 Q112 446 110 438 Z" fill="#0E8073" />
      <path d="M225 352 L355 352 L340 438 Q338 446 330 446 L225 446 Z" fill="#0B6E63" opacity=".55" />
      <path d="M86 336 Q86 326 96 326 L354 326 Q364 326 364 336 L364 352 Q364 362 354 362 L96 362 Q86 362 86 352 Z" fill="#A9DBD4" />
      <path d="M118 330 L332 330 L322 348 L128 348 Z" fill="#0B5E55" />
      <Bubble cx={226} cy={318} r={20} cream>
        <path d="M0-10c-5 6-8 10-8 13a8 8 0 0 0 16 0c0-3-3-7-8-13Z" fill={T} />
        <path d="M-4 3h8M0-1v8" stroke="#FBE5B6" strokeWidth="2.2" strokeLinecap="round" />
      </Bubble>
      <path d="M225 425c-14-10-24-18-24-28 0-7 5-12 12-12 5 0 9 3 12 7 3-4 7-7 12-7 7 0 12 5 12 12 0 10-10 18-24 28Z" fill="#A9DBD4" />
    </svg>
  )
}

export function EmptyDocIcon({ variant }: { variant: 'blocked' | 'empty' }) {
  return (
    // Mengikuti desain Hifi 665-40876 (X di tengah) dan 665-41008 (dua garis)
    <svg width="140" height="110" viewBox="0 0 140 110" aria-hidden="true">
      <ellipse cx="70" cy="104" rx="34" ry="2.5" fill="#e2e2e2" />
      <path d="M30 62c-8-14 6-28 22-26 8-12 30-14 40-2 14-6 30 4 26 20 10 10 2 30-16 32-12 10-36 10-48 2-16 2-30-10-24-26Z" fill="#d6ebe8" />
      <path d="M52 16h28l16 16v56a4 4 0 0 1-4 4H52a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4Z" fill="#f5f5f5" stroke="#8c8c8c" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M80 16v12a4 4 0 0 0 4 4h12" fill="#d9d9d9" stroke="#8c8c8c" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M100 18c3 2 4 5 4 8M105 12c5 3 7 8 7 13" stroke="#8c8c8c" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {variant === 'blocked'
        ? <path d="M63 49l18 18M81 49L63 67" stroke="#8c8c8c" strokeWidth="3" strokeLinecap="round" />
        : <path d="M61 53h22M61 62h14" stroke="#8c8c8c" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  )
}
