import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Menahan elemen tetap terpasang sebentar setelah ditutup supaya animasi keluarnya sempat jalan. */
export function usePresence(show: boolean, exitMs = 160) {
  const [mounted, setMounted] = useState(show)
  useEffect(() => {
    if (show) { setMounted(true); return }
    const t = window.setTimeout(() => setMounted(false), reducedMotion() ? 0 : exitMs)
    return () => window.clearTimeout(t)
  }, [show, exitMs])
  return { mounted: show || mounted, state: show ? 'open' : 'closed' }
}

/**
 * Pembungkus elemen yang muncul/hilang (dropdown, pop-up, panel detail). Saat ditutup, isi terakhir
 * tetap tampil selama animasi keluar (`.presence[data-state="closed"]` di styles.css), lalu dilepas.
 * Pakai pola `<Presence show={x}>{x && <Isi />}</Presence>` supaya isi tidak dievaluasi saat x kosong.
 */
export function Presence({ show, exitMs, children }: { show: boolean; exitMs?: number; children: ReactNode }) {
  const last = useRef(children)
  if (show) last.current = children
  const { mounted, state } = usePresence(show, exitMs)
  if (!mounted) return null
  return <div className="presence" data-state={state}>{show ? children : last.current}</div>
}
