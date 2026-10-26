import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Box, ChevronDown, LogOut, Receipt, Users, Wallet } from 'lucide-react'
import { DonationIllustration, Logo } from './brand'
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

  if (!user) return <Navigate to={`/masuk?next=${encodeURIComponent(here)}`} replace />

  const locked = user.role === 'fundraiser' && fundraiser?.status !== 'Terverifikasi'
  const items = [
    { to: '/dashboard/fundraiser', label: 'Fundraiser', icon: <Users size={18} /> },
    { to: '/dashboard/program', label: 'Program', icon: <Box size={18} /> },
    { to: '/dashboard/transaksi', label: 'Transaksi', icon: <Receipt size={18} />, locked },
    { to: '/dashboard/penarikan', label: 'Penarikan', icon: <Wallet size={18} />, locked },
  ]

  return (
    <div className="dash">
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
          <div className="usermenu">
            <button className="usermenu-btn" onClick={() => setMenu((m) => !m)}>
              <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="usermenu-meta"><b>{user.name}</b><span>{user.role === 'admin' ? 'Admin' : 'Fundraiser'}</span></span>
              <ChevronDown size={16} />
            </button>
            {menu && (
              <div className="dropdown" onMouseLeave={() => setMenu(false)}>
                <button onClick={() => { logout(); nav('/masuk', { replace: true }) }}><LogOut size={16} /> Keluar</button>
              </div>
            )}
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  )
}
