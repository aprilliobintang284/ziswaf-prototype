import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { DonationIllustration, Logo } from './brand'
import { Icon } from './icons'
import { ConfirmModal } from './ui'
import { getDB, useDB } from '../lib/store'
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

export function DashboardLayout() {
  const db = useDB()
  const loc = useLocation()
  const nav = useNavigate()
  const user = db.session ? db.users.find((u) => u.id === db.session!.userId) : null
  const fundraiser = user?.fundraiserId ? db.fundraisers.find((f) => f.id === user.fundraiserId) : null
  const [menu, setMenu] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  // Fungsi ikon ☰ belum dijelaskan di desain → asumsi: menyembunyikan/menampilkan sidebar
  const [sideHidden, setSideHidden] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number>()
  const here = loc.pathname + loc.search
  // Lokasi versi router (tanpa base path GitHub Pages) untuk dipakai di dalam timer
  const hereRef = useRef(here)
  hereRef.current = here

  useEffect(() => {
    if (!user) return
    const limit = idleMs()
    const expire = () => {
      // Aktivitas di tab lain tercatat di sesi bersama → tab yang diam tidak boleh me-logout tab yang aktif (K-43)
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
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  if (!user) return <Navigate to={`/masuk?next=${encodeURIComponent(here)}`} replace />

  const locked = user.role === 'fundraiser' && fundraiser?.status !== 'Terverifikasi'
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
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => (isActive ? 'active' : '') + (it.locked ? ' locked' : '')}
              title={it.locked ? 'Bisa diakses setelah akun terverifikasi' : undefined}>
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
              <Icon name="chevron-down" tint />
            </button>
            {menu && (
              <div className="usercard" role="menu">
                <span className="usercard-role">{user.role === 'admin' ? 'Admin' : 'Fundraiser'}</span>
                <Icon name="user-circle" size={44} tint />
                <div className="usercard-name">{user.name}</div>
                <div className="usercard-email">{user.email}</div>
                <hr />
                <button className="btn btn-primary btn-xs usercard-logout" onClick={() => { setMenu(false); setConfirmLogout(true) }}>Keluar</button>
              </div>
            )}
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
      {confirmLogout && (
        <ConfirmModal icon="logout" title="Keluar" text="Apakah Anda yakin ingin keluar dari akun Anda?"
          onNo={() => setConfirmLogout(false)}
          onYes={() => { setConfirmLogout(false); logout(); nav('/masuk', { replace: true }) }} />
      )}
    </div>
  )
}
