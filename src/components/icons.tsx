// Ikon & ilustrasi diambil langsung dari Figma (klik kanan → Copy as → Copy as SVG).
// File aslinya ada di src/assets/icons/*.svg tanpa diubah; komponen ini hanya merendernya inline.
import { useMemo } from 'react'

const files = import.meta.glob('../assets/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const SVG: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, raw]) => [path.slice(path.lastIndexOf('/') + 1, -4), raw]),
)

export type IconName =
  | 'users' | 'box' | 'receipt' | 'wallet' | 'menu' | 'user-circle' | 'chevron-down'
  | 'stat-gross' | 'stat-net' | 'stat-fee' | 'plus' | 'download' | 'action-eye' | 'action-pencil' | 'action-pencil-disabled'
  | 'chevron-left' | 'chevrons-left' | 'eye' | 'eye-off' | 'alert-circle' | 'check-circle' | 'check-circle-off'
  | 'arrow-left' | 'back-arrow' | 'x-circle' | 'check-circle-outline' | 'file-description' | 'calendar' | 'upload' | 'photo-remove'
  | 'modal-success' | 'modal-mail' | 'modal-expired' | 'modal-warn' | 'modal-logout'
  | 'empty-blocked' | 'empty-none'

interface IconProps {
  name: IconName
  /** Lebar tampilan (px); tinggi mengikuti rasio file aslinya. Default: ukuran asli di Figma. */
  size?: number
  /** Warna garis/isi diganti currentColor supaya ikut warna teks (mis. menu aktif, tombol primer). */
  tint?: boolean
  /** Dicerminkan horizontal (mis. panah kanan dari panah kiri). */
  flip?: boolean
  className?: string
}

export function Icon({ name, size, tint = false, flip = false, className }: IconProps) {
  const html = useMemo(() => {
    let svg = SVG[name] ?? ''
    if (tint) svg = svg.replace(/(stroke|fill)="#[0-9A-Fa-f]{6}"/g, '$1="currentColor"')
    if (size) svg = svg.replace(/width="([\d.]+)" height="([\d.]+)"/, (_, w, h) => `width="${size}" height="${+(size * Number(h) / Number(w)).toFixed(2)}"`)
    return svg
  }, [name, size, tint])
  const cls = ['ficon', flip && 'flip', className].filter(Boolean).join(' ')
  return <span className={cls} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
}
