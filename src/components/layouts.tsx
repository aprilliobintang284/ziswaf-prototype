import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { DonationIllustration, Logo } from './brand'
import { Icon } from './icons'
import { ConfirmModal } from './ui'
import { Presence } from './motion'
import { fundraiserActive, getDB, useDB } from '../lib/store'
import { useHasUnsaved } from '../lib/unsaved'
import { IDLE_MS_DEFAULT, logout, touchSession } from '../lib/actions'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-art"><DonationIllustration /></div>
      <div className="auth-main"><div className="auth-inner">{children}</div></div>
    </div>
  )
}

/** Untuk uji sesi: buka /masuk?idle=1 supaya batas diam jadi 1 menit (tersimpan selama tab terbuka). */
export function idleMs(): number {
  try {
    const q = new URLSearchParams(window.location.search).get('idle')
    if (q) sessionStorage.setItem('ziswaf-idle-min', q)
    const v = Number(sessionStorage.getItem('ziswaf-idle-min'))
    if (v > 0) return v * 60 * 1000
  } catch {
    // sessionStorage tidak tersedia
  }
  return IDLE_MS_DEFAULT
}

const ACTIVITY = ['mousemove', 'mousedown', 'keydown', 'wheel', 'scroll', 'touchstart'] as const
const SIDE_KEY = 'ziswaf-proto-sidebar-hidden'

export function DashboardLayout() {
  const db = useDB()
  const loc = useLocation()
  const nav = useNavigate()
  const user = db.session ? db.users.find((u) => u.id === db.session!.userId) : null
  const fundraiser = user?.fundraiserId ? db.fundraisers.find((f) => f.id === user.fundraiserId) : null
  const [menu, setMenu] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const unsaved = useHasUnsaved()
  // Ikon ☰ menyembunyikan/menampilkan sidebar (28 Okt 2026); kondisinya tetap sama setelah refresh (29 Okt 2026)
  const [sideHidden, setSideHidden] = useState(() => {
    try { return localStorage.getItem(SIDE_KEY) === '1' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem(SIDE_KEY, sideHidden ? '1' : '0') } catch { /* penyimpanan browser tidak tersedia */ }
  }, [sideHidden])
  const menuRef = useRef<HTMLDivElement>(null)
  // Keluar manual: login berikutnya kembali ke halaman default (Fundraiser), bukan halaman terakhir.
  // "Kembali ke halaman terakhir" (AC Login #5) hanya untuk sesi yang habis karena tidak aktif.
  const loggingOut = useRef(false)
  const timer = useRef<number>()
  const here = loc.pathname + loc.search
  // Lokasi versi router (tanpa base path GitHub Pages) untuk dipakai di dalam timer
  const hereRef = useRef(here)
  hereRef.current = here

  useEffect(() => {
    if (!user) return
    const limit = idleMs()
    const expire = () => {
      // Aktivitas di tab lain tercatat di sesi bersama → tab yang diam tidak boleh me-logout tab yang aktif (K-42)
      const s = getDB().session
      const idleFor = s ? Date.now() - new Date(s.lastActive).getTime() : limit
      if (idleFor < limit) { timer.current = window.setTimeout(expire, limit - idleFor); return }
      logout()
      nav(`/masuk?alasan=sesi-habis&next=${encodeURIComponent(hereRef.current)}`, { replace: true })
    }
    const reset = () => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(expire, limit)
      touchSession()
    }
    reset()
    ACTIVITY.forEach((e) => window.addEventListener(e, reset, { passive: true, capture: true }))
    return () => {
      window.clearTimeout(timer.current)
      ACTIVITY.forEach((e) => window.removeEventListener(e, reset, { capture: true }))
    }
  }, [user?.id, nav]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!menu) return
    // Dropdown tertutup dengan klik nama lagi atau klik di luar (29 Okt 2026); Esc = standar aksesibilitas
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [menu])

  if (!user) return <Navigate to={loggingOut.current ? '/masuk' : `/masuk?next=${encodeURIComponent(here)}`} replace />

  const locked = user.role === 'fundraiser' && !fundraiserActive(fundraiser)
  const items = [
    { to: '/dashboard/fundraiser', label: 'Fundraiser', icon: <Icon name="users" size={18} tint /> },
    { to: '/dashboard/program', label: 'Program', icon: <Icon name="box" size={18} tint /> },
    { to: '/dashboard/transaksi', label: 'Transaksi', icon: <Icon name="receipt" size={18} tint />, locked },
    { to: '/dashboard/penarikan', label: 'Penarikan', icon: <Icon name="wallet" size={18} tint />, locked },
  ]

  return (
    <div className={'dash' + (sideHidden ? ' side-hidden' : '')}>
      <aside className="side">
        <Logo small />
        <nav className="nav">
          {/* K-08 (asumsi QA 28 Okt 2026, menunggu desainer): menu terkunci tetap tampil, abu-abu, dan tidak bisa diklik */}
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => (isActive ? 'active' : '') + (it.locked ? ' locked' : '')}
              title={it.locked ? 'Bisa diakses setelah akun terverifikasi' : undefined}
              aria-disabled={it.locked || undefined} tabIndex={it.locked ? -1 : undefined}
              onClick={(e) => { if (it.locked) e.preventDefault() }}>
              {it.icon}{it.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="menu-toggle" aria-label={sideHidden ? 'Tampilkan menu' : 'Sembunyikan menu'} onClick={() => setSideHidden((s) => !s)}>
            <Icon name="menu" size={18} tint />
          </button>
          <div className="usermenu" ref={menuRef}>
            <button className="usermenu-btn" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <Icon name="user-circle" size={24} tint />
              <span className="usermenu-name">{user.name}</span>
              <Icon name="chevron-down" tint className="usermenu-chevron" />
            </button>
            <Presence show={menu}>{menu && (
              <div className="usercard" role="menu">
                <span className="usercard-role">{user.role === 'admin' ? 'Admin' : 'Fundraiser'}</span>
                <Icon name="user-circle" size={44} tint />
                <div className="usercard-name">{user.name}</div>
                <div className="usercard-email">{user.email}</div>
                <hr />
                <button className="btn btn-primary btn-xs usercard-logout" onClick={() => { setMenu(false); setConfirmLogout(true) }}>Keluar</button>
              </div>
            )}</Presence>
          </div>
        </header>
        <main className="content"><div className="page-in" key={loc.pathname}><Outlet /></div></main>
      </div>
      <Presence show={confirmLogout}>{confirmLogout && (
        // K-38 (29 Okt 2026): satu pop-up saja; kalau ada isian form yang belum disimpan, ikut diperingatkan
        <ConfirmModal icon="logout" title="Keluar"
          text={unsaved ? 'Data yang belum disimpan akan hilang. Apakah Anda yakin ingin keluar dari akun Anda?' : 'Apakah Anda yakin ingin keluar dari akun Anda?'}
          onNo={() => setConfirmLogout(false)}
          onYes={() => { loggingOut.current = true; setConfirmLogout(false); logout(); nav('/masuk', { replace: true }) }} />
      )}</Presence>
    </div>
  )
}
