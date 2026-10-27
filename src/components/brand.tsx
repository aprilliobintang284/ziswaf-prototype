// Logo & ilustrasi memakai gambar asli dari Figma; ikon lain ada di ./icons (SVG hasil Copy as SVG).
import logoUrl from '../assets/logo-ziswaf.png'
import illustrationUrl from '../assets/ilustrasi-kotak-donasi.png'

export function LogoIcon() {
  return <img className="logo-icon" src={logoUrl} alt="" aria-hidden="true" />
}

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={'logo' + (small ? ' sm' : '')}>
      <LogoIcon />
      Ziswaf
    </span>
  )
}

/** Ilustrasi kotak donasi di panel kiri halaman autentikasi (PNG asli dari Figma). */
export function DonationIllustration() {
  return <img className="auth-illustration" src={illustrationUrl} alt="Ilustrasi kotak donasi" />
}
