import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Box, ChevronDown, CircleUserRound, Menu, Receipt, Users, Wallet } from 'lucide-react'
import { DonationIllustration, Logo } from './brand'
import { ConfirmModal } from './ui'
import { useDB } from '../lib/store'
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
    const reset = () => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        logout()
        nav(`/masuk?alasan=sesi-habis&next=${encodeURIComponent(hereRef.current)}`, { replace: true })
      }, limit)
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
    { to: '/dashboard/fundraiser', label: 'Fundraiser', icon: <Users size={18} /> },
    { to: '/dashboard/program', label: 'Program', icon: <Box size={18} /> },
    { to: '/dashboard/transaksi', label: 'Transaksi', icon: <Receipt size={18} />, locked },
    { to: '/dashboard/penarikan', label: 'Penarikan', icon: <Wallet size={18} />, locked },
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
            <Menu size={22} strokeWidth={1.6} />
          </button>
          <div className="usermenu" ref={menuRef}>
            <button className="usermenu-btn" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <CircleUserRound size={22} strokeWidth={1.4} />
              <span className="usermenu-name">{user.name}</span>
              <ChevronDown size={16} />
            </button>
            {menu && (
              <div className="usercard" role="menu">
                <span className="usercard-role">{user.role === 'admin' ? 'Admin' : 'Fundraiser'}</span>
                <CircleUserRound size={44} strokeWidth={1.1} />
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
